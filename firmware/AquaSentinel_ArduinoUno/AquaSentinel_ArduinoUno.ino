/*
 * AquaSentinel — Arduino Uno Aquaculture Telemetry & Automation Controller
 * 
 * Hardware Setup:
 *  - Microcontroller: Arduino Uno (ATmega328P, 5V Logic)
 *  - Air Temp & Humidity: DHT11 Sensor (Digital Pin 5)
 *  - Water Temperature: DS18B20 Waterproof Probe (Digital Pin 4, 1-Wire + 4.7k pull-up)
 *  - Analog pH Sensor: Glass Probe + Signal Board (Analog Pin A0)
 *  - Analog Turbidity Sensor: Optical Sensor Board (Analog Pin A1)
 *  - Bluetooth Module: HC-05 (or HM-10/AT-09) Module (SoftwareSerial Pins 2 & 3)
 *      * Arduino Pin 2 (RX) <-- Bluetooth TXD
 *      * Arduino Pin 3 (TX) --> Bluetooth RXD
 *  - 2-Channel Relay Module:
 *      * Relay 1 -> Pump 1 (Aerator / Circulation Pump) on Digital Pin 7
 *      * Relay 2 -> Pump 2 (Freshwater Flushing / Drainage Pump) on Digital Pin 8
 *  - Optional Audio Alert: Active Buzzer on Digital Pin 6
 *
 * Manual & Automated Pump Control:
 *  - Accepts manual commands from Web Dashboard:
 *      "P1_ON"  --> Turns Pump 1 ON (locks manual mode)
 *      "P1_OFF" --> Turns Pump 1 OFF (locks manual mode)
 *      "P2_ON"  --> Turns Pump 2 ON (locks manual mode)
 *      "P2_OFF" --> Turns Pump 2 OFF (locks manual mode)
 *      "AUTO_ON"--> Re-enables automated threshold control
 *      "RELAY_HIGH" / "RELAY_LOW" --> Toggles active-high vs active-low relay logic
 */

#include <SoftwareSerial.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <DHT.h>

// ================= PIN DEFINITIONS =================
#define BLE_RX_PIN       2    // Arduino Pin 2 (RX) <-- Bluetooth TXD
#define BLE_TX_PIN       3    // Arduino Pin 3 (TX) --> Bluetooth RXD
#define DS18B20_PIN      4    // Digital Pin 4 for DS18B20 1-Wire bus
#define DHT_PIN          5    // Digital Pin 5 for DHT11 data
#define BUZZER_PIN       6    // Digital Pin 6 for Alert Buzzer
#define RELAY_PUMP1_PIN  7    // Digital Pin 7 for Relay 1 (Pump 1: Aerator / Circulation)
#define RELAY_PUMP2_PIN  8    // Digital Pin 8 for Relay 2 (Pump 2: Fresh Water / Drain)

#define PH_ANALOG_PIN    A0   // Analog Pin A0 for pH sensor
#define TURB_ANALOG_PIN  A1   // Analog Pin A1 for Turbidity sensor

// Relay polarity configuration (default true for standard active-low relay boards)
bool relayActiveLow = true;

// ================= SENSOR OBJECTS =================
SoftwareSerial bleSerial(BLE_RX_PIN, BLE_TX_PIN); // RX, TX for Bluetooth
OneWire oneWire(DS18B20_PIN);
DallasTemperature waterTempSensor(&oneWire);
DHT dht(DHT_PIN, DHT11);

// ================= THRESHOLDS FOR AQUACULTURE =================
const float WATER_TEMP_MIN = 22.0;
const float WATER_TEMP_MAX = 32.0;
const float PH_MIN = 6.5;
const float PH_MAX = 8.5;
const float TURBIDITY_MAX = 60.0; // NTU above which aerator/filter triggers

// ================= STATE VARIABLES =================
float waterTemp = 27.5;
float airTemp = 29.0;
float humidity = 65.0;
float phValue = 7.2;
float turbidityValue = 25.0;

bool pump1Active = false; // Aerator Pump state
bool pump2Active = false; // Fresh Water Pump state
bool autoControl = false; // Default manual control so farmer has full authority
bool buzzerState = false;

// Command string buffers
String bleCmdBuffer = "";
String usbCmdBuffer = "";

unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 2000; // Broadcast every 2s

// Analog sample smoothing (reduces electrical noise)
float readAverageAnalog(uint8_t pin, uint8_t samples = 10) {
  long sum = 0;
  for (uint8_t i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delay(4);
  }
  return (float)sum / samples;
}

