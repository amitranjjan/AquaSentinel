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
    if (!hasTemp) errorSensors.push("Temperature");
    if (!hasPh) errorSensors.push("pH");
    if (!hasTurb) errorSensors.push("Turbidity");

    return {
      status: "SENSOR_ERROR",
      summary: `Sensor telemetry unavailable or hardware fault detected on: ${errorSensors.join(", ")}.`,
      whatToDoNow: [
        `Inspect the wiring and probe connections for ${errorSensors.join(", ")}.`,
        "Do NOT add water treatment chemicals or make abrupt pond adjustments without verified readings.",
        "Use a calibrated handheld meter or reagent test kit to verify pond parameters manually.",
        "Ensure sensor cables are shielded from moisture intrusion and electrical noise."
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
        "Perform visual check of surface water and fish swimming posture at dawn and dusk.",
        "Log readings periodically to track daily diurnal patterns."
      ],
      monitor: ["pH", "Temperature", "Turbidity"],
      urgency: "LOW",
      reason: `Temperature (${temp}°C), pH (${ph}), and Turbidity (${turb} NTU) are comfortably seated inside ${species}'s optimal comfort envelope (${profile.tempOptimal}, pH ${profile.phOptimal}).`
    };
  }

  // Generate actionable steps based on detected issues
  const actions = [];
  actions.push("Re-check current readings after 15 to 30 minutes to confirm whether values are drifting or stable.");
  actions.push("Observe fish swimming orientation, gill movements, and check whether fish are gasping ('piping') at the water surface.");

  if (issues.some(i => i.param === "pH")) {
    actions.push("Avoid sudden chemical shock treatments. If pH is low, plan gradual buffering with agricultural limestone after consulting local extension standards.");
  }
  if (issues.some(i => i.param === "Turbidity")) {
    actions.push("Check pond inlet source for muddy runoff or erosion. Reduce active bottom disturbance or paddle aerator angle if suspended silt is rising.");
  }
  if (issues.some(i => i.param === "Temperature")) {
    actions.push("Reduce feed rations by 20-40% if temperature is outside the preferred digestive zone to avoid water fouling.");
  }
  actions.push("If abnormal conditions persist for more than 2 consecutive readings, consult your local aquaculture extension specialist.");

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
        `- Temperature: **${waterQuality?.temperature ?? "N/A"} °C** (Optimal: ${profile.tempOptimal})\n` +
        `- pH: **${waterQuality?.ph ?? "N/A"}** (Optimal: ${profile.phOptimal})\n` +
        `- Turbidity: **${waterQuality?.turbidity ?? "N/A"} NTU** (Optimal: ${profile.turbidityOptimal})\n\n` +
        `*Regarding your question: "${message}"*\n\n` +
        `*Guidance:* Monitor your pond parameters closely. If pH is drifting, avoid quick chemical dumping and check pond buffer capacity. For temperature fluctuations, adjust feeding rates to avoid rotting uneaten feed on the pond floor. For hardware or probe issues, calibrate using standard buffer solutions.\n\n` +
        `*(Note: To unlock live real-time Gemini 3.8 Flash interactive AI dialogs, provide a GEMINI_API_KEY in backend/.env)*`,
      _source: "local_chat_engine"
    };
  }

  const contextInstruction = `${FISH_CULTURE_SYSTEM_INSTRUCTION}

You are now in interactive chat mode with the fish farmer.
The farmer is monitoring ${species} in a ${farm?.cultureType || "Pond"}.
Farm profile: Pond "${farm?.pondName || "Pond 1"}", Area: ${farm?.pondSize || "N/A"}, Age: ${farm?.fishAge || "N/A"}, Stock: ${farm?.approxStock || "N/A"}.

Current Real-time Sensors:
- Temperature: ${waterQuality?.temperature !== undefined ? `${waterQuality.temperature} °C` : "Sensor error"} (Status: ${status?.temperature || "NORMAL"})
- pH: ${waterQuality?.ph !== undefined ? waterQuality.ph : "Sensor error"} (Status: ${status?.ph || "NORMAL"})
- Turbidity: ${waterQuality?.turbidity !== undefined ? `${waterQuality.turbidity} NTU` : "Sensor error"} (Status: ${status?.turbidity || "NORMAL"})
- Overall Status: ${status?.overall || "NORMAL"}
- Hardware Buzzer: ${status?.buzzer ? "TRIGGERED" : "OFF"}

Format your answer with clear markdown bullet points, bold highlights, and keep it practical for a farmer working by the pond. Always emphasize conservative, safe practices and state that your advice supports rather than replaces certified aquaculture veterinary consultation.`;

  // Build message history
  const contents = [];
  for (const item of conversationHistory.slice(-6)) {
    contents.push({
      role: item.role === "user" ? "user" : "model",
      parts: [{ text: item.text }]
    });
  }
  // Add latest question
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
          systemInstruction: contextInstruction,
          temperature: 0.3
        }
      });

      if (response.text) {
        return {
          reply: response.text.trim(),
          _source: `gemini:${model}`
        };
      }
    } catch (err) {
      console.warn(`[GeminiService Chat] Warning on model ${model}:`, err.message);
    }
  }

  return {
    reply: "Sorry, the AI assistant could not complete the request at this moment. Please check your network connection or verify current pond parameters directly on the dashboard gauge.",
    _source: "error_fallback"
  };
}
