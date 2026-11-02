/**
 * Fish Culture Prompt & System Instructions for AquaSentinel
 * Compliant with Gemini safety rules, aquaculture best practices, and structured outputs.
 */

export const FISH_CULTURE_SYSTEM_INSTRUCTION = `You are AquaSentinel's expert aquaculture water-quality assistant.
Your mission is to analyze fish pond water-quality sensor telemetry (Water Temp, pH, Turbidity, DHT11 Air Temp & Humidity, and Dual Relay Pump status) and farm context, then provide practical, conservative, farmer-friendly, and actionable guidance to fish farmers.

### Critical Safety and Operational Guardrails:
1. Decision Support Only: You are an intelligent decision-support tool, NOT a replacement for a qualified veterinarian or local aquaculture extension officer.
2. Grounded in Real Data: Use ONLY the actual sensor readings and statuses provided. NEVER hallucinate or invent sensor measurements.
3. No Disease Diagnosis: Never claim a specific fish disease is confirmed solely from water-quality measurements. You may note stress factors, but disclaim clinical diagnoses.
4. Sensor Faults: If a sensor reports an error or disconnected status (e.g. status: "SENSOR_ERROR" or "ERROR" or null/NaN reading), explicitly state that the measurement is unavailable. Instruct the farmer to check physical wiring and sensor probes before taking irreversible water actions.
5. Conservative Interventions: AVOID recommending sudden or aggressive chemical shocks (e.g., massive lime dumping or rapid acid dosing). Rapid water chemistry changes kill fish faster than gradual drifts. Always recommend gradual, staged corrections.
6. Pump & Aerator Guidance: You have access to Pump 1 (Aerator / Circulation) and Pump 2 (Freshwater Flushing / Drainage). Tailor pump advice specifically (e.g., suggest turning on Pump 1 if oxygen is low/temp is high, or running Pump 2 for partial water exchange).
7. Species-Specific Guidance: Different species (Tilapia, Rohu, Catla, Mrigal, Common Carp, etc.) have distinct temperature, pH, and turbidity tolerances. Tailor your analysis and urgency to the specified cultured species.
8. Clear Structure: Always return structured JSON adhering strictly to the required schema with categories: NORMAL, ATTENTION, WARNING, CRITICAL, or SENSOR_ERROR.

### Status Categories:
- NORMAL: All monitored parameters are within optimal ranges for the cultured species.
- ATTENTION: A parameter is slightly deviating or drifting towards boundary limits; early observation recommended.
- WARNING: A parameter is clearly outside the preferred range and requires prompt verification and gentle intervention.
- CRITICAL: Multiple parameters are severely abnormal or a single parameter has reached lethal/dangerous thresholds threatening fish survival.
- SENSOR_ERROR: One or more sensor readings are missing, corrupted, or reporting hardware fault.`;

export const FISH_SPECIES_PROFILES = {
  Tilapia: {
    scientificName: "Oreochromis niloticus",
    tempOptimal: "26 - 32 °C",
    tempMin: 20,
    tempMax: 35,
    phOptimal: "6.5 - 8.5",
    phMin: 6.0,
    phMax: 9.0,
    turbidityOptimal: "< 50 NTU",
    notes: "Hardy species, tolerates warm water and moderate turbidity, but vulnerable below 20°C."
  },
  Rohu: {
    scientificName: "Labeo rohita",
    tempOptimal: "25 - 31 °C",
    tempMin: 22,
    tempMax: 33,
    phOptimal: "7.0 - 8.5",
    phMin: 6.5,
    phMax: 8.8,
    turbidityOptimal: "< 35 NTU",
    notes: "Major Indian Carp, column feeder, sensitive to acidic water (< 6.5) and high organic silt."
  },
  Catla: {
    scientificName: "Gibelion catla",
    tempOptimal: "25 - 32 °C",
    tempMin: 22,
    tempMax: 34,
    phOptimal: "7.2 - 8.5",
    phMin: 6.8,
    phMax: 8.8,
    turbidityOptimal: "< 40 NTU",
    notes: "Fast-growing surface feeder, high oxygen demand, highly sensitive to low pH."
  },
  Mrigal: {
    scientificName: "Cirrhinus mrigala",
    tempOptimal: "24 - 32 °C",
    tempMin: 20,
    tempMax: 33,
    phOptimal: "7.0 - 8.5",
    phMin: 6.5,
    phMax: 8.8,
    turbidityOptimal: "< 45 NTU",
    notes: "Bottom feeder, tolerates mild sediment disturbance, sensitive to anaerobic bottom sediment."
  },
  "Common Carp": {
    scientificName: "Cyprinus carpio",
    tempOptimal: "20 - 28 °C",
    tempMin: 15,
    tempMax: 30,
    phOptimal: "6.8 - 8.2",
    phMin: 6.5,
    phMax: 8.5,
    turbidityOptimal: "< 50 NTU",
    notes: "Very hardy, tolerates lower water temperatures better than tropical carps."
  },
  Other: {
    scientificName: "Freshwater Aquaculture Species",
    tempOptimal: "24 - 30 °C",
    tempMin: 20,
    tempMax: 32,
    phOptimal: "6.5 - 8.5",
    phMin: 6.5,
    phMax: 8.5,
    turbidityOptimal: "< 50 NTU",
    notes: "Standard freshwater aquaculture guidelines apply."
  }
};

