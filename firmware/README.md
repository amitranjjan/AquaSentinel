# AquaSentinel Hardware & Firmware Guide

AquaSentinel supports two hardware configurations:
1. **ESP32 (Native BLE)** — Recommended, uses built-in Bluetooth Low Energy.
2. **ESP8266 + HM-10 (BLE Bridge)** — Uses external HM-10 / AT-09 BLE module via SoftwareSerial.

---

## 1. ESP32 Architecture & Setup (Native BLE)

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
                               (Web Bluetooth in Chrome/Edge)
                                          |
                                          v
                                Backend (Express + Gemini)
```

### Pinout Table (ESP32)

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

## 2. ESP8266 + HM-10 Setup (External BLE UART Bridge)

Since the ESP8266 only has Wi-Fi and lacks built-in Bluetooth, an external **HM-10 (or AT-09 / CC2541 / MLT-BT05)** BLE module is connected to the ESP8266 via SoftwareSerial.

```
                      +---------------------------------------+
                      |       AquaSentinel ESP8266            |
                      |                                       |
  [DS18B20 Temp] ---->| D2 (GPIO 4) (1-Wire + 4.7k Pullup)    |
                      |                                       |
  [Analog Sensor] --->| A0 (Analog ADC input)                 |
                      |                                       |
  [Piezo Buzzer] <----| D1 (GPIO 5) (Alert Output)            |
                      |                                       |
  [Status LED]   <----| D4 (GPIO 2) (Active LOW Onboard LED)  |
                      |                                       |
                      | D5 (GPIO 14) RX <--- TXD  [ HM-10   ] |
                      | D6 (GPIO 12) TX ---> RXD  [ BLE 4.0 ] |
                      +---------------------------------------+
                                          |
                                          | (20-byte BLE Packets)
                                          v
                              AquaSentinel Web Dashboard
                               (Web Bluetooth in Chrome/Edge)
```

### Wiring Table (ESP8266 to HM-10)

| HM-10 Pin | ESP8266 Pin | Notes |
|---|---|---|
| **VCC** | 5V (or 3V3) | Power supply |
| **GND** | GND | Common ground |
| **TXD** | **D5 (GPIO 14)** | SoftwareSerial RX on ESP8266 |
| **RXD** | **D6 (GPIO 12)** | SoftwareSerial TX on ESP8266 (3.3V logic matches HM-10) |

### How the ESP8266 + HM-10 Communication Works

1. **HM-10 GATT Service**: The HM-10 module exposes standard UUID `0000ffe0-0000-1000-8000-00805f9b34fb` and Characteristic `0000ffe1-0000-1000-8000-00805f9b34fb`.
2. **20-byte MTU Chunking**: BLE notifications are capped at 20 bytes per transmission. When the ESP8266 sends a 150-byte JSON line ending in `\n`, the HM-10 automatically breaks it into consecutive 20-byte chunks.
3. **Frontend Reassembly**: The AquaSentinel web dashboard accumulates all received chunks in a text buffer. Once a `\n` character is detected, the full JSON line is sliced out and safely parsed with `JSON.parse`.

---

## 3. BLE GATT Specifications

* **Custom Service UUID**: `0000ffe0-0000-1000-8000-00805f9b34fb`
* **Sensor Characteristic UUID**: `0000ffe1-0000-1000-8000-00805f9b34fb` (Properties: `READ`, `NOTIFY`)
* **Payload Format**: Stringified JSON line terminated with `\n`, updated every 2 seconds:
  ```json
  {"temperature":29.25,"ph":6.95,"turbidity":55.6,"temperatureStatus":"NORMAL","phStatus":"NORMAL","turbidityStatus":"NORMAL","overallStatus":"NORMAL","buzzer":0}
  ```

---

## 4. Arduino IDE Setup & Libraries

### For ESP32:
1. Sketch: `firmware/AquaSentinel_ESP32/AquaSentinel_ESP32.ino`
2. Libraries: `OneWire`, `DallasTemperature`, `ESP32 BLE Arduino` (built into ESP32 board support).
3. Board: `DOIT ESP32 DEVKIT V1` or `ESP32 Dev Module`.

### For ESP8266 + HM-10:
1. Sketch: `firmware/AquaSentinel_ESP8266/AquaSentinel_ESP8266.ino`
2. Libraries: `OneWire`, `DallasTemperature`, `SoftwareSerial` (built into ESP8266 board support).
3. Board: `NodeMCU 1.0 (ESP-12E Module)` or `LOLIN(WEMOS) D1 R2 & mini`.
4. HM-10 Default Baud: `9600`.

---

## 5. Sensor Calibration

### pH Sensor Calibration
1. Rinse the pH probe in distilled water.
2. Dip the probe into standard pH 7.0 buffer solution.
3. Observe voltage printed in Serial Monitor. Adjust the onboard potentiometer on the pH board until output voltage is approximately 2.5V.
4. Update `PH_OFFSET` and `PH_SLOPE` in the `.ino` sketch if using 2-point calibration (pH 4.0 and pH 7.0).

### Turbidity Calibration
1. Submerge optical probe into pure distilled water (0 NTU).
2. Read the voltage (typically around 3.2V to 4.1V depending on sensor manufacturer).
3. Set the clean water reference voltage in code.
