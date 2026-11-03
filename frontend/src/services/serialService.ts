import type { WaterQuality, SensorStatus, SensorStatusCode, OverallStatusCode } from '../types';

export interface SerialTelemetryData {
  waterQuality: WaterQuality;
  status: SensorStatus;
  rawJson: string;
}

let activePort: any = null;
let reader: any = null;
let writer: any = null;
let buffer = '';
let keepReading = false;

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

export function isSerialConnected(): boolean {
  return activePort !== null;
}

function computeFallbackStatus(wq: WaterQuality, parsed: any): SensorStatus {
  let tStatus: SensorStatusCode = parsed.temperatureStatus;
  if (!tStatus) {
    if (wq.temperature === null || isNaN(wq.temperature)) tStatus = 'DISCONNECTED';
    else if (wq.temperature < 22) tStatus = 'LOW';
    else if (wq.temperature > 32.5) tStatus = 'HIGH';
    else tStatus = 'NORMAL';
  }

  let pStatus: SensorStatusCode = parsed.phStatus;
  if (!pStatus) {
    if (wq.ph === null || isNaN(wq.ph)) pStatus = 'DISCONNECTED';
    else if (wq.ph < 6.5) pStatus = 'LOW';
    else if (wq.ph > 8.5) pStatus = 'HIGH';
    else pStatus = 'NORMAL';
  }

  let tbStatus: SensorStatusCode = parsed.turbidityStatus;
  if (!tbStatus) {
    if (wq.turbidity === null || isNaN(wq.turbidity)) tbStatus = 'DISCONNECTED';
    else if (wq.turbidity > 50) tbStatus = 'HIGH';
    else tbStatus = 'NORMAL';
  }

  let airTempStatus: SensorStatusCode = parsed.airTemperatureStatus || (
    wq.airTemperature === null || wq.airTemperature === undefined || isNaN(wq.airTemperature) ? 'DISCONNECTED' :
    wq.airTemperature > 38 ? 'HIGH' :
    wq.airTemperature < 18 ? 'LOW' : 'NORMAL'
  );

  let humStatus: SensorStatusCode = parsed.humidityStatus || (
    wq.humidity === null || wq.humidity === undefined || isNaN(wq.humidity) ? 'DISCONNECTED' :
    wq.humidity > 85 ? 'HIGH' :
    wq.humidity < 40 ? 'LOW' : 'NORMAL'
  );

  let overall: OverallStatusCode = parsed.overallStatus;
  if (!overall) {
    if (
      (pStatus === 'HIGH' && (wq.ph ?? 0) > 9.0) ||
      (pStatus === 'LOW' && (wq.ph ?? 14) < 6.0) ||
      (tbStatus === 'HIGH' && (wq.turbidity ?? 0) > 80) ||
      (tStatus === 'HIGH' && (wq.temperature ?? 0) > 34)
    ) {
      overall = 'CRITICAL';
    } else if (pStatus !== 'NORMAL' || tbStatus !== 'NORMAL' || tStatus !== 'NORMAL') {
      overall = 'WARNING';
    } else {
      overall = 'NORMAL';
    }
  }

  return {
    temperature: tStatus,
    ph: pStatus,
    turbidity: tbStatus,
    airTemperature: airTempStatus,
    humidity: humStatus,
    overall,
    buzzer: Boolean(Number(parsed.buzzer)) || overall === 'CRITICAL',
    pump1: wq.pump1,
    pump2: wq.pump2
  };
}

function handleTelemetry(parsed: any, rawLine: string): SerialTelemetryData {
  const waterTemp = parsed.waterTemp !== undefined ? parsed.waterTemp : parsed.temperature;
  const ph = parsed.ph !== undefined ? parsed.ph : null;
  const turbidity = parsed.turbidity !== undefined ? parsed.turbidity : parsed.turb;
  const airTemp = parsed.airTemp !== undefined ? parsed.airTemp : parsed.airTemperature;
  const humidity = parsed.humidity !== undefined ? parsed.humidity : parsed.hum;
  const p1 = parsed.pump1 !== undefined ? Boolean(Number(parsed.pump1)) : Boolean(Number(parsed.p1));
  const p2 = parsed.pump2 !== undefined ? Boolean(Number(parsed.pump2)) : Boolean(Number(parsed.p2));

  const wq: WaterQuality = {
    temperature: waterTemp !== undefined && waterTemp !== null ? Number(waterTemp) : null,
    ph: ph !== undefined && ph !== null ? Number(ph) : null,
    turbidity: turbidity !== undefined && turbidity !== null ? Number(turbidity) : null,
    airTemperature: airTemp !== undefined && airTemp !== null ? Number(airTemp) : null,
    humidity: humidity !== undefined && humidity !== null ? Number(humidity) : null,
    pump1: p1,
    pump2: p2
  };

  const status = computeFallbackStatus(wq, parsed);

  return {
    waterQuality: wq,
    status,
    rawJson: rawLine
  };
}

