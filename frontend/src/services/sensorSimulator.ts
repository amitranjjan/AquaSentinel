import type { WaterQuality, SensorStatus, FishSpecies, SensorStatusCode, OverallStatusCode } from '../types';

export interface SimulatorPreset {
  id: string;
  name: string;
  description: string;
  temperature: number | null;
  ph: number | null;
  turbidity: number | null;
  sensorFault?: 'temp' | 'ph' | 'turb' | 'none';
}

export const SIMULATOR_PRESETS: SimulatorPreset[] = [
  {
    id: 'optimal',
    name: 'Normal Optimal Pond',
    description: 'Pond parameters in prime range for warmwater fish culture.',
    temperature: 28.5,
    ph: 7.25,
    turbidity: 32.0,
    sensorFault: 'none'
  },
  {
    id: 'low_ph',
    name: 'Low pH Alert (Acid Rain/Runoff)',
    description: 'Pond acidification event below 6.5. Triggers pH alert.',
    temperature: 27.8,
    ph: 6.10,
    turbidity: 38.5,
    sensorFault: 'none'
  },
  {
    id: 'high_turbidity',
    name: 'High Turbidity (Heavy Mud / Runoff)',
    description: 'Suspended silt spikes to 95 NTU. Triggers turbidity warning.',
    temperature: 26.5,
    ph: 7.15,
    turbidity: 96.0,
    sensorFault: 'none'
  },
  {
    id: 'high_temp',
    name: 'Summer Heatwave (High Temp)',
    description: 'Water temperature reaches 34.2°C causing oxygen stress.',
    temperature: 34.2,
    ph: 7.80,
    turbidity: 52.0,
    sensorFault: 'none'
  },
  {
    id: 'high_ph',
    name: 'Algal Bloom (High pH Spike)',
    description: 'Intense photosynthesis drives midday pH above 9.0.',
    temperature: 30.5,
    ph: 9.15,
    turbidity: 58.0,
    sensorFault: 'none'
  },
  {
    id: 'sensor_error',
    name: 'Sensor Probe Hardware Fault',
    description: 'Temperature probe disconnected. Tests SENSOR_ERROR response.',
    temperature: null,
    ph: 7.30,
    turbidity: 35.0,
    sensorFault: 'temp'
  }
];

export function computeStatuses(
  wq: WaterQuality,
  _species: FishSpecies = 'Tilapia'
): SensorStatus {
  let tStatus: SensorStatusCode = 'NORMAL';
  let pStatus: SensorStatusCode = 'NORMAL';
  let tbStatus: SensorStatusCode = 'NORMAL';

  if (wq.temperature === null || isNaN(wq.temperature)) {
    tStatus = 'SENSOR_ERROR';
  } else if (wq.temperature < 22.0) {
    tStatus = 'LOW';
  } else if (wq.temperature > 32.5) {
    tStatus = 'HIGH';
  }

  if (wq.ph === null || isNaN(wq.ph)) {
    pStatus = 'SENSOR_ERROR';
  } else if (wq.ph < 6.5) {
    pStatus = 'LOW';
  } else if (wq.ph > 8.5) {
    pStatus = 'HIGH';
  }

  if (wq.turbidity === null || isNaN(wq.turbidity)) {
    tbStatus = 'SENSOR_ERROR';
  } else if (wq.turbidity > 75.0) {
    tbStatus = 'HIGH';
  }

  let overall: OverallStatusCode = 'NORMAL';
  let buzzer = false;

  const hasFault = tStatus === 'SENSOR_ERROR' || pStatus === 'SENSOR_ERROR' || tbStatus === 'SENSOR_ERROR';
  const hasAbnormal = tStatus !== 'NORMAL' || pStatus !== 'NORMAL' || tbStatus !== 'NORMAL';

  if (hasFault) {
    overall = 'SENSOR_ERROR';
    buzzer = true;
  } else if ((tStatus === 'HIGH' && pStatus === 'HIGH') || (pStatus === 'LOW' && wq.ph! < 5.8) || (wq.temperature! > 34.0)) {
    overall = 'CRITICAL';
    buzzer = true;
  } else if (hasAbnormal) {
    overall = 'WARNING';
    buzzer = true;
  } else {
    overall = 'NORMAL';
    buzzer = false;
  }

  return {
    temperature: tStatus,
    ph: pStatus,
    turbidity: tbStatus,
    overall,
    buzzer
  };
}

export function applyRealisticDrift(current: WaterQuality): WaterQuality {
  if (current.temperature === null && current.ph === null) return current;

  const tempDrift = (Math.random() - 0.48) * 0.08;
  const phDrift = (Math.random() - 0.48) * 0.02;
  const turbDrift = (Math.random() - 0.48) * 0.4;

  const newTemp = current.temperature !== null 
    ? Math.round(Math.max(15, Math.min(40, current.temperature + tempDrift)) * 100) / 100 
    : null;

  const newPh = current.ph !== null 
    ? Math.round(Math.max(4, Math.min(11, current.ph + phDrift)) * 100) / 100 
    : null;

  const newTurb = current.turbidity !== null 
    ? Math.round(Math.max(2, Math.min(250, current.turbidity + turbDrift)) * 10) / 10 
    : null;

  return {
    temperature: newTemp,
    ph: newPh,
    turbidity: newTurb
  };
}
