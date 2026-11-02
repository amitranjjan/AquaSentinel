# AquaSentinel Hardware & Firmware Guide

AquaSentinel supports three hardware configurations:
1. **Arduino Uno + HM-10 BLE + 2 Relays (Current Multi-Sensor Setup)** — DHT11, DS18B20, pH, Turbidity, 2 Relays, 2 Pumps.
2. **ESP32 (Native BLE)** — Recommended for compact builds with built-in Bluetooth Low Energy.
3. **ESP8266 + HM-10 (BLE Bridge)** — Uses external HM-10 / AT-09 BLE module via SoftwareSerial.

---

## 1. Arduino Uno Setup (DHT11, DS18B20, pH, Turbidity, 2 Relays & 2 Pumps)

This configuration turns your **Arduino Uno** into an automated telemetry station and pump actuator node that connects directly to the AquaSentinel web dashboard over Web Bluetooth.

### System Diagram

```
                              +---------------------------------------+
                              |          Arduino Uno (5V)             |
                              |                                       |
  [DS18B20 Water Temp] ------>| Pin 4  (1-Wire Bus + 4.7k Pullup)     |
                              |                                       |
  [DHT11 Air Temp & Hum] ---->| Pin 5  (Digital 1-Wire Data)          |
                              |                                       |
  [Analog pH Probe] --------->| Pin A0 (Analog 0-5V Input)            |
                              |                                       |
  [Turbidity Optical Probe] ->| Pin A1 (Analog 0-5V Input)            |
                              |                                       |
  [HM-10 BLE Module TX] ----->| Pin 2  (SoftwareSerial RX)            |
  [HM-10 BLE Module RX] <-----| Pin 3  (SoftwareSerial TX)            |
                              |                                       |
  [Dual Relay Module IN1] <---| Pin 7  (Relay 1: Pump 1 Aerator)      |
  [Dual Relay Module IN2] <---| Pin 8  (Relay 2: Pump 2 Fresh Water)  |
                              |                                       |
  [Optional Alert Buzzer] <---| Pin 6  (Digital Alert Tone)           |
                              +---------------------------------------+
                                                  │
                                                  │ (20-byte BLE Packets)
                                                  ▼
                                      AquaSentinel Web Dashboard
                                       (Chrome / Edge Web Bluetooth)
                                                  │
                                                  ▼
                                        Google Gemini 3.8 Flash
```

### Complete Arduino Uno Pinout & Wiring Table

| Component | Component Pin | Arduino Uno Pin | Power | Notes |
|---|---|---|---|---|
| **DS18B20 Water Temp** | VCC (Red) | 5V | 5V | Digital waterproof probe |
| | GND (Black) | GND | 0V | Common Ground |
| | DATA (Yellow/Blue)| **Pin 4** | 5V | Requires **4.7 kΩ pull-up resistor** to 5V |
| **DHT11 (Air & Hum)** | VCC (+) | 5V | 5V | Ambient temperature & relative humidity |
| | GND (-) | GND | 0V | Common Ground |
| | DATA (Out) | **Pin 5** | 5V | Connect directly to Pin 5 |
| **Analog pH Sensor** | VCC | 5V | 5V | Signal conditioning board |
| | GND | GND | 0V | Common Ground |
| | Aout (Po) | **Pin A0** | 0 - 5V | Analog input |
| **Turbidity Sensor** | VCC | 5V | 5V | Optical transmitter/receiver board |
| | GND | GND | 0V | Common Ground |
| | Aout | **Pin A1** | 0 - 5V | Analog input |
| **HM-10 BLE Module** | VCC | 5V (or 3.3V) | 5V | Bluetooth 4.0 LE UART Bridge |
| | GND | GND | 0V | Common Ground |
| | TXD | **Pin 2 (RX)** | 3.3V/5V | Uno listens on Pin 2 |
| | RXD | **Pin 3 (TX)** | 3.3V/5V | Uno sends on Pin 3 |
| **2-Channel Relay** | VCC | 5V | 5V | Relay coil power |
| | GND | GND | 0V | Common Ground |
| | IN1 | **Pin 7** | 5V | Controls **Pump 1 (Aerator / Circulation)** |
| | IN2 | **Pin 8** | 5V | Controls **Pump 2 (Freshwater Flushing)** |
| **Alert Buzzer** | (+) | **Pin 6** | 5V | Sounds during `DANGER` alert |
| | (-) | GND | 0V | Common Ground |

---

### Pump & Relay Electrical Safety

> [!CAUTION]
> **DO NOT power the two pumps directly from the Arduino Uno's 5V pin!** 
> Pumps are inductive electric motors that draw high current spikes and produce reverse-EMF voltage surges that can reset or permanently damage your Arduino board.
>
> 1. Power the Arduino Uno via standard USB cable (5V).
> 2. Power your two 5V or 12V DC pumps from an **external separate power adapter** (e.g. 12V 2A DC adapter).
> 3. Route only the **Positive (+)** wire of each pump through the **Common (COM)** and **Normally Open (NO)** terminals of the relay module.

---

### Remote BLE Commands (Dashboard to Arduino)

The web dashboard and automated threshold engine can send single-line commands to the Arduino Uno:
* `P1_ON` — Manually turns ON Pump 1 (Aerator).
* `P1_OFF` — Manually turns OFF Pump 1 (Aerator).
* `P2_ON` — Manually turns ON Pump 2 (Freshwater).
* `P2_OFF` — Manually turns OFF Pump 2 (Freshwater).
* `AUTO_ON` — Re-enables automated sensor threshold control.
* `AUTO_OFF` — Disables automatic triggers.

---

## 2. ESP32 Architecture & Setup (Native BLE)

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
```

---

## 3. ESP8266 + HM-10 Setup (External BLE UART Bridge)

| HM-10 Pin | ESP8266 Pin | Notes |
|---|---|---|
| **VCC** | 5V (or 3V3) | Power supply |
| **GND** | GND | Common ground |
| **TXD** | **D5 (GPIO 14)** | SoftwareSerial RX on ESP8266 |
| **RXD** | **D6 (GPIO 12)** | SoftwareSerial TX on ESP8266 |

---

## 4. Arduino IDE Setup & Libraries

### For Arduino Uno:
1. Sketch: `firmware/AquaSentinel_ArduinoUno/AquaSentinel_ArduinoUno.ino`
2. Board: **Tools -> Board -> Arduino AVR Boards -> Arduino Uno**
3. Libraries to install via **Sketch -> Include Library -> Manage Libraries**:
   - `DHT sensor library` by Adafruit
   - `Adafruit Unified Sensor` by Adafruit
   - `OneWire` by Paul Stoffregen
   - `DallasTemperature` by Miles Burton
   - `SoftwareSerial` (comes pre-installed with Arduino AVR Core)
4. Select your COM Port and click **Upload**.

### For ESP32:
1. Sketch: `firmware/AquaSentinel_ESP32/AquaSentinel_ESP32.ino`
2. Board: `DOIT ESP32 DEVKIT V1`

### For ESP8266:
1. Sketch: `firmware/AquaSentinel_ESP8266/AquaSentinel_ESP8266.ino`
2. Board: `NodeMCU 1.0 (ESP-12E Module)`
