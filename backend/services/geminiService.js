import { GoogleGenAI, Type } from "@google/genai";
import {
  FISH_CULTURE_SYSTEM_INSTRUCTION,
  FISH_SPECIES_PROFILES,
  buildAnalysisPrompt
} from "../prompts/fishCulturePrompt.js";

// Preferred model according to Gemini API Skill guidelines
const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const FALLBACK_MODELS = ["gemini-flash-latest", "gemini-2.5-flash"];

/**
 * Initializes GoogleGenAI client if key is available.
 */
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Rule-based fallback generator when GEMINI_API_KEY is not configured or network fails.
 * Guarantees that the farmer always receives reliable, conservative aquaculture guidance.
 */
export function generateLocalRuleBasedAdvice(waterQuality, status, farm) {
  const species = farm?.fishSpecies || "Tilapia";
  const profile = FISH_SPECIES_PROFILES[species] || FISH_SPECIES_PROFILES["Other"];
  
  const temp = Number(waterQuality?.temperature);
  const ph = Number(waterQuality?.ph);
  const turb = Number(waterQuality?.turbidity);
  
  const hasTemp = !isNaN(temp) && status?.temperature !== "ERROR" && status?.temperature !== "SENSOR_ERROR";
  const hasPh = !isNaN(ph) && status?.ph !== "ERROR" && status?.ph !== "SENSOR_ERROR";
  const hasTurb = !isNaN(turb) && status?.turbidity !== "ERROR" && status?.turbidity !== "SENSOR_ERROR";

  // Check for sensor hardware errors
  if (!hasTemp || !hasPh || !hasTurb || status?.overall === "SENSOR_ERROR") {
    const errorSensors = [];
    if (!hasTemp) errorSensors.push("Water Temperature");
    if (!hasPh) errorSensors.push("pH");
    if (!hasTurb) errorSensors.push("Turbidity");

    return {
      status: "SENSOR_ERROR",
      summary: `Sensor telemetry unavailable or hardware fault detected on: ${errorSensors.join(", ")}.`,
      whatToDoNow: [
        `Inspect the wiring and probe connections on your Arduino Uno for ${errorSensors.join(", ")}.`,
        "Do NOT add water treatment chemicals or make abrupt pond adjustments without verified readings.",
        "Ensure the 2 pumps remain in safe manual state or verified automatic circulation.",
        "Use a calibrated handheld meter or reagent test kit to verify pond parameters manually."
      ],
      monitor: errorSensors.length > 0 ? errorSensors : ["pH", "Temperature", "Turbidity"],
      urgency: "HIGH",
      reason: `Automated recommendations are restrained because reliable sensor data is unavailable for ${errorSensors.join(", ")}. Physical probe verification is necessary.`
    };
  }

  // Analyze water parameters
  const issues = [];
  const monitorList = [];
  let urgency = "LOW";
  let conditionStatus = "NORMAL";

  // pH checks
  if (ph < profile.phMin) {
    issues.push({ param: "pH", level: "CRITICAL_LOW", text: `pH (${ph}) is dangerously acidic for ${species} (Min: ${profile.phMin})` });
    monitorList.push("pH");
    urgency = "CRITICAL";
    conditionStatus = "CRITICAL";
  } else if (ph < 6.8 && profile.phMin >= 6.5) {
    issues.push({ param: "pH", level: "LOW", text: `pH (${ph}) is below optimal range (${profile.phOptimal})` });
    monitorList.push("pH");
    if (urgency !== "CRITICAL") urgency = "MEDIUM";
    if (conditionStatus === "NORMAL") conditionStatus = "ATTENTION";
  } else if (ph > profile.phMax) {
    issues.push({ param: "pH", level: "CRITICAL_HIGH", text: `pH (${ph}) is dangerously alkaline for ${species} (Max: ${profile.phMax})` });
    monitorList.push("pH");
    urgency = "CRITICAL";
    conditionStatus = "CRITICAL";
  } else if (ph > 8.5) {
    issues.push({ param: "pH", level: "HIGH", text: `pH (${ph}) is elevated above preferred upper limit (${profile.phOptimal})` });
    monitorList.push("pH");
    if (urgency !== "CRITICAL") urgency = "HIGH";
    if (conditionStatus !== "CRITICAL") conditionStatus = "WARNING";
  }

  // Temperature checks
  if (temp < profile.tempMin) {
    issues.push({ param: "Temperature", level: "LOW", text: `Water temperature (${temp}°C) is too cold for ${species} (Min: ${profile.tempMin}°C)` });
    monitorList.push("Temperature");
    if (urgency !== "CRITICAL") urgency = "HIGH";
    if (conditionStatus !== "CRITICAL") conditionStatus = "WARNING";
  } else if (temp > profile.tempMax) {
    issues.push({ param: "Temperature", level: "HIGH", text: `Water temperature (${temp}°C) is critically elevated for ${species} (Max: ${profile.tempMax}°C)` });
    monitorList.push("Temperature");
    urgency = "CRITICAL";
    conditionStatus = "CRITICAL";
  } else if (temp < 24 && species !== "Common Carp") {
    issues.push({ param: "Temperature", level: "SUB_OPTIMAL", text: `Water temperature (${temp}°C) is sub-optimal; feed intake may drop` });
    monitorList.push("Temperature");
    if (urgency === "LOW") urgency = "MEDIUM";
    if (conditionStatus === "NORMAL") conditionStatus = "ATTENTION";
  }

  // Turbidity checks
  if (turb > 100) {
    issues.push({ param: "Turbidity", level: "VERY_HIGH", text: `Turbidity (${turb} NTU) is excessive; risk of gill clogging and oxygen sag` });
    monitorList.push("Turbidity");
    if (urgency !== "CRITICAL") urgency = "HIGH";
    if (conditionStatus !== "CRITICAL") conditionStatus = "WARNING";
  } else if (turb > 60) {
    issues.push({ param: "Turbidity", level: "HIGH", text: `Turbidity (${turb} NTU) exceeds optimal clarity (${profile.turbidityOptimal})` });
    monitorList.push("Turbidity");
    if (urgency === "LOW") urgency = "MEDIUM";
    if (conditionStatus === "NORMAL") conditionStatus = "ATTENTION";
  }

  // Normal state
  if (issues.length === 0) {
    return {
      status: "NORMAL",
      summary: `Water conditions are currently optimal for ${species} (${farm?.cultureType || "Pond"}). All monitored parameters are within safe bounds.`,
      whatToDoNow: [
        "Continue routine feeding and observation according to your normal farm schedule.",
        "Keep Pump 1 (Aerator) in auto mode or run on standard morning cycle.",
        "Perform visual check of surface water and fish swimming posture at dawn and dusk.",
        "Log readings periodically to track daily diurnal patterns."
      ],
      monitor: ["pH", "Temperature", "Turbidity"],
      urgency: "LOW",
      reason: `Water Temperature (${temp}°C), pH (${ph}), and Turbidity (${turb} NTU) are comfortably seated inside ${species}'s optimal comfort envelope (${profile.tempOptimal}, pH ${profile.phOptimal}).`
    };
  }

  // Generate actionable steps based on detected issues
  const actions = [];
  
  // Pump specific actions
  if (temp > 30 || turb > 55) {
    actions.push("Turn ON Pump 1 (Aerator / Circulation Pump) to prevent oxygen depletion and thermal stratification.");
  }
  if (turb > 75 || ph < 6.2 || ph > 8.8) {
    actions.push("Activate Pump 2 (Freshwater Pump) for a gradual 10-15% water exchange to flush excessive turbidity or dilute pH extremes.");
  }

  actions.push("Re-check current readings after 15 to 30 minutes to confirm whether values are drifting or stabilizing.");
  actions.push("Observe fish swimming orientation, gill movements, and check whether fish are gasping ('piping') at the water surface.");

  if (issues.some(i => i.param === "pH")) {
    actions.push("Avoid sudden chemical shock treatments. If pH is low, plan gradual buffering with agricultural limestone after consulting local extension standards.");
  }
  if (issues.some(i => i.param === "Temperature")) {
    actions.push("Reduce feed rations by 20-40% if temperature is outside the preferred digestive zone to avoid water fouling.");
  }

  return {
    status: conditionStatus,
    summary: issues.map(i => i.text).join(". ") + ".",
    whatToDoNow: actions.slice(0, 4),
    monitor: Array.from(new Set(monitorList)),
    urgency,
    reason: `Telemetry indicates ${issues.length} parameter(s) outside optimal thresholds for ${species} in a ${farm?.cultureType || "Pond"} environment.`
  };
}