export async function requestAndConnectSerial(
  onData: (data: SerialTelemetryData) => void,
  onDisconnect: () => void,
  onError: (err: Error) => void
): Promise<string> {
  if (!isWebSerialSupported()) {
    throw new Error('Web Serial is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Opera on Windows, Mac, or Linux.');
  }

  try {
    const navAny = navigator as any;
    
    // Prompts user to select Serial/COM port (e.g. HC-05 Bluetooth COM port or Arduino USB)
    const port = await navAny.serial.requestPort();
    await port.open({ baudRate: 9600 });

    activePort = port;
    buffer = '';
    keepReading = true;

    // Listen for port disconnect
    port.addEventListener('disconnect', () => {
      console.warn('[Serial] Port disconnected');
      disconnectSerial();
      onDisconnect();
    });

    const textDecoder = new TextDecoder();

    // Start background reading loop
    (async () => {
      while (port.readable && keepReading) {
        reader = port.readable.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              buffer += textDecoder.decode(value);
              let i: number;
              while ((i = buffer.indexOf('\n')) >= 0) {
                const line = buffer.slice(0, i).trim();
                buffer = buffer.slice(i + 1);
                if (line) {
                  try {
                    const parsed = JSON.parse(line);
                    const telemetry = handleTelemetry(parsed, line);
                    onData(telemetry);
                  } catch (parseErr) {
                    // Line may have partial framing or non-json debug text
                    console.debug('[Serial] Non-JSON line or partial:', line);
                  }
                }
              }
            }
          }
        } catch (readErr: any) {
          console.warn('[Serial Read Error]', readErr);
        } finally {
          reader.releaseLock();
          reader = null;
        }
      }
    })();

    return 'HC-05 / Serial COM';
  } catch (err: any) {
    console.error('[Serial Connection Error]', err);
    onError(err);
    throw err;
  }
}

/**
 * Sends a command to Arduino over Serial / HC-05 (e.g. "P1_ON\r\n")
 */
export async function sendSerialCommand(cmd: string): Promise<boolean> {
  if (!activePort || !activePort.writable) {
    console.warn('[Serial] Cannot send: port not writable or not connected');
    return false;
  }
  try {
    const encoder = new TextEncoder();
    // Normalize command with \r\n for robust parsing across serial links
    const cleanCmd = cmd.trim();
    const payload = encoder.encode(cleanCmd + '\r\n');

    let w = writer;
    let localWriter = false;
    if (!w) {
      if (activePort.writable.locked) {
        console.warn('[Serial] Port writable is temporarily locked, retrying in 50ms...');
        await new Promise(r => setTimeout(r, 50));
      }
      w = activePort.writable.getWriter();
      localWriter = true;
    }

    await w.write(payload);

    if (localWriter) {
      w.releaseLock();
    }
    console.log('[Serial Sent Command Successful]:', cleanCmd);
    return true;
  } catch (err) {
    console.error('[Serial Send Error]', err);
    if (writer) {
      try { writer.releaseLock(); } catch {}
      writer = null;
    }
    return false;
  }
}

export async function disconnectSerial(): Promise<void> {
  keepReading = false;
  if (reader) {
    try { await reader.cancel(); } catch {}
    try { reader.releaseLock(); } catch {}
    reader = null;
  }
  if (writer) {
    try { writer.releaseLock(); } catch {}
    writer = null;
  }
  if (activePort) {
    try { await activePort.close(); } catch {}
    activePort = null;
  }
  buffer = '';
}

