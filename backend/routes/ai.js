import express from "express";
import { getGeminiFishAdvice, getGeminiChatReply } from "../services/geminiService.js";
import { FISH_SPECIES_PROFILES } from "../prompts/fishCulturePrompt.js";

const router = express.Router();

// In-memory cache & history storage
let lastRecommendation = null;
let lastConditionFingerprint = "";
let lastAnalysisTimestamp = 0;
const COOLDOWN_MS = 45 * 1000; // 45 seconds cooldown for automatic triggers

const adviceHistory = [];

/**
 * Creates a unique fingerprint of the pond condition to prevent unnecessary duplicate AI calls.
 */
function createConditionFingerprint(waterQuality, status, farm) {
  const tStatus = status?.temperature || "NORMAL";
  const pStatus = status?.ph || "NORMAL";
  const tbStatus = status?.turbidity || "NORMAL";
  const oStatus = status?.overall || "NORMAL";
  const species = farm?.fishSpecies || "Tilapia";
  // Round to 1 decimal place for stable fingerprinting
  const tVal = Math.round(Number(waterQuality?.temperature || 0) * 10) / 10;
  const pVal = Math.round(Number(waterQuality?.ph || 0) * 10) / 10;
  const tbVal = Math.round(Number(waterQuality?.turbidity || 0));

  return `${species}-${oStatus}-${tStatus}-${pStatus}-${tbStatus}-${tVal}-${pVal}-${tbVal}`;
}

/**
 * Formats a condition label for history (e.g. "pH HIGH", "NORMAL", "Turbidity HIGH")
 */
function getConditionLabel(status, waterQuality) {
  const flags = [];
  if (status?.ph && status.ph !== "NORMAL") flags.push(`pH ${status.ph}`);
  if (status?.temperature && status.temperature !== "NORMAL") flags.push(`Temp ${status.temperature}`);
  if (status?.turbidity && status.turbidity !== "NORMAL") flags.push(`Turbidity ${status.turbidity}`);
  if (flags.length === 0) return status?.overall || "NORMAL";
  return flags.join(" & ");
}

/**
 * POST /api/ai/fish-advice
 * Generates or retrieves cached structured aquaculture recommendation.
 */
router.post("/fish-advice", async (req, res) => {
  try {
    const { waterQuality, status, farm, forceRefresh = false, triggerReason = "manual" } = req.body;

    const currentFingerprint = createConditionFingerprint(waterQuality, status, farm);
    const now = Date.now();
    const timeSinceLast = now - lastAnalysisTimestamp;

    // Check if we should use cached recommendation
    const isSignificantAlert = status?.overall === "ALERT" || 
                               status?.overall === "CRITICAL" ||
                               status?.ph === "HIGH" || status?.ph === "LOW" ||
                               status?.temperature === "HIGH" || status?.temperature === "LOW" ||
                               status?.turbidity === "HIGH";

    const conditionChanged = currentFingerprint !== lastConditionFingerprint;

    // If not forced and condition hasn't changed and within cooldown, serve cache
    if (!forceRefresh && lastRecommendation && !conditionChanged && timeSinceLast < COOLDOWN_MS) {
      return res.json({
        success: true,
        cached: true,
        cooldownRemainingSec: Math.max(0, Math.round((COOLDOWN_MS - timeSinceLast) / 1000)),
        data: lastRecommendation
      });
    }

    // Call Gemini Service
    const advice = await getGeminiFishAdvice(waterQuality, status, farm);
    const timestamp = new Date().toISOString();

    const record = {
      id: `adv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      timeFormatted: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      condition: getConditionLabel(status, waterQuality),
      status: advice.status,
      summary: advice.summary,
      whatToDoNow: advice.whatToDoNow,
      monitor: advice.monitor,
      urgency: advice.urgency,
      reason: advice.reason,
      triggerReason,
      readings: {
        temperature: waterQuality?.temperature,
        ph: waterQuality?.ph,
        turbidity: waterQuality?.turbidity
      },
      farmContext: {
        fishSpecies: farm?.fishSpecies || "Tilapia",
        cultureType: farm?.cultureType || "Pond",
        pondName: farm?.pondName || "Pond 1"
      },
      _source: advice._source,
      _notice: advice._notice
    };

    // Update cache
    lastRecommendation = record;
    lastConditionFingerprint = currentFingerprint;
    lastAnalysisTimestamp = now;

    // Append to history (keep newest 50)
    adviceHistory.unshift(record);
    if (adviceHistory.length > 50) {
      adviceHistory.pop();
    }

    return res.json({
      success: true,
      cached: false,
      data: record
    });
  } catch (error) {
    console.error("[Route /fish-advice] Error generating advice:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate fish advice",
      message: error.message
    });
  }
});

/**
 * POST /api/ai/chat
 * Handles conversational queries from farmer about pond and water conditions.
 */
router.post("/chat", async (req, res) => {
  try {
    const { message, conversationHistory = [], waterQuality, status, farm } = req.body;

    if (!message || typeof message !== "string" || message.trim() === "") {
      return res.status(400).json({ success: false, error: "A non-empty message is required" });
    }

    const chatResponse = await getGeminiChatReply({
      message: message.trim(),
      conversationHistory,
      waterQuality,
      status,
      farm
    });

    return res.json({
      success: true,
      data: {
        reply: chatResponse.reply,
        timestamp: new Date().toISOString(),
        _source: chatResponse._source
      }
    });
  } catch (error) {
    console.error("[Route /chat] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process chat message",
      message: error.message
    });
  }
});

/**
 * GET /api/ai/history
 * Returns the history of previous AI recommendations.
 */
router.get("/history", (req, res) => {
  return res.json({
    success: true,
    total: adviceHistory.length,
    data: adviceHistory
  });
});

/**
 * DELETE /api/ai/history
 * Clears recommendation history.
 */
router.delete("/history", (req, res) => {
  adviceHistory.length = 0;
  return res.json({
    success: true,
    message: "AI recommendation history cleared"
  });
});

/**
 * GET /api/ai/species-profiles
 * Returns aquaculture profiles and preferred thresholds for common cultured species.
 */
router.get("/species-profiles", (req, res) => {
  return res.json({
    success: true,
    data: FISH_SPECIES_PROFILES
  });
});

/**
 * GET /api/ai/health
 * Returns server and Gemini status.
 */
router.get("/health", (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY");
  return res.json({
    success: true,
    geminiConfigured: hasKey,
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    historyCount: adviceHistory.length,
    timestamp: new Date().toISOString()
  });
});

export default router;
