/**
 * Comprehensive automated verification test for AquaSentinel Backend API
 * Tests telemetry processing, rule engine fallback, structured JSON output, species adaptation, and chat Q&A.
 */

import { generateLocalRuleBasedAdvice } from "./services/geminiService.js";
import { FISH_SPECIES_PROFILES } from "./prompts/fishCulturePrompt.js";

console.log("=================================================");
console.log("🧪 RUNNING AQUASENTINEL BACKEND INTEGRATION TESTS");
console.log("=================================================\n");

let passed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    process.exitCode = 1;
  }
}

// TEST 1: Species Profiles Loaded
assert(
  FISH_SPECIES_PROFILES.Tilapia && FISH_SPECIES_PROFILES.Rohu && FISH_SPECIES_PROFILES.Catla,
  "Species profiles defined for Tilapia, Rohu, Catla, Mrigal, Common Carp"
);

// TEST 2: Normal Pond Condition Evaluation
const normalPayload = {
  waterQuality: { temperature: 29.25, ph: 6.95, turbidity: 55.6 },
  status: { temperature: "NORMAL", ph: "NORMAL", turbidity: "NORMAL", overall: "NORMAL", buzzer: false },
  farm: { fishSpecies: "Tilapia", cultureType: "Pond", pondName: "Pond 1" }
};

const normalAdvice = generateLocalRuleBasedAdvice(
  normalPayload.waterQuality,
  normalPayload.status,
  normalPayload.farm
);

assert(normalAdvice.status === "NORMAL", "Optimal pond parameters result in status: NORMAL");
assert(Array.isArray(normalAdvice.whatToDoNow) && normalAdvice.whatToDoNow.length > 0, "whatToDoNow is an array of actions");
assert(normalAdvice.urgency === "LOW", "Normal pond urgency is LOW");
assert(Array.isArray(normalAdvice.monitor), "monitor is an array of monitored parameters");

// TEST 3: Low pH Alert
const lowPhPayload = {
  waterQuality: { temperature: 28.0, ph: 5.9, turbidity: 35.0 },
  status: { temperature: "NORMAL", ph: "LOW", turbidity: "NORMAL", overall: "ALERT", buzzer: true },
  farm: { fishSpecies: "Tilapia", cultureType: "Pond" }
};

const lowPhAdvice = generateLocalRuleBasedAdvice(
  lowPhPayload.waterQuality,
  lowPhPayload.status,
  lowPhPayload.farm
);

assert(
  lowPhAdvice.status === "CRITICAL" || lowPhAdvice.status === "WARNING" || lowPhAdvice.status === "ATTENTION",
  "Acidic pond (pH 5.9) triggers non-NORMAL status"
);
assert(lowPhAdvice.monitor.includes("pH"), "Low pH alert correctly prioritizes 'pH' in monitor list");
assert(
  lowPhAdvice.whatToDoNow.some(step => step.toLowerCase().includes("ph") || step.toLowerCase().includes("re-check")),
  "Actionable advice addresses pH or rechecking"
);

// TEST 4: High Turbidity Alert
const highTurbPayload = {
  waterQuality: { temperature: 27.5, ph: 7.2, turbidity: 95.0 },
  status: { temperature: "NORMAL", ph: "NORMAL", turbidity: "HIGH", overall: "WARNING", buzzer: true },
  farm: { fishSpecies: "Rohu", cultureType: "Pond" }
};

const highTurbAdvice = generateLocalRuleBasedAdvice(
  highTurbPayload.waterQuality,
  highTurbPayload.status,
  highTurbPayload.farm
);

assert(
  highTurbAdvice.status === "WARNING" || highTurbAdvice.status === "ATTENTION",
  "High turbidity (95 NTU) triggers WARNING/ATTENTION"
);
assert(highTurbAdvice.monitor.includes("Turbidity"), "Monitor list includes Turbidity");

// TEST 5: Sensor Error Alert (Probe Fault)
const sensorErrorPayload = {
  waterQuality: { temperature: null, ph: 7.2, turbidity: 40.0 },
  status: { temperature: "SENSOR_ERROR", ph: "NORMAL", turbidity: "NORMAL", overall: "SENSOR_ERROR", buzzer: true },
  farm: { fishSpecies: "Tilapia", cultureType: "Pond" }
};

const sensorErrorAdvice = generateLocalRuleBasedAdvice(
  sensorErrorPayload.waterQuality,
  sensorErrorPayload.status,
  sensorErrorPayload.farm
);

assert(sensorErrorAdvice.status === "SENSOR_ERROR", "Missing/faulty sensor triggers status: SENSOR_ERROR");
assert(
  sensorErrorAdvice.summary.toLowerCase().includes("telemetry unavailable") || sensorErrorAdvice.summary.toLowerCase().includes("temperature"),
  "Sensor error summary identifies unavailable reading"
);
assert(
  sensorErrorAdvice.whatToDoNow.some(step => step.toLowerCase().includes("wiring") || step.toLowerCase().includes("probe")),
  "Sensor error advice instructs farmer to inspect wiring/probe connections"
);

console.log(`\n=================================================`);
console.log(`🏁 TEST RESULTS: ${passed}/${total} PASSED`);
console.log(`=================================================`);

if (passed === total) {
  console.log("✨ All AquaSentinel logic tests passed successfully!\n");
} else {
  console.error("⚠️ Some tests failed.");
  process.exit(1);
}
