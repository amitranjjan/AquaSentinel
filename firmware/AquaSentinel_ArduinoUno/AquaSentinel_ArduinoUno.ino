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
 * Communication:
 *  - Works with AquaSentinel Web Dashboard via:
 *      1. Bluetooth HC-05 (Paired in Windows -> Web Serial COM)
 *      2. Direct USB Cable (Web Serial COM)
 *      3. HM-10 / AT-09 (Web Bluetooth BLE)
 *  - Broadcasts structured JSON telemetry every 2 seconds terminated with '\n'
 *  - Accepts remote commands: "P1_ON", "P1_OFF", "P2_ON", "P2_OFF", "AUTO_ON", "AUTO_OFF"
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

// ================= RELAY CONFIGURATION =================
// Most 5V Arduino relay modules are ACTIVE-LOW (LOW = ON, HIGH = OFF)
#define RELAY_ON   LOW
#define RELAY_OFF  HIGH

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

bool pump1Active = false; // Aerator Pump
bool pump2Active = false; // Fresh Water Pump
bool autoControl = true;  // Automated relay triggers based on water quality
bool buzzerState = false;

unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 2000; // Broadcast every 2s

// Analog sample smoothing (reduces ADC electrical jitter)
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
  // At neutral pH 7.0, output is typically ~2.5V
  float ph = 7.0 + (2.50 - voltage) * 3.5;
  if (ph < 0.0) ph = 0.0;
  if (ph > 14.0) ph = 14.0;
  return ph;
}

// Convert A1 voltage to Turbidity (NTU)
float calculateTurbidity(float voltage) {
  // Typical turbidity formula: clean water > 4.0V, dirty water < 2.5V
  if (voltage >= 4.0) return 10.0;
  if (voltage < 2.5) return 95.0;
  // Linear approximation: 4.0V = 10 NTU, 2.5V = 95 NTU
  float ntu = 10.0 + (4.0 - voltage) * 56.6;
  if (ntu < 0.0) ntu = 0.0;
  return ntu;
}

void setPump1(bool state) {
  pump1Active = state;
  digitalWrite(RELAY_PUMP1_PIN, state ? RELAY_ON : RELAY_OFF);
}

void setPump2(bool state) {
  pump2Active = state;
  digitalWrite(RELAY_PUMP2_PIN, state ? RELAY_ON : RELAY_OFF);
}

// Process incoming commands from either Bluetooth (HC-05) or USB Serial
void processCommand(String cmd) {
  cmd.trim();
  cmd.toUpperCase();
  if (cmd.length() == 0) return;

  Serial.print(F("[Command Received]: "));
  Serial.println(cmd);

  if (cmd == "P1_ON") {
    setPump1(true);
    autoControl = false; // Manual override
  } else if (cmd == "P1_OFF") {
    setPump1(false);
    autoControl = false;
  } else if (cmd == "P2_ON") {
    setPump2(true);
    autoControl = false;
  } else if (cmd == "P2_OFF") {
    setPump2(false);
    autoControl = false;
  } else if (cmd == "AUTO_ON") {
    autoControl = true;
  } else if (cmd == "AUTO_OFF") {
    autoControl = false;
  }
}

void setup() {
  // Configure digital pin modes
  pinMode(RELAY_PUMP1_PIN, OUTPUT);
  pinMode(RELAY_PUMP2_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  // Initial relay state (OFF for active-low modules)
  digitalWrite(RELAY_PUMP1_PIN, RELAY_OFF);
  digitalWrite(RELAY_PUMP2_PIN, RELAY_OFF);
  digitalWrite(BUZZER_PIN, LOW);

  // USB Hardware Serial
  Serial.begin(9600);
  Serial.setTimeout(80); // Fast non-blocking serial read
  delay(300);

  Serial.println(F("\n============================================"));
  Serial.println(F("AquaSentinel Arduino Uno + Bluetooth Node"));
  Serial.println(F("Hardware: DHT11 + DS18B20 + pH + Turbidity + 2 Relays"));
  Serial.println(F("============================================"));

  // Bluetooth Serial (HC-05 default baud rate is 9600)
  bleSerial.begin(9600);
  bleSerial.setTimeout(80);

  // Initialize Sensors
  waterTempSensor.begin();
  waterTempSensor.setResolution(10);
  dht.begin();

  // Startup audio confirmation
  digitalWrite(BUZZER_PIN, HIGH);
  delay(120);
  digitalWrite(BUZZER_PIN, LOW);

  Serial.println(F("[AquaSentinel] Ready and listening on Bluetooth & USB Serial."));
}

void loop() {
  // 1. Check for incoming commands from Bluetooth (HC-05)
  if (bleSerial.available()) {
    String cmd = bleSerial.readStringUntil('\n');
    processCommand(cmd);
  }

  // 2. Check for incoming commands from USB Serial (Direct cable)
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    processCommand(cmd);
  }

  // 3. Periodic sensor sampling & broadcast every 2000ms
  unsigned long now = millis();
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;

    // Read DS18B20 Water Temperature
    waterTempSensor.requestTemperatures();
    float wt = waterTempSensor.getTempCByIndex(0);
    // Ignore error codes (-127 = disconnected probe, 85 = power-on reset state)
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

    // Determine status & warnings
    String overallStatus = "NORMAL";
    bool tempWarning = (waterTemp < WATER_TEMP_MIN || waterTemp > WATER_TEMP_MAX);
    bool phWarning = (phValue < PH_MIN || phValue > PH_MAX);
    bool turbWarning = (turbidityValue > TURBIDITY_MAX);

    if (waterTemp > 33.0 || phValue < 6.0 || phValue > 9.0 || turbidityValue > 80.0) {
      overallStatus = "DANGER";
    } else if (tempWarning || phWarning || turbWarning) {
      overallStatus = "WARNING";
    }

    // Automated Relay Control Logic (if Auto Mode is Active)
    if (autoControl) {
      // Pump 1 (Aerator): Turn ON if water is too warm (>30°C) or turbid (>50 NTU)
      if (waterTemp >= 30.0 || turbidityValue >= 50.0 || overallStatus == "DANGER") {
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
    buzzerState = (overallStatus == "DANGER");
    digitalWrite(BUZZER_PIN, buzzerState ? HIGH : LOW);

    // Construct concise JSON line terminated with '\n'
    String json = "{\"waterTemp\":" + String(waterTemp, 1) +
                  ",\"temperature\":" + String(waterTemp, 1) +
                  ",\"airTemp\":" + String(airTemp, 1) +
                  ",\"humidity\":" + String(humidity, 0) +
                  ",\"ph\":" + String(phValue, 2) +
                  ",\"turbidity\":" + String(turbidityValue, 1) +
                  ",\"pump1\":" + (pump1Active ? "1" : "0") +
                  ",\"pump2\":" + (pump2Active ? "1" : "0") +
                  ",\"overallStatus\":\"" + overallStatus + "\"" +
                  ",\"buzzer\":" + (buzzerState ? "1" : "0") + "}\n";

    // 1. Broadcast over Bluetooth (HC-05)
    bleSerial.print(json);

    // 2. Broadcast over USB Serial (Direct cable / Serial Monitor)
    Serial.print(json);
  }
}
