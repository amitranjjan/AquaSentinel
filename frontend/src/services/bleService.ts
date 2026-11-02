import type { WaterQuality, SensorStatus } from '../types';

export const BLE_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
export const BLE_CHARACTERISTIC_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';

export interface BLETelemetryData {
  waterQuality: WaterQuality;
  status: SensorStatus;
  rawJson: string;
}

let activeDevice: any = null;
let activeCharacteristic: any = null;
const textDecoder = new TextDecoder();
let buffer = '';

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

function handleTelemetry(parsed: any, rawLine: string): BLETelemetryData {
  // Support both long and short key aliases for Arduino Uno / ESP8266 / ESP32
  const waterTemp = parsed.waterTemp !== undefined ? parsed.waterTemp : parsed.temperature;
  const ph = parsed.ph !== undefined ? parsed.ph : null;
  const turbidity = parsed.turbidity !== undefined ? parsed.turbidity : parsed.turb;
  const airTemp = parsed.airTemp !== undefined ? parsed.airTemp : parsed.airTemperature;
  const humidity = parsed.humidity !== undefined ? parsed.humidity : parsed.hum;
  const p1 = parsed.pump1 !== undefined ? Boolean(Number(parsed.pump1)) : Boolean(Number(parsed.p1));
  const p2 = parsed.pump2 !== undefined ? Boolean(Number(parsed.pump2)) : Boolean(Number(parsed.p2));

  return {
    waterQuality: {
      temperature: waterTemp !== undefined && waterTemp !== null ? Number(waterTemp) : null,
      ph: ph !== undefined && ph !== null ? Number(ph) : null,
      turbidity: turbidity !== undefined && turbidity !== null ? Number(turbidity) : null,
      airTemperature: airTemp !== undefined && airTemp !== null ? Number(airTemp) : null,
      humidity: humidity !== undefined && humidity !== null ? Number(humidity) : null,
      pump1: p1,
      pump2: p2
    },
    status: {
      temperature: parsed.temperatureStatus || 'NORMAL',
      ph: parsed.phStatus || 'NORMAL',
      turbidity: parsed.turbidityStatus || 'NORMAL',
      airTemperature: parsed.airTemperatureStatus || 'NORMAL',
      humidity: parsed.humidityStatus || 'NORMAL',
      overall: parsed.overallStatus || parsed.status || 'NORMAL',
      buzzer: Boolean(Number(parsed.buzzer)),
      pump1: p1,
      pump2: p2
    },
    rawJson: rawLine
  };
}

export async function requestAndConnectBLE(
  onData: (data: BLETelemetryData) => void,
  onDisconnect: () => void,
  onError: (err: Error) => void
): Promise<string> {
  if (!isWebBluetoothSupported()) {
    throw new Error('Web Bluetooth is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Bluefy on iOS.');
  }

  try {
    const navAny = navigator as any;
    
    // 1. Match the HM-10 / BLE module by standard Service UUID
    const device = await navAny.bluetooth.requestDevice({
      filters: [{ services: [BLE_SERVICE_UUID] }]
    });

    activeDevice = device;
    buffer = ''; // Reset buffer on new connection

    device.addEventListener('gattserverdisconnected', () => {
      console.warn('[BLE] Device disconnected');
      activeDevice = null;
      activeCharacteristic = null;
      buffer = '';
      onDisconnect();
    });

    console.log('[BLE] Connecting to GATT Server...');
    const server = await device.gatt.connect();

    console.log('[BLE] Getting Service...');
    const service = await server.getPrimaryService(BLE_SERVICE_UUID);

    console.log('[BLE] Getting Characteristic...');
    const characteristic = await service.getCharacteristic(BLE_CHARACTERISTIC_UUID);
    activeCharacteristic = characteristic;

    // Start Notifications
    await characteristic.startNotifications();
    console.log('[BLE] Notifications started.');

    // 2. Join 20-byte pieces into full lines delimited by '\n'
    characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
      buffer += textDecoder.decode(event.target.value);
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
            console.warn('[BLE] Error parsing JSON telemetry line:', line, parseErr);
          }
        }
      }
    });

    return device.name || 'AquaSentinel-Arduino';
  } catch (err: any) {
    console.error('[BLE Error]', err);
    onError(err);
    throw err;
  }
}

/**
 * Sends a command string (e.g. "P1_ON", "P1_OFF", "P2_ON", "P2_OFF")
 * to the Arduino Uno / Microcontroller over BLE.
 */
export async function sendBLECommand(cmd: string): Promise<boolean> {
  if (!activeCharacteristic) {
    console.warn('[BLE] Cannot send command: no active characteristic');
    return false;
  }
  try {
    const encoder = new TextEncoder();
    const payload = encoder.encode(cmd.endsWith('\n') ? cmd : cmd + '\n');
    if (activeCharacteristic.writeValueWithResponse) {
      await activeCharacteristic.writeValueWithResponse(payload);
    } else {
      await activeCharacteristic.writeValue(payload);
    }
    console.log('[BLE Sent Command]:', cmd);
    return true;
  } catch (err) {
    console.error('[BLE Send Command Error]', err);
    return false;
  }
}

export function disconnectBLE(): void {
  if (activeDevice && activeDevice.gatt.connected) {
    activeDevice.gatt.disconnect();
  }
  activeDevice = null;
  activeCharacteristic = null;
  buffer = '';
}
