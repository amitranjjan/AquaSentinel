# 🐟 AquaSentinel — Water Quality + Gemini Fish-Culture Assistant

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Author: Amit Ranjan](https://img.shields.io/badge/Owner-Amit%20Ranjan-cyan.svg)](https://github.com/)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg?logo=node.js)](https://nodejs.org/)
[![Google Gemini API](https://img.shields.io/badge/Google%20Gemini-3.8%20Flash-8e75ff.svg?logo=google)](https://aistudio.google.com/)
[![ESP32 BLE](https://img.shields.io/badge/ESP32-Bluetooth%20LE-red.svg?logo=espressif)](https://www.espressif.com/)

> **AquaSentinel** is an intelligent, end-to-end IoT water-quality telemetry and decision-support system engineered specifically for aquaculture fish farmers. It couples real-time physical sensing (**Water Temperature**, **pH**, and **Turbidity**) with the **Google Gemini API** (`gemini-3.8-flash`) to bridge the gap between raw numbers and practical, farmer-friendly management advice.

**Project Owner & Lead Developer:** **Amit Ranjan**

---

## 📑 Table of Contents
- [1. Product Overview](#-1-product-overview)
- [2. System Architecture](#-2-system-architecture)
- [3. Key Features](#-3-key-features)
- [4. Mandatory BLE Hardware Requirement](#-4-mandatory-ble-hardware-requirement)
- [5. Gemini AI Fish-Culture Assistant](#-5-gemini-ai-fish-culture-assistant)
- [6. Species-Specific Tolerances](#-6-species-specific-tolerances)
- [7. Hardware Pinout & Wiring](#-7-hardware-pinout--wiring)
- [8. REST API Specification](#-8-rest-api-specification)
- [9. Quick Start Guide](#-9-quick-start-guide)
- [10. Pushing to GitHub](#-10-pushing-to-github)
- [11. Safety & Decision Support Guardrails](#-11-safety--decision-support-guardrails)
- [12. Author & License](#-12-author--license)

---

## 🌟 1. Product Overview

In aquaculture, sudden fluctuations in water chemistry (such as acid runoff after heavy rainfall, midday algal bloom pH spikes, or mud siltation) can stress fish stocks, suppress feeding, or trigger mass mortality before farm hands notice physical distress.

AquaSentinel implements the complete **"Measure → Detect → Alert → Explain → Suggest Next Action"** loop:
- **Measure**: Continually samples pond temperature, pH, and optical turbidity via an ESP32 node.
- **Detect**: Classifies telemetry against species-specific comfort boundaries.
- **Alert**: Triggers physical buzzer alarms and audio-visual dashboard indicators.
- **Explain**: Grounds Gemini 3.8 Flash in live readings to explain the root diagnostic cause.
- **Suggest**: Delivers clear, numbered, conservative steps an everyday farmer can execute safely.

---

## 🌊 2. System Architecture

```
+-----------------------------------------------------------------------------------+
|                            POND / TANK SENSORS                                    |
|   - DS18B20 Waterproof Temperature Sensor (1-Wire GPIO 4)                        |
|   - Analog pH Probe & Signal Board (ADC1 GPIO 34)                                 |
|   - Optical Turbidity Sensor (ADC1 GPIO 35)                                       |
|   - Piezo Alert Buzzer (GPIO 23)                                                  |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                        ESP32 IoT NODE (BLE GATT SERVER)                           |
|   - Service UUID:        0000ffe0-0000-1000-8000-00805f9b34fb                     |
|   - Characteristic UUID: 0000ffe1-0000-1000-8000-00805f9b34fb (Notify)           |
|   - Periodically broadcasts structured JSON sensor payload every 2 seconds        |
+-----------------------------------------------------------------------------------+
                                         │
                                         │ (Web Bluetooth API in Chrome/Edge)
                                         ▼
+-----------------------------------------------------------------------------------+
|                    AQUASENTINEL WEB DASHBOARD (REACT + VITE)                      |
|   - Live Sensor Metric Cards (Temperature, pH, Turbidity, Overall Status)         |
|   - 🤖 Gemini Fish-Culture Assistant Card                                         |
|   - Interactive Recharts Time-Series Analytics                                    |
|   - Telemetry-Grounded Farmer Q&A Chat Drawer                                     |
|   - Farm Profile & Species Selector (Tilapia, Rohu, Catla, Mrigal, Carp)          |
|   - AI Recommendation History Log                                                 |
|   - Standby Mode when BLE is disconnected                                         |
+-----------------------------------------------------------------------------------+
                                         │
                                         │ (HTTP / JSON via API Proxy)
                                         ▼
+-----------------------------------------------------------------------------------+
|                     AQUASENTINEL BACKEND API (EXPRESS + NODE.JS)                  |
|   - Alert Cooldown & Condition Fingerprint Engine                                 |
|   - Secure Server-Side Gemini API Key Management                                  |
|   - Local Aquaculture Rule Engine Fallback                                        |
|   - REST Endpoints (/api/ai/fish-advice, /api/ai/chat, /api/ai/history)           |
+-----------------------------------------------------------------------------------+
                                         │
                                         │ (@google/genai SDK v2.24+)
                                         ▼
+-----------------------------------------------------------------------------------+
|                           GOOGLE GEMINI API                                       |
|   - Model: gemini-3.8-flash                                                       |
|   - Structured JSON Schema Output                                                 |
|   - Aquaculture Guardrails & Safety Filtering                                     |
+-----------------------------------------------------------------------------------+
```

---

## ⚡ 3. Key Features

1. **Strict BLE-Gated Operation**: Web monitoring operates only when paired with the physical ESP32 device via Bluetooth Low Energy. If disconnected, the dashboard enters a clean Standby mode.
2. **🤖 Gemini Fish-Culture Assistant**: Translates raw readings into plain-language situation summaries, step-by-step checklists, parameters to monitor, and an urgency rating.
3. **Automatic Alert Analysis with Cooldown**: Automatically queries Gemini when water anomalies occur (low/high pH, turbidity spike, thermal stress, probe error) with a 45s cooldown to prevent API spamming.
4. **Context-Aware Farmer Chat**: Interactive slide-out chat drawer where farmers can ask questions (*"Why is my pH high?"*, *"What should I check when turbidity rises?"*). Gemini answers grounded in the farm's live sensor readings.
5. **Species-Aware Tolerances**: Dynamically recalculates acceptable water quality envelopes based on cultured species (**Tilapia**, **Rohu**, **Catla**, **Mrigal**, **Common Carp**, or general freshwater fish).
6. **Auditable Recommendation History**: Searchable, exportable table showing past conditions, AI recommendations, urgency, and timestamps.
7. **Built-in Pond Simulator**: Includes 1-click test scenarios (*Optimal Pond*, *Low pH Runoff*, *Heavy Mud / Turbidity Spike*, *Heatwave*, *Algal Bloom*, and *Probe Error*) plus live ecological drift for bench testing.
8. **Double-Buffered Fallback**: If `GEMINI_API_KEY` is not configured, AquaSentinel's internal expert rule engine provides deterministic aquaculture guidance offline.

---

## 🔒 4. Mandatory BLE Hardware Requirement

The web application is intentionally designed to **operate in real time only when paired with the AquaSentinel ESP32 node via Bluetooth Low Energy (BLE)**:
- **Default State**: Starts in `DISCONNECTED` standby mode. Metric cards display `-- (Awaiting BLE)`.
- **Pairing**: Clicking **`Connect AquaSentinel BLE Device`** invokes the native Web Bluetooth API (`navigator.bluetooth.requestDevice`), connecting to `AquaSentinel-ESP32`.
- **Streaming**: Once paired, live telemetry packets arrive every 2 seconds and unlock the dashboard.
- **Disconnect Handling**: If the node is powered off or goes out of range, the web dashboard immediately locks back into standby mode to prevent stale telemetry.

---

## 🤖 5. Gemini AI Fish-Culture Assistant

### Telemetry Sent to Gemini:
```json
{
  "waterQuality": {
    "temperature": 29.25,
    "ph": 6.95,
    "turbidity": 55.6
  },
  "status": {
    "temperature": "NORMAL",
    "ph": "NORMAL",
    "turbidity": "NORMAL",
    "overall": "NORMAL",
    "buzzer": false
  },
  "farm": {
    "fishSpecies": "Tilapia",
    "cultureType": "Pond",
    "pondName": "Primary Pond",
    "pondSize": "1000 m2",
    "fishAge": "3 months",
    "approxStock": "5000"
  }
}
```

### Structured Output from Gemini (PRD Section 4):
```json
{
  "status": "ATTENTION",
  "summary": "Water conditions need monitoring because pH is slightly below the preferred optimal range.",
  "whatToDoNow": [
    "Check the pH reading again after a 20-minute interval.",
    "Observe fish swimming posture and check for surface piping at dawn.",
    "Avoid sudden chemical treatments or water exchange until readings stabilize."
  ],
  "monitor": ["pH", "temperature", "turbidity"],
  "urgency": "MEDIUM",
  "reason": "pH (6.95) is drifting below the preferred optimal window (7.0 - 8.0) for Tilapia in a pond environment."
}
```

---

## 🐟 6. Species-Specific Tolerances

| Species | Scientific Name | Optimal Temp | Optimal pH | Optimal Turbidity | Key Aquaculture Characteristics |
|---|---|---|---|---|---|
| **Tilapia** | *Oreochromis niloticus* | 26 – 32 °C | 6.5 – 8.5 | < 50 NTU | Highly hardy warmwater fish; vulnerable below 20 °C. |
| **Rohu** | *Labeo rohita* | 25 – 31 °C | 7.0 – 8.5 | < 35 NTU | Major Indian carp; column feeder sensitive to acidic pH (< 6.5). |
| **Catla** | *Gibelion catla* | 25 – 32 °C | 7.2 – 8.5 | < 40 NTU | Surface feeder; fast-growing with high dissolved oxygen demand. |
| **Mrigal** | *Cirrhinus mrigala* | 24 – 32 °C | 7.0 – 8.5 | < 45 NTU | Bottom feeder; sensitive to anaerobic pond bottom sludge. |
| **Common Carp**| *Cyprinus carpio* | 20 – 28 °C | 6.8 – 8.2 | < 50 NTU | Tolerates cooler temperatures down to 18 °C. |
| **Other** | Freshwater Species | 24 – 30 °C | 6.5 – 8.5 | < 50 NTU | Standard freshwater tropical aquaculture guidelines. |

---

## 🔌 7. Hardware Pinout & Wiring

| Component | Sensor Pin | ESP32 Pin | Voltage | Notes |
|---|---|---|---|---|
| **DS18B20 Temp** | VCC / GND / DATA | **GPIO 4** | 3.3V | Requires 4.7 kΩ pull-up resistor between DATA & 3.3V |
| **Analog pH Probe** | VCC / GND / Signal | **GPIO 34** | 3.3V (ADC1) | Mapped to ADC1 for uninterrupted conversion during BLE |
| **Turbidity Sensor**| VCC / GND / Signal | **GPIO 35** | 3.3V (ADC1) | Mapped to ADC1 for uninterrupted conversion during BLE |
| **Piezo Buzzer** | (+) / (-) | **GPIO 23** | 3.3V | Local alert siren |
| **Status LED** | Anode (+) | **GPIO 2** | 3.3V | Onboard LED indicates BLE connection state |

> **CRITICAL ADC NOTE**: ESP32 ADC2 channels cannot be sampled while Bluetooth or Wi-Fi is active. AquaSentinel maps both pH and Turbidity analog outputs strictly to **ADC1 (GPIO 34 and GPIO 35)** to guarantee 100% glitch-free analog reads.

*Hardware firmware code is located in [`firmware/AquaSentinel_ESP32/AquaSentinel_ESP32.ino`](firmware/AquaSentinel_ESP32/AquaSentinel_ESP32.ino).*

---

## 📡 8. REST API Specification

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ai/fish-advice` | Evaluates telemetry with Gemini 3.8 Flash, applies cooldown & condition caching. |
| `POST` | `/api/ai/chat` | Interactive farmer Q&A grounded in live sensor data and farm context. |
| `GET` | `/api/ai/history` | Retrieves logged AI recommendations (most recent first). |
| `DELETE` | `/api/ai/history` | Clears recommendation history. |
| `GET` | `/api/ai/species-profiles` | Returns species tolerance presets. |
| `GET` | `/api/health` | Service status and Gemini API key health. |

---

## 🚀 9. Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+ or v20+
- **npm** v9+
- A modern browser with **Web Bluetooth API** (Google Chrome, Microsoft Edge, or Opera)
- (Optional) A **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/)

### 2. Installation
Clone the repository and install all dependencies:
```bash
git clone https://github.com/amitr/AquaSentinel.git
cd AquaSentinel
npm run install:all
```

### 3. Configure Gemini API Key
Create your `backend/.env` file:
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env` and paste your Gemini API key:
```env
PORT=5000
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
```

### 4. Start the Application
Run both backend and frontend concurrently:
```bash
npm run dev
```

- **Web Dashboard**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`

---

## 📤 10. Pushing to GitHub

Follow these steps to push your local AquaSentinel codebase to your GitHub repository:

### Step 1: Create a New Repository on GitHub
1. Go to [github.com/new](https://github.com/new).
2. Set the repository name to `AquaSentinel` (or your preferred name).
3. Choose **Public** or **Private**.
4. Leave "Add a README file", ".gitignore", and "license" unchecked (we already have them configured).
5. Click **Create repository**.

### Step 2: Push Local Code to GitHub
Run the following commands in your terminal from the project folder:

```bash
# 1. Initialize git (if not already done)
git init

# 2. Stage all project files (.env and node_modules are automatically ignored)
git add .

# 3. Commit your changes
git commit -m "feat: complete AquaSentinel IoT water quality & Gemini assistant system"

# 4. Set the default branch to main
git branch -M main

# 5. Link your GitHub remote repository (replace with your actual GitHub URL)
git remote add origin https://github.com/<your-username>/AquaSentinel.git

# 6. Push to GitHub
git push -u origin main
```

---

## 🛡️ 11. Safety & Decision Support Guardrails

1. **Decision Support Only**: AI suggestions are formulated as conservative advisory guidance and explicitly state they do not replace a qualified veterinary or fisheries extension officer.
2. **Zero Chemical Shocks**: Gemini is constrained against recommending sudden lime dumping or acid treatments that cause osmotic trauma in cultured fish.
3. **Probe Fault Transparency**: If a sensor reports `SENSOR_ERROR` or disconnects, the system instructs probe inspection rather than guessing values.
4. **No Unsubstantiated Pathology**: The system does not diagnose clinical fish diseases from water-quality metrics alone.

---

## 👤 12. Author & License

- **Project Owner & Creator**: **Amit Ranjan**
- **Architecture**: IoT + Web Bluetooth + Google Gemini GenAI
- **License**: Released under the [MIT License](LICENSE).
