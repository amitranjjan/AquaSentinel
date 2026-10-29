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
  return {
    waterQuality: {
      temperature: parsed.temperature !== undefined ? parsed.temperature : null,
      ph: parsed.ph !== undefined ? parsed.ph : null,
      turbidity: parsed.turbidity !== undefined ? parsed.turbidity : null
    },
    status: {
      temperature: parsed.temperatureStatus || 'NORMAL',
      ph: parsed.phStatus || 'NORMAL',
      turbidity: parsed.turbidityStatus || 'NORMAL',
      overall: parsed.overallStatus || 'NORMAL',
      buzzer: Boolean(parsed.buzzer)
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
    
    // 1. Match the HM-10 by service instead of name
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

    // 2. Join the 20-byte pieces into full lines
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

    return device.name || 'AquaSentinel-Node';
  } catch (err: any) {
    console.error('[BLE Error]', err);
    onError(err);
    throw err;
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