/**
 * Request structured advice from Gemini API using @google/genai SDK.
 */
export async function getGeminiFishAdvice(waterQuality, status, farm) {
  const client = getGenAIClient();
  
  if (!client) {
    // Provide safe, deterministic aquaculture guidance if key is absent
    const advice = generateLocalRuleBasedAdvice(waterQuality, status, farm);
    advice._source = "rule_engine";
    advice._notice = "API key not configured in backend/.env. Using AquaSentinel local expert rules.";
    return advice;
  }

  const promptText = buildAnalysisPrompt(waterQuality, status, farm);

  // Try primary model, fallback if needed
  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];

  for (const model of modelsToTry) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: promptText,
        config: {
          systemInstruction: FISH_CULTURE_SYSTEM_INSTRUCTION,
          temperature: 0.2, // Conservative, deterministic aquaculture advice
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: {
                type: Type.STRING,
                enum: ["NORMAL", "ATTENTION", "WARNING", "CRITICAL", "SENSOR_ERROR"]
              },
              summary: { type: Type.STRING },
              whatToDoNow: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              monitor: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              urgency: {
                type: Type.STRING,
                enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
              },
              reason: { type: Type.STRING }
            },
            required: ["status", "summary", "whatToDoNow", "monitor", "urgency", "reason"]
          }
        }
      });

      const responseText = response.text?.trim();
      if (responseText) {
        const parsed = JSON.parse(responseText);
        parsed._source = `gemini:${model}`;
        return parsed;
      }
    } catch (err) {
      console.warn(`[GeminiService] Warning: Failed request with model ${model}:`, err.message);
      // continue to next model in loop
    }
  }

  // If all Gemini calls failed, use rule engine
  console.error("[GeminiService] All Gemini model attempts failed. Falling back to local rule engine.");
  const fallbackAdvice = generateLocalRuleBasedAdvice(waterQuality, status, farm);
  fallbackAdvice._source = "fallback_rule_engine";
  fallbackAdvice._notice = "Gemini service temporarily unreachable. Serving verified local aquaculture guidance.";
  return fallbackAdvice;
}

