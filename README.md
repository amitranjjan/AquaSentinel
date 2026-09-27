# 🐟 AquaSentinel — Water Quality + Gemini Fish-Culture Assistant

The system measures key physicochemical parameters (**Water Temperature**, **pH**, and **Turbidity**), detects deviations against species-specific physiological thresholds, sounds local physical alarms, and leverages the **Google Gemini API** (`gemini-3.8-flash`) to generate structured, actionable, and conservative advice for the farmer.

> **IMPORTANT OPERATIONAL NOTE**: The web dashboard is designed to operate in real time **only when the physical AquaSentinel ESP32 device is connected via Bluetooth Low Energy (BLE)**. When disconnected, the dashboard remains in Standby mode awaiting hardware pairing.

---

## 🌊 Main Architecture Flow

```
[ Water Quality Sensors ]
  ├── DS18B20 Digital Waterproof Temperature Sensor (GPIO 4)
  ├── Analog pH Probe & Conditioning Board (GPIO 34 / ADC1)
  ├── Optical Turbidity Sensor (GPIO 35 / ADC1)
  └── Piezo Buzzer & Alert Siren (GPIO 23)
               │
               ▼
[ ESP32 IoT Node (BLE GATT Server) ]
  └── Custom Service UUID: 0000ffe0-0000-1000-8000-00805f9b34fb
  └── Characteristic:      0000ffe1-0000-1000-8000-00805f9b34fb (Notify)
               │
               │ (Web Bluetooth API or Built-in Sensor Simulator)
               ▼
[ AquaSentinel Web Dashboard (React + Vite + TypeScript) ]
  ├── Real-time Sensor Metric Cards & Status Badges
  ├── Overall Water Quality Status Card
  ├── 🤖 Gemini Fish-Culture Assistant Card
  ├── Interactive Water Quality Trend Charts (Recharts)
  ├── AI Recommendation & Condition History Log
  ├── Farmer Q&A Chat Drawer Grounded in Live Telemetry
  └── Farm & Fish Species Configuration Panel
               │
               │ (HTTP / JSON)
               ▼
[ AquaSentinel Backend (Node.js + Express) ]
  ├── Automatic Alert Cooldown & Condition Cache Engine
  └── @google/genai SDK Integration
               │
               ▼
[ Google Gemini API (gemini-3.8-flash) ]
  └── Sensor-grounded, species-tailored, conservative decision support
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18+ or v20+)
- **npm** (v9+)
- A **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/)
- (Optional for physical deployment) **ESP32 Dev Board** with DS18B20, pH sensor, and Turbidity sensor.

### 2. Configure Environment Variables
Copy `backend/.env.example` to `backend/.env` and paste your Gemini API key:
```bash
# In backend/.env:
PORT=5000
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
```

> **Note**: If `GEMINI_API_KEY` is not provided, AquaSentinel seamlessly activates its built-in **Local Aquaculture Rule Engine**, providing verified, species-aware guidance offline without crashing.

### 3. Launch Development Server
From the root project directory:
```bash
# Run both backend and frontend concurrently
npm run dev
```

- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Backend API Server**: [http://localhost:5000](http://localhost:5000)

---

## 🤖 1. The Gemini Fish-Culture Assistant

The farmer receives real-time, sensor-grounded advice directly on the dashboard card:

### Structured Gemini Response (PRD Section 4):
```json
{
  "status": "ATTENTION",
  "summary": "Water conditions need monitoring.",
  "whatToDoNow": [
    "Check the pH reading again after a short interval.",
    "Observe fish feeding and swimming behavior.",
    "Avoid sudden changes to pond water."
  ],
  "monitor": [
    "pH",
    "temperature",
    "turbidity"
  ],
  "urgency": "MEDIUM",
  "reason": "pH is outside the configured preferred range."
}
```

### Automatic AI Analysis (PRD Section 6):
AquaSentinel automatically requests AI evaluations when:
- pH becomes **LOW** (< 6.5) or **HIGH** (> 8.5)
- Water temperature becomes **LOW** (< 22°C) or **HIGH** (> 32.5°C)
- Turbidity becomes **HIGH** (> 75 NTU)
- A **Sensor Error** occurs (probe disconnected or faulty)
- Overall water status switches to **ALERT** or **CRITICAL**

A 45-second cooldown and condition fingerprint cache prevent repeated API spamming while ensuring high-priority emergency alerts are analyzed immediately.

---

## 💬 2. Farmer Interactive Q&A Chat (PRD Section 7)

Farmers can click **"Ask Gemini"** to open the interactive slide-out chat drawer. Every query is answered with the farmer's live sensor data and cultured fish species in prompt context.

### Built-in Quick Questions:
- *"What should I do now?"*
- *"Why is my pH high?"*
- *"Is this temperature suitable for my fish?"*
- *"What should I check when turbidity is high?"*
- *"Why are my fish not feeding normally?"*
- *"How often should I monitor the water?"*
- *"Explain this alert in simple language."*

---

## 🐟 3. Species-Specific Tolerances (PRD Section 8)

The farmer can select the cultured fish species in the dashboard:
- **Tilapia**: Temp 26–32°C | pH 6.5–8.5 | Turbidity < 50 NTU
- **Rohu (Labeo rohita)**: Temp 25–31°C | pH 7.0–8.5 | Turbidity < 35 NTU
- **Catla (Gibelion catla)**: Temp 25–32°C | pH 7.2–8.5 | Turbidity < 40 NTU
- **Mrigal (Cirrhinus mrigala)**: Temp 24–32°C | pH 7.0–8.5 | Turbidity < 45 NTU
- **Common Carp**: Temp 20–28°C | pH 6.8–8.2 | Turbidity < 50 NTU
- **Other**: Standard freshwater aquaculture guidelines

---

## 🧪 4. Built-in Pond Simulator & Testing

No physical hardware connected yet? Click **"Test Scenarios"** in the top navigation to activate the built-in simulator:
1. **Normal Optimal Pond**: 28.5°C, pH 7.25, 32 NTU
2. **Low pH Alert**: 27.8°C, pH 6.10 (Acid rain/runoff)
3. **High Turbidity**: 26.5°C, pH 7.15, 96 NTU (Muddy runoff)
4. **Summer Heatwave**: 34.2°C, pH 7.80, 52 NTU (Thermal stress)
5. **Algal Bloom**: 30.5°C, pH 9.15, 58 NTU (Midday pH spike)
6. **Sensor Probe Fault**: Temp null (Tests `SENSOR_ERROR` handling)
7. **Live Real-time Drift**: Simulates natural environmental pond drift every 2.5 seconds.

---

## 📡 5. ESP32 Firmware & Web Bluetooth (PRD Sections 17 & 18)

- **Firmware Location**: `firmware/AquaSentinel_ESP32/AquaSentinel_ESP32.ino`
- **Detailed Pinout & Wiring Guide**: See [`firmware/README.md`](firmware/README.md)
- **Web Bluetooth**: Connects directly from Google Chrome or Microsoft Edge to the ESP32 without requiring mobile companion apps.
- **Hardware Requirement Note (PRD Section 18)**:
  - ESP8266 does not have native BLE. Direct Web Bluetooth requires an **ESP32** (recommended).
  - If using ESP8266, connect an external BLE module (HM-10) or stream telemetry over Wi-Fi directly to `POST /api/ai/fish-advice`.

---

## 🛡️ 6. Gemini Safety & Decision Support Rules (PRD Section 10)

- **Decision Support Only**: AI suggestions explicitly supplement, rather than replace, local aquaculture extension professionals and veterinarians.
- **Conservative Actions**: Avoids recommending sudden chemical shocks (e.g. mass liming or rapid acid dosing) which induce osmotic shock in fish.
- **No Hallucinations**: Grounded purely in received telemetry; missing or errored readings are explicitly reported as unavailable.
- **No Disease Diagnosis**: Does not declare confirmed fish pathology from water-quality numbers alone.

---

## 📂 Project Structure

```
AquaFarm/
├── backend/
│   ├── prompts/
│   │   └── fishCulturePrompt.js    # System instructions & species envelopes
│   ├── routes/
│   │   └── ai.js                   # /api/ai routes (advice, chat, history)
│   ├── services/
│   │   └── geminiService.js        # @google/genai SDK & rule-based engine
│   ├── test-api.js                 # Automated backend test suite
│   ├── server.js                   # Express server entry point
│   ├── .env.example                # Environment variables template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx                 # Status, BLE connection, controls
│   │   │   ├── SensorCard.tsx             # Temp, pH, Turbidity metric cards
│   │   │   ├── OverallStatusCard.tsx      # System health & buzzer banner
│   │   │   ├── GeminiAssistantCard.tsx    # 🤖 AI recommendation card
│   │   │   ├── WaterQualityChart.tsx      # Recharts live time-series
│   │   │   ├── AiChatDrawer.tsx           # Interactive farmer Q&A drawer
│   │   │   ├── FarmProfileModal.tsx       # Species & pond config modal
│   │   │   ├── AiHistoryTable.tsx         # Audit log of past AI guidance
│   │   │   ├── SimulatorPanel.tsx         # Scenario testing & manual sliders
│   │   │   └── RecommendationDetailModal.tsx # Raw JSON & telemetry inspect
│   │   ├── services/
│   │   │   ├── api.ts                     # Backend REST API client
│   │   │   ├── bleService.ts              # Web Bluetooth API GATT client
│   │   │   └── sensorSimulator.ts         # Preset scenarios & drift engine
│   │   ├── types/
│   │   │   └── index.ts                   # Unified TypeScript definitions
│   │   ├── App.tsx                        # Main application orchestrator
│   │   └── index.css                      # Tailwind CSS v4 styling
│   ├── vite.config.ts                     # Vite + Tailwind + API proxy
│   └── package.json
│
├── firmware/
│   ├── AquaSentinel_ESP32/
│   │   └── AquaSentinel_ESP32.ino         # Full ESP32 BLE GATT firmware
│   └── README.md                          # Pinouts, calibration & schematics
│
├── package.json                           # Root unified workspace runner
└── README.md
```
