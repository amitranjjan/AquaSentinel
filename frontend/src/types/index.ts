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
  temperature: number | null;
  ph: number | null;
  turbidity: number | null;
}

export interface SensorStatus {
  temperature: SensorStatusCode;
  ph: SensorStatusCode;
  turbidity: SensorStatusCode;
  overall: OverallStatusCode;
  buzzer: boolean;
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