// Convert A0 voltage to pH
float calculatePH(float voltage) {
  // Standard pH sensor formula: pH = 7.0 + ((2.5 - V) * slope)
  float ph = 7.0 + (2.50 - voltage) * 3.5;
  if (ph < 0.0) ph = 0.0;
  if (ph > 14.0) ph = 14.0;
  return ph;
}

// Convert A1 voltage to Turbidity (NTU)
float calculateTurbidity(float voltage) {
  if (voltage >= 4.0) return 10.0;
  if (voltage < 2.5) return 95.0;
  float ntu = 10.0 + (4.0 - voltage) * 56.6;
  if (ntu < 0.0) ntu = 0.0;
  return ntu;
}

void setPump1(bool state) {
  pump1Active = state;
  int pinState = relayActiveLow ? (state ? LOW : HIGH) : (state ? HIGH : LOW);
  digitalWrite(RELAY_PUMP1_PIN, pinState);
  Serial.print(F("[Pump 1] Set to: "));
  Serial.println(state ? F("ON") : F("OFF"));
}

void setPump2(bool state) {
  pump2Active = state;
  int pinState = relayActiveLow ? (state ? LOW : HIGH) : (state ? HIGH : LOW);
  digitalWrite(RELAY_PUMP2_PIN, pinState);
  Serial.print(F("[Pump 2] Set to: "));
  Serial.println(state ? F("ON") : F("OFF"));
}

// Process incoming commands from either Bluetooth (HC-05) or USB Serial
void processCommand(String cmd) {
  cmd.trim();
  cmd.toUpperCase();
  if (cmd.length() == 0) return;

  Serial.print(F("[Command Received]: "));
  Serial.println(cmd);

  if (cmd == "P1_ON" || cmd == "1" || cmd == "PUMP1_ON") {
    autoControl = false; // Disable auto override so manual button always works!
    setPump1(true);
  } else if (cmd == "P1_OFF" || cmd == "0" || cmd == "PUMP1_OFF") {
    autoControl = false;
    setPump1(false);
  } else if (cmd == "P2_ON" || cmd == "2" || cmd == "PUMP2_ON") {
    autoControl = false;
    setPump2(true);
  } else if (cmd == "P2_OFF" || cmd == "PUMP2_OFF") {
    autoControl = false;
    setPump2(false);
  } else if (cmd == "AUTO_ON" || cmd == "AUTO") {
    autoControl = true;
    Serial.println(F("[Mode] Auto Threshold Control ENABLED"));
  } else if (cmd == "AUTO_OFF" || cmd == "MANUAL") {
    autoControl = false;
    Serial.println(F("[Mode] Manual Mode ENABLED"));
  } else if (cmd == "RELAY_HIGH") {
    relayActiveLow = false;
    setPump1(pump1Active);
    setPump2(pump2Active);
    Serial.println(F("[Relay] Polarity: Active-HIGH"));
  } else if (cmd == "RELAY_LOW") {
    relayActiveLow = true;
    setPump1(pump1Active);
    setPump2(pump2Active);
    Serial.println(F("[Relay] Polarity: Active-LOW"));
  }
}

void checkIncomingCommands() {
  // Read non-blocking from Bluetooth (HC-05)
  while (bleSerial.available()) {
    char c = (char)bleSerial.read();
    if (c == '\n' || c == '\r') {
      if (bleCmdBuffer.length() > 0) {
        processCommand(bleCmdBuffer);
        bleCmdBuffer = "";
      }
    } else {
      bleCmdBuffer += c;
      if (bleCmdBuffer.length() > 30) bleCmdBuffer = "";
    }
  }

  // Read non-blocking from USB Serial
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (usbCmdBuffer.length() > 0) {
        processCommand(usbCmdBuffer);
        usbCmdBuffer = "";
      }
    } else {
      usbCmdBuffer += c;
      if (usbCmdBuffer.length() > 30) usbCmdBuffer = "";
    }
  }
}

