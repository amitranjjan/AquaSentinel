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
let textDecoder = new TextDecoder();
let chunkBuffer = '';

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
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
    const device = await navAny.bluetooth.requestDevice({
      filters: [
        { namePrefix: 'AquaSentinel' },
        { name: 'AquaSentinel-ESP32' }
      ],
      optionalServices: [BLE_SERVICE_UUID]
    });

    activeDevice = device;

    device.addEventListener('gattserverdisconnected', () => {
      console.warn('[BLE] Device disconnected');
      activeDevice = null;
      activeCharacteristic = null;
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

    characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
      const value = event.target.value;
      const decodedChunk = textDecoder.decode(value);
      
      chunkBuffer += decodedChunk;

      // Handle newline or closing curly bracket framed JSON
      const startIdx = chunkBuffer.indexOf('{');
      const endIdx = chunkBuffer.lastIndexOf('}');

      if (startIdx !== -1 && endIdx > startIdx) {
        const potentialJson = chunkBuffer.substring(startIdx, endIdx + 1);
        try {
          const parsed = JSON.parse(potentialJson);
          chunkBuffer = chunkBuffer.substring(endIdx + 1);

          const telemetry: BLETelemetryData = {
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
            rawJson: potentialJson
          };

          onData(telemetry);
        } catch (parseErr) {
          // Incomplete chunk yet, keep in buffer
        }
      }
    });

    return device.name || 'AquaSentinel-ESP32';
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
  chunkBuffer = '';
}