/**
 * Handle interactive Farmer Chat with Gemini.
 */
export async function getGeminiChatReply({ message, conversationHistory = [], waterQuality, status, farm }) {
  const client = getGenAIClient();
  const species = farm?.fishSpecies || "Tilapia";
  const profile = FISH_SPECIES_PROFILES[species] || FISH_SPECIES_PROFILES["Other"];

  // Fallback if client is not configured
  if (!client) {
    return {
      reply: `**AquaSentinel Advisor (Local Expert Mode)**\n\n` +
        `Current Telemetry for **${species}** (${farm?.cultureType || "Pond"}):\n` +
        `- Water Temp (DS18B20): ${waterQuality?.temperature !== null ? `${waterQuality.temperature} °C` : 'N/A'}\n` +
        `- pH: ${waterQuality?.ph !== null ? waterQuality.ph : 'N/A'}\n` +
        `- Turbidity: ${waterQuality?.turbidity !== null ? `${waterQuality.turbidity} NTU` : 'N/A'}\n` +
        (waterQuality?.airTemperature !== undefined && waterQuality?.airTemperature !== null ? `- Air Temp (DHT11): ${waterQuality.airTemperature} °C\n` : '') +
        (waterQuality?.humidity !== undefined && waterQuality?.humidity !== null ? `- Air Humidity (DHT11): ${waterQuality.humidity} %\n` : '') +
        `- Pump 1 (Aerator): ${status?.pump1 ? 'RUNNING' : 'OFF'}\n` +
        `- Pump 2 (Fresh Water): ${status?.pump2 ? 'RUNNING' : 'OFF'}\n\n` +
        `*Farmer query: "${message}"*\n\n` +
        `**Practical Guidance:** For ${species}, keep water temperature between ${profile.tempOptimal} and pH between ${profile.phOptimal}. If turbidity climbs or temperature increases, activate Pump 1 (Aerator) to sustain dissolved oxygen. For live AI responses, configure your free Google Gemini API key in backend/.env.`
    };
  }

  const systemInstruction = `You are AquaSentinel's expert aquaculture assistant conversing with a fish farmer.
Cultured species: ${species} (${profile.scientificName})
Target Optimal: Water Temp ${profile.tempOptimal}, pH ${profile.phOptimal}, Turbidity ${profile.turbidityOptimal}.
Current Water Temp: ${waterQuality?.temperature !== null ? `${waterQuality.temperature}°C` : 'Unavailable'}
Current pH: ${waterQuality?.ph !== null ? waterQuality.ph : 'Unavailable'}
Current Turbidity: ${waterQuality?.turbidity !== null ? `${waterQuality.turbidity} NTU` : 'Unavailable'}
Ambient Air Temp (DHT11): ${waterQuality?.airTemperature !== null ? `${waterQuality.airTemperature}°C` : 'Not connected'}
Ambient Humidity (DHT11): ${waterQuality?.humidity !== null ? `${waterQuality.humidity}%` : 'Not connected'}
Pump 1 (Aerator): ${status?.pump1 ? 'RUNNING' : 'OFF'}
Pump 2 (Fresh Water): ${status?.pump2 ? 'RUNNING' : 'OFF'}
System Overall Status: ${status?.overall || 'NORMAL'}

Be concise, practical, encouraging, and farmer-focused. Mention Pump 1 or Pump 2 operation when appropriate. Give direct bullet points. If conditions are hazardous, tell them conservative steps first. Never invent sensor readings.`;

  const contents = [];
  for (const msg of conversationHistory.slice(-6)) {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    });
  }
  contents.push({
    role: "user",
    parts: [{ text: message }]
  });

  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];

  for (const model of modelsToTry) {
    try {
      const response = await client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: 0.3
        }
      });
      const reply = response.text?.trim();
      if (reply) {
        return { reply, _source: `gemini:${model}` };
      }
    } catch (err) {
      console.warn(`[GeminiChat] Warning: Model ${model} failed:`, err.message);
    }
  }

  return {
    reply: `Could not reach Gemini service. Please verify your internet connection or check your pond's visual surface state. If water temperature exceeds 32°C or turbidity is murky, turn on Pump 1 (Aerator).`
  };
}