void setup() {
  // Configure digital pin modes
  pinMode(RELAY_PUMP1_PIN, OUTPUT);
  pinMode(RELAY_PUMP2_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  // Initial relay state (OFF)
  setPump1(false);
  setPump2(false);
  digitalWrite(BUZZER_PIN, LOW);

  // USB Hardware Serial
  Serial.begin(9600);
  delay(200);

  Serial.println(F("\n============================================"));
  Serial.println(F("AquaSentinel Arduino Uno + Bluetooth Node"));
  Serial.println(F("Relays: Pin 7 (Pump 1) & Pin 8 (Pump 2)"));
  Serial.println(F("Bluetooth: Pin 2 (RX) & Pin 3 (TX)"));
  Serial.println(F("============================================"));

  // Bluetooth Serial (HC-05 default baud rate is 9600)
  bleSerial.begin(9600);

  // Initialize Sensors
  waterTempSensor.begin();
  waterTempSensor.setResolution(10);
  dht.begin();

  // Startup beep
  digitalWrite(BUZZER_PIN, HIGH);
  delay(100);
  digitalWrite(BUZZER_PIN, LOW);

  Serial.println(F("[AquaSentinel] Ready and listening for commands."));
}

void loop() {
  // 1. Process incoming commands continuously without blocking
  checkIncomingCommands();

  // 2. Periodic sensor sampling & broadcast every 2000ms
  unsigned long now = millis();
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;

    // Read DS18B20 Water Temperature
    waterTempSensor.requestTemperatures();
    float wt = waterTempSensor.getTempCByIndex(0);
    if (wt > -50.0 && wt < 85.0) {
      waterTemp = wt;
    }

    // Read DHT11 Air Temperature & Humidity
    float h = dht.readHumidity();
    float at = dht.readTemperature();
    if (!isnan(h) && h >= 0 && h <= 100) humidity = h;
    if (!isnan(at) && at >= -20 && at <= 60) airTemp = at;

    // Read Analog pH (Pin A0)
    float a0Raw = readAverageAnalog(PH_ANALOG_PIN, 8);
    float a0Volt = (a0Raw / 1023.0) * 5.0;
    phValue = calculatePH(a0Volt);

    // Read Analog Turbidity (Pin A1)
    float a1Raw = readAverageAnalog(TURB_ANALOG_PIN, 8);
    float a1Volt = (a1Raw / 1023.0) * 5.0;
    turbidityValue = calculateTurbidity(a1Volt);

    // Determine individual parameter statuses
    String tempStatus = (waterTemp < WATER_TEMP_MIN) ? "LOW" : ((waterTemp > WATER_TEMP_MAX) ? "HIGH" : "NORMAL");
    String phStatus = (phValue < PH_MIN) ? "LOW" : ((phValue > PH_MAX) ? "HIGH" : "NORMAL");
    String turbStatus = (turbidityValue > TURBIDITY_MAX) ? "HIGH" : "NORMAL";

    // Overall Status
    String overallStatus = "NORMAL";
    if (phValue < 6.0 || phValue > 9.0 || waterTemp > 33.0 || turbidityValue > 80.0) {
      overallStatus = "CRITICAL";
    } else if (tempStatus != "NORMAL" || phStatus != "NORMAL" || turbStatus != "NORMAL") {
      overallStatus = "WARNING";
    }

    // Automated Relay Control Logic (ONLY if Auto Mode is Active)
    if (autoControl) {
      // Pump 1 (Aerator): Turn ON if water is too warm (>30°C) or turbid (>50 NTU)
      if (waterTemp >= 30.0 || turbidityValue >= 50.0 || overallStatus == "CRITICAL") {
        setPump1(true);
      } else {
        setPump1(false);
      }

      // Pump 2 (Water Flush): Triggered if severe pH or turbidity danger
      if (turbidityValue > 75.0 || phValue < 6.2 || phValue > 8.8) {
        setPump2(true);
      } else {
        setPump2(false);
      }
    }

    // Buzzer on Danger
    buzzerState = (overallStatus == "CRITICAL");
    digitalWrite(BUZZER_PIN, buzzerState ? HIGH : LOW);

    // Construct JSON line with full status fields
    String json = "{\"waterTemp\":" + String(waterTemp, 1) +
                  ",\"temperature\":" + String(waterTemp, 1) +
                  ",\"airTemp\":" + String(airTemp, 1) +
                  ",\"humidity\":" + String(humidity, 0) +
                  ",\"ph\":" + String(phValue, 2) +
                  ",\"turbidity\":" + String(turbidityValue, 1) +
                  ",\"temperatureStatus\":\"" + tempStatus + "\"" +
                  ",\"phStatus\":\"" + phStatus + "\"" +
                  ",\"turbidityStatus\":\"" + turbStatus + "\"" +
                  ",\"pump1\":" + (pump1Active ? "1" : "0") +
                  ",\"pump2\":" + (pump2Active ? "1" : "0") +
                  ",\"autoMode\":" + (autoControl ? "1" : "0") +
                  ",\"overallStatus\":\"" + overallStatus + "\"" +
                  ",\"buzzer\":" + (buzzerState ? "1" : "0") + "}\n";

    // 1. Broadcast over Bluetooth (HC-05)
    bleSerial.print(json);

    // 2. Broadcast over USB Serial (Direct cable / Serial Monitor)
    Serial.print(json);
  }
}
