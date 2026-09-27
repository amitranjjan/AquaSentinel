# AquaSentinel Hardware & Firmware Guide

## 1. Hardware Architecture Overview

```
                      +---------------------------------------+
                      |         AquaSentinel ESP32            |
                      |                                       |
  [DS18B20 Temp] ---->| GPIO 4  (1-Wire Bus + 4.7k Pullup)     |
                      |                                       |
  [Analog pH Probe] ->| GPIO 34 (ADC1_CH6 Analog In)          |
                      |                                       |
  [Turbidity Sensor]->| GPIO 35 (ADC1_CH7 Analog In)          |
                      |                                       |
  [Piezo Buzzer] <----| GPIO 23 (PWM/Digital Alert Out)       |
                      |                                       |
  [Status LED]   <----| GPIO 2  (Connection Indicator)        |
                      |                                       |
                      | [Built-in BLE 4.2 GATT Server]        |
                      +---------------------------------------+
                                          |
                                          | (BLE GATT Notifications)
                                          v
                              AquaSentinel Web Dashboard
                               (Web Bluetooth API in Chrome/Edge)
                                          |
                                          v
                                Backend (Express + Gemini)
```

---

## 2. Pinout & Connection Table

| Sensor / Actuator | Sensor Pin | ESP32 Pin | Voltage | Notes |
|---|---|---|---|---|
| **DS18B20 Temp** | VCC (Red) | 3V3 / 5V | 3.3V or 5V | Waterproof digital probe |
| | GND (Black) | GND | 0V | |
| | DATA (Yellow/Blue) | **GPIO 4** | 3.3V | Requires **4.7 kΩ pull-up resistor** to 3.3V |
| **Analog pH Sensor** | VCC | 5V / 3.3V | 5V (or 3.3V) | Signal board output |
| | GND | GND | 0V | Common ground |
| | Analog Signal (Po) | **GPIO 34** | 0 - 3.3V | Connected to ADC1 (safe with WiFi/BLE) |
| **Turbidity Sensor** | VCC | 5V | 5V | Optical transmitter & receiver |
| | GND | GND | 0V | Common ground |
| | Analog Signal (Aout)| **GPIO 35** | 0 - 3.3V | Connected to ADC1 (safe with WiFi/BLE) |
| **Alert Buzzer** | Positive (+) | **GPIO 23** | 3.3V / 5V | Active or passive buzzer |
| | Negative (-) | GND | 0V | |
| **BLE Status LED** | Anode (+) | **GPIO 2** | 3.3V | Onboard Blue LED on most ESP32 boards |

> **IMPORTANT ADC NOTE**: ESP32 ADC2 pins (GPIO 0, 2, 4, 12, 13, 14, 15, 25, 26, 27) cannot be used while WiFi or Bluetooth is active. For this reason, the pH and Turbidity analog outputs are intentionally mapped to **ADC1 pins (GPIO 34 and GPIO 35)**, guaranteeing 100% reliable analog conversion while BLE is transmitting.

---

## 3. BLE GATT Specifications

* **Device Name advertised**: `AquaSentinel-ESP32`
* **Custom Service UUID**: `0000ffe0-0000-1000-8000-00805f9b34fb`
* **Sensor Characteristic UUID**: `0000ffe1-0000-1000-8000-00805f9b34fb` (Properties: `READ`, `NOTIFY`)
* **Payload Format**: Stringified JSON, updated every 2 seconds:
  ```json
  {
    "temperature": 29.25,
    "ph": 6.95,
    "turbidity": 55.6,
    "temperatureStatus": "NORMAL",
    "phStatus": "NORMAL",
    "turbidityStatus": "NORMAL",
    "overallStatus": "NORMAL",
    "buzzer": false
  }
  ```

---

## 4. Arduino IDE Setup & Required Libraries

1. Open Arduino IDE (v2.x or 1.8.x).
2. Go to **File -> Preferences**, and add the ESP32 Board Manager URL:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Go to **Tools -> Board -> Boards Manager**, search for `esp32` by Espressif Systems and install it.
4. Install the following libraries via **Sketch -> Include Library -> Manage Libraries**:
   - `OneWire` by Paul Stoffregen
   - `DallasTemperature` by Miles Burton
   - `ESP32 BLE Arduino` (bundled standard with ESP32 board package)
5. Select board: `DOIT ESP32 DEVKIT V1` or `ESP32 Dev Module`.
6. Select the correct COM port and click **Upload**.

---

## 5. Sensor Calibration

### pH Sensor Calibration
1. Rinse the pH probe in distilled water.
2. Dip the probe into standard pH 7.0 buffer solution.
3. Observe voltage printed in Serial Monitor. Adjust the onboard potentiometer on the pH board until output voltage is approximately 2.5V.
4. Update `PH_OFFSET` and `PH_SLOPE` in `AquaSentinel_ESP32.ino` if using 2-point calibration (pH 4.0 and pH 7.0).

### Turbidity Calibration
1. Submerge optical probe into pure distilled water (0 NTU).
2. Read the voltage (typically around 3.2V to 4.1V depending on sensor manufacturer).
3. Set the clean water reference voltage in code.

---

## 6. PRD Note on ESP8266 vs ESP32 (Section 18)

As highlighted in **PRD Section 18**:
* **NodeMCU ESP8266** has only Wi-Fi and **does not have built-in Bluetooth Low Energy (BLE)**. Direct connection to Web Bluetooth from ESP8266 is impossible without an external BLE module (e.g. HM-10 connected via UART).
* **ESP32** features integrated BLE 4.2 / 5.0 alongside dual-core 240MHz processing and multiple ADC channels. It is the official and recommended hardware for AquaSentinel.
* If you must use ESP8266, you can either:
  1. Add an HM-10 / AT-09 BLE module on SoftwareSerial (TX/RX), OR
  2. Send sensor data over Wi-Fi directly to `POST http://<server-ip>:5000/api/ai/fish-advice`.
