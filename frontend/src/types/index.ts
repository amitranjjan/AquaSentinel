export type FishSpecies =
  | 'Tilapia'
  | 'Rohu'
  | 'Catla'
  | 'Mrigal'
  | 'Common Carp'
  | 'Other';

export type CultureType = 'Pond' | 'Biofloc' | 'RAS' | 'Cage' | 'Other';

export type SensorStatusCode = 'NORMAL' | 'LOW' | 'HIGH' | 'SENSOR_ERROR' | 'DISCONNECTED';
export type OverallStatusCode = 'NORMAL' | 'ATTENTION' | 'WARNING' | 'CRITICAL' | 'SENSOR_ERROR' | 'ALERT' | 'DISCONNECTED';
export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface WaterQuality {
  temperature: number | null; // Water Temperature (DS18B20)
  ph: number | null;          // Water pH (Analog Probe)
  turbidity: number | null;   // Water Turbidity (Optical Probe)
  airTemperature?: number | null; // Ambient Air Temp (DHT11)
  humidity?: number | null;       // Ambient Air Humidity (DHT11)
  pump1?: boolean;            // Relay 1 (Pump 1: Aerator / Circulation)
  pump2?: boolean;            // Relay 2 (Pump 2: Freshwater / Drain)
}

export interface SensorStatus {
  temperature: SensorStatusCode;
  ph: SensorStatusCode;
  turbidity: SensorStatusCode;
  airTemperature?: SensorStatusCode;
  humidity?: SensorStatusCode;
  overall: OverallStatusCode;
  buzzer: boolean;
  pump1?: boolean;
  pump2?: boolean;
}

export interface FarmProfile {
  farmName: string;
  pondName: string;
  fishSpecies: FishSpecies;
  cultureType: CultureType;
  pondSize: string;
  fishAge: string;
  approxStock: string;
}

export interface AiRecommendation {
  id: string;
  timestamp: string;
  timeFormatted: string;
  condition: string;
  status: OverallStatusCode;
  summary: string;
  whatToDoNow: string[];
  monitor: string[];
  urgency: UrgencyLevel;
  reason: string;
  triggerReason?: string;
  readings?: {
    temperature: number | null;
    ph: number | null;
    turbidity: number | null;
    airTemperature?: number | null;
    humidity?: number | null;
  };
  farmContext?: {
    fishSpecies: string;
    cultureType: string;
    pondName: string;
  };
  _source?: string;
  _notice?: string;
}

export interface TelemetryPoint {
  timestamp: number;
  timeFormatted: string;
  temperature: number | null;
  ph: number | null;
  turbidity: number | null;
  airTemperature?: number | null;
  humidity?: number | null;
  overallStatus: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  _source?: string;
}

export interface SpeciesOptimalRange {
  name: string;
  scientificName: string;
  tempOptimal: string;
  tempMin: number;
  tempMax: number;
  phOptimal: string;
  phMin: number;
  phMax: number;
  turbidityOptimal: string;
  notes: string;
}