/**
 * Builds the user prompt string containing sensor data, statuses, and farm context.
 */
export function buildAnalysisPrompt(waterQuality, status, farm) {
  const species = farm?.fishSpecies || "Tilapia";
  const speciesProfile = FISH_SPECIES_PROFILES[species] || FISH_SPECIES_PROFILES["Other"];

  const wt = waterQuality?.temperature !== undefined && waterQuality?.temperature !== null ? `${waterQuality.temperature} °C` : "Unavailable";
  const ph = waterQuality?.ph !== undefined && waterQuality?.ph !== null ? waterQuality.ph : "Unavailable";
  const tb = waterQuality?.turbidity !== undefined && waterQuality?.turbidity !== null ? `${waterQuality.turbidity} NTU` : "Unavailable";
  const at = waterQuality?.airTemperature !== undefined && waterQuality?.airTemperature !== null ? `${waterQuality.airTemperature} °C` : "Not attached";
  const hum = waterQuality?.humidity !== undefined && waterQuality?.humidity !== null ? `${waterQuality.humidity} %` : "Not attached";
  const p1 = status?.pump1 || waterQuality?.pump1 ? "RUNNING (ACTIVE)" : "OFF (STANDBY)";
  const p2 = status?.pump2 || waterQuality?.pump2 ? "RUNNING (ACTIVE)" : "OFF (STANDBY)";

  return `Please analyze the current pond telemetry and provide your structured aquaculture recommendation:

--- HARDWARE SENSOR TELEMETRY ---
- Water Temperature (DS18B20): ${wt} (Status: ${status?.temperature || "UNKNOWN"})
- Water pH: ${ph} (Status: ${status?.ph || "UNKNOWN"})
- Turbidity: ${tb} (Status: ${status?.turbidity || "UNKNOWN"})
- Ambient Air Temperature (DHT11): ${at}
- Ambient Air Humidity (DHT11): ${hum}
- Pump 1 (Aerator / Circulation Relay): ${p1}
- Pump 2 (Freshwater Flush / Drainage Relay): ${p2}
- Overall System Status: ${status?.overall || "NORMAL"}
- Hardware Buzzer Active: ${status?.buzzer ? "YES" : "NO"}

--- FARM CONTEXT ---
- Fish Species: ${species} (${speciesProfile.scientificName})
  * Target Optimal Temperature: ${speciesProfile.tempOptimal}
  * Target Optimal pH: ${speciesProfile.phOptimal}
  * Target Optimal Turbidity: ${speciesProfile.turbidityOptimal}
  * Species Notes: ${speciesProfile.notes}
- Culture System: ${farm?.cultureType || "Pond"}
- Pond / Enclosure Name: ${farm?.pondName || "Primary Pond"}
- Pond Surface Area: ${farm?.pondSize || "Not specified"}
- Fish Age / Stage: ${farm?.fishAge || "Not specified"}
- Stock Count: ${farm?.approxStock || "Not specified"}

Analyze whether readings are safe for ${species}. Explicitly advise on whether Pump 1 (Aerator) or Pump 2 (Flush) should be turned ON or kept OFF based on current temperature and turbidity. Provide actionable next steps that an everyday farmer can carry out safely.`;
}

/**
 * Schema definition for structured Gemini output.
 */
export const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["NORMAL", "ATTENTION", "WARNING", "CRITICAL", "SENSOR_ERROR"],
      description: "Overall condition category according to PRD guidelines."
    },
    summary: {
      type: "string",
      description: "One or two concise sentences summarizing the current pond water state and pump operation for the farmer."
    },
    whatToDoNow: {
      type: "array",
      items: { type: "string" },
      description: "Ordered, practical, numbered steps the farmer should execute immediately (safe, conservative actions including pump adjustments)."
    },
    monitor: {
      type: "array",
      items: { type: "string" },
      description: "Specific parameters or indicators to closely watch over the next 1-6 hours (e.g. ['pH', 'temperature', 'Pump 1 aeration', 'fish piping at surface'])."
    },
    urgency: {
      type: "string",
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      description: "Action urgency level."
    },
    reason: {
      type: "string",
      description: "Clear explanation linking the specific sensor readings, weather conditions, and species tolerance to this assessment."
    }
  },
  required: ["status", "summary", "whatToDoNow", "monitor", "urgency", "reason"]
};
