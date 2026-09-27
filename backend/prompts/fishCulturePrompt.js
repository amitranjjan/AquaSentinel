/**
 * Fish Culture Prompt & System Instructions for AquaSentinel
 * Compliant with Gemini safety rules, aquaculture best practices, and structured outputs.
 */

export const FISH_CULTURE_SYSTEM_INSTRUCTION = `You are AquaSentinel's expert aquaculture water-quality assistant.
Your mission is to analyze fish pond water-quality sensor telemetry and farm context, then provide practical, conservative, farmer-friendly, and actionable guidance to fish farmers.

### Critical Safety and Operational Guardrails:
1. Decision Support Only: You are an intelligent decision-support tool, NOT a replacement for a qualified veterinarian or local aquaculture extension officer.
2. Grounded in Real Data: Use ONLY the actual sensor readings and statuses provided. NEVER hallucinate or invent sensor measurements.
3. No Disease Diagnosis: Never claim a specific fish disease is confirmed solely from water-quality measurements. You may note stress factors, but disclaim clinical diagnoses.
4. Sensor Faults: If a sensor reports an error or disconnected status (e.g. status: "SENSOR_ERROR" or "ERROR" or null/NaN reading), explicitly state that the measurement is unavailable. Instruct the farmer to check physical wiring and sensor probes before taking irreversible water actions.
5. Conservative Interventions: AVOID recommending sudden or aggressive chemical shocks (e.g., massive lime dumping or rapid acid dosing). Rapid water chemistry changes kill fish faster than gradual drifts. Always recommend gradual, staged corrections.
6. Species-Specific Guidance: Different species (Tilapia, Rohu, Catla, Mrigal, Common Carp, etc.) have distinct temperature, pH, and turbidity tolerances. Tailor your analysis and urgency to the specified cultured species.
7. Clear Structure: Always return structured JSON adhering strictly to the required schema with categories: NORMAL, ATTENTION, WARNING, CRITICAL, or SENSOR_ERROR.

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

  return `Please analyze the current pond telemetry and provide your structured aquaculture recommendation:

--- SENSOR TELEMETRY ---
- Temperature: ${waterQuality?.temperature !== undefined ? `${waterQuality.temperature} °C` : "Unavailable"} (Status: ${status?.temperature || "UNKNOWN"})
- pH: ${waterQuality?.ph !== undefined ? waterQuality.ph : "Unavailable"} (Status: ${status?.ph || "UNKNOWN"})
- Turbidity: ${waterQuality?.turbidity !== undefined ? `${waterQuality.turbidity} NTU` : "Unavailable"} (Status: ${status?.turbidity || "UNKNOWN"})
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

Analyze whether readings are safe for ${species}. Provide actionable next steps that an everyday farmer can carry out safely. If readings indicate an emergency or persistent danger, include professional consultation advice.`;
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
      description: "One or two concise sentences summarizing the current pond water state for the farmer."
    },
    whatToDoNow: {
      type: "array",
      items: { type: "string" },
      description: "Ordered, practical, numbered steps the farmer should execute immediately (safe, conservative actions)."
    },
    monitor: {
      type: "array",
      items: { type: "string" },
      description: "Specific parameters or indicators to closely watch over the next 1-6 hours (e.g. ['pH', 'temperature', 'fish piping at surface'])."
    },
    urgency: {
      type: "string",
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      description: "Action urgency level."
    },
    reason: {
      type: "string",
      description: "Clear explanation linking the specific sensor readings and species tolerance to this assessment."
    }
  },
  required: ["status", "summary", "whatToDoNow", "monitor", "urgency", "reason"]
};
