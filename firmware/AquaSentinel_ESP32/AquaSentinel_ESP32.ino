/*
 * AquaSentinel — ESP32 Water Quality IoT Node & BLE GATT Server
 * 
 * Hardware:
 *  - ESP32 Development Board (DOIT / NodeMCU-32S / ESP32-WROOM-32)
 *  - DS18B20 Digital Waterproof Temperature Sensor (1-Wire on GPIO 4, 4.7k pull-up to 3.3V)
 *  - Analog pH Sensor Probe & Signal Conditioning Board (Analog Out on GPIO 34 / ADC1_CH6)
 *  - Analog Turbidity Sensor (Analog Out on GPIO 35 / ADC1_CH7)
 *  - Active or Passive Piezo Buzzer on GPIO 23
 *  - Onboard Status LED on GPIO 2
 *
 * BLE GATT Architecture:
 *  - Service UUID:        0000ffe0-0000-1000-8000-00805f9b34fb
 *  - Characteristic UUID: 0000ffe1-0000-1000-8000-00805f9b34fb (Notify + Read)
 *  - Periodically broadcasts structured JSON telemetry conforming to AquaSentinel BLE protocol.
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ================= PIN DEFINITIONS =================
#define ONE_WIRE_BUS        4   // GPIO 4 for DS18B20 1-Wire data
#define PH_PIN              34  // GPIO 34 (ADC1_CH6) for pH sensor
#define TURBIDITY_PIN       35  // GPIO 35 (ADC1_CH7) for Turbidity sensor
#define BUZZER_PIN          23  // GPIO 23 for Alert Buzzer
#define STATUS_LED_PIN      2   // GPIO 2 for BLE Status LED

// ================= BLE DEFINITIONS =================
#define SERVICE_UUID        "0000ffe0-0000-1000-8000-00805f9b34fb"
#define CHARACTERISTIC_UUID "0000ffe1-0000-1000-8000-00805f9b34fb"
#define DEVICE_NAME         "AquaSentinel-ESP32"

// ================= SENSOR CALIBRATION CONSTANTS =================
// pH Calibration constants: pH = m * voltage + c
// Typical 3.3V ADC: Neutral pH 7.0 ~ 2.5V (or adjust to probe calibration)
const float PH_SLOPE = -5.70;       
const float PH_OFFSET = 21.34;      

// Turbidity Calibration: Voltage to NTU conversion
// DFRobot typical curve: NTU = -1120.4*V^2 + 5742.3*V - 4352.9
// For clean pond water: ~3.0V - 4.2V (low NTU), murky water < 2.5V (high NTU)

// Thresholds for status determination
const float TEMP_MIN = 20.0;
const float TEMP_MAX = 33.0;
const float PH_MIN = 6.5;
const float PH_MAX = 8.5;
const float TURB_ALERT = 80.0;

// Sensor Objects
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);

// BLE Objects
BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Telemetry Variables
float currentTemp = 28.5;
float currentPh = 7.2;
float currentTurbidity = 25.0;

String tempStatus = "NORMAL";
String phStatus = "NORMAL";
String turbStatus = "NORMAL";
String overallStatus = "NORMAL";
bool buzzerState = false;

unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL_MS = 2000; // 2 seconds telemetry stream

// BLE Callbacks
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    digitalWrite(STATUS_LED_PIN, HIGH);
    Serial.println(F("[BLE] Client connected to AquaSentinel!"));
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    digitalWrite(STATUS_LED_PIN, LOW);
    Serial.println(F("[BLE] Client disconnected. Restarting advertising..."));
  }
};

// Moving average filtering for stable analog reading
float readAveragedVoltage(int pin, int samples = 20) {
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delay(5);
  }
  float avgRaw = (float)sum / samples;
  // ESP32 ADC: 12-bit (0-4095) with 3.3V reference
  return (avgRaw / 4095.0) * 3.3;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println(F("========================================"));
  Serial.println(F("🐟 AquaSentinel IoT Sensor Node Starting"));
  Serial.println(F("========================================"));

  // Initialize GPIOs
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(STATUS_LED_PIN, LOW);

  // Initialize DS18B20
  tempSensor.begin();
  tempSensor.setResolution(11); // 11-bit resolution (~0.125°C, 375ms conversion)

  // Initialize ESP32 BLE
  BLEDevice::init(DEVICE_NAME);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);
  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ   |
                      BLECharacteristic::PROPERTY_NOTIFY
                    );

  pCharacteristic->addDescriptor(new BLE2902());
  pService->start();

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // functions that help with iPhone connections issue
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println(F("[BLE] AquaSentinel GATT Server ready and advertising!"));
  Serial.println(F("Ready to pair via Web Bluetooth on Chrome/Edge dashboard."));
}

void loop() {
  // Handle BLE connection transitions
  if (!deviceConnected && oldDeviceConnected) {
    delay(500); // give the bluetooth stack the chance to get things ready
    pServer->startAdvertising();
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  // Periodic sensor read and telemetry send
  unsigned long now = millis();
  if (now - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = now;

    // 1. Read Temperature from DS18B20
    tempSensor.requestTemperatures();
    float rawTemp = tempSensor.getTempCByIndex(0);
    bool tempError = (rawTemp == DEVICE_DISCONNECTED_C || rawTemp < -50.0 || rawTemp > 85.0);

    if (tempError) {
      tempStatus = "SENSOR_ERROR";
      currentTemp = -999.0;
    } else {
      currentTemp = rawTemp;
      if (currentTemp < TEMP_MIN) tempStatus = "LOW";
      else if (currentTemp > TEMP_MAX) tempStatus = "HIGH";
      else tempStatus = "NORMAL";
    }

    // 2. Read pH Sensor
    float phVoltage = readAveragedVoltage(PH_PIN);
    // Rough sanity check: If voltage is 0V or 3.3V disconnected rail, flag sensor error
    if (phVoltage < 0.1 || phVoltage > 3.25) {
      // Possible disconnected probe or unpowered adapter
      currentPh = 7.0; // fallback reasonable reading or indicate sensor issue
      phStatus = "ATTENTION";
    } else {
      currentPh = (PH_SLOPE * phVoltage) + PH_OFFSET;
      // Clamp reasonable pH range 0.0 - 14.0
      if (currentPh < 0.0) currentPh = 0.0;
      if (currentPh > 14.0) currentPh = 14.0;

      if (currentPh < PH_MIN) phStatus = "LOW";
      else if (currentPh > PH_MAX) phStatus = "HIGH";
      else phStatus = "NORMAL";
    }

    // 3. Read Turbidity Sensor
    float turbVoltage = readAveragedVoltage(TURBIDITY_PIN);
    // Optical turbidity: High voltage = clear water; low voltage = turbid water
    if (turbVoltage < 0.1) {
      turbStatus = "SENSOR_ERROR";
      currentTurbidity = 0.0;
    } else {
      // Empirical calculation for DFRobot Turbidity sensor at 3.3V
      if (turbVoltage > 2.8) {
        currentTurbidity = (3.3 - turbVoltage) * 25.0; // Clear water: 0 - 15 NTU
      } else {
        currentTurbidity = (3.0 - turbVoltage) * 120.0; // Turbid: up to 300 NTU
      }
      if (currentTurbidity < 0.0) currentTurbidity = 0.0;
      if (currentTurbidity > 500.0) currentTurbidity = 500.0;

      if (currentTurbidity > TURB_ALERT) turbStatus = "HIGH";
      else turbStatus = "NORMAL";
    }

    // 4. Overall status and buzzer activation
    bool hasCritical = (tempStatus == "HIGH" || tempStatus == "LOW" || 
                        phStatus == "HIGH" || phStatus == "LOW" || 
                        turbStatus == "HIGH");
    bool hasSensorFault = (tempStatus == "SENSOR_ERROR" || phStatus == "SENSOR_ERROR" || turbStatus == "SENSOR_ERROR");

    if (hasSensorFault) {
      overallStatus = "SENSOR_ERROR";
      buzzerState = true;
    } else if (hasCritical) {
      overallStatus = "ALERT";
      buzzerState = true;
    } else {
      overallStatus = "NORMAL";
      buzzerState = false;
    }

    // Trigger physical buzzer
    if (buzzerState) {
      // Intermittent alert pulse
      tone(BUZZER_PIN, 2200, 150);
    } else {
      noTone(BUZZER_PIN);
      digitalWrite(BUZZER_PIN, LOW);
    }

    // 5. Construct JSON telemetry string matching PRD Section 17
    // Example: {"temperature":29.25,"ph":6.95,"turbidity":55.6,"temperatureStatus":"NORMAL","phStatus":"NORMAL","turbidityStatus":"NORMAL","overallStatus":"NORMAL","buzzer":false}
    String jsonPayload = "{";
    jsonPayload += "\"temperature\":" + (tempError ? "null" : String(currentTemp, 2)) + ",";
    jsonPayload += "\"ph\":" + String(currentPh, 2) + ",";
    jsonPayload += "\"turbidity\":" + String(currentTurbidity, 1) + ",";
    jsonPayload += "\"temperatureStatus\":\"" + tempStatus + "\",";
    jsonPayload += "\"phStatus\":\"" + phStatus + "\",";
    jsonPayload += "\"turbidityStatus\":\"" + turbStatus + "\",";
    jsonPayload += "\"overallStatus\":\"" + overallStatus + "\",";
    jsonPayload += "\"buzzer\":" + String(buzzerState ? "true" : "false");
    jsonPayload += "}";

    // Print to Serial for debugging / wired monitoring
    Serial.println(jsonPayload);

    // 6. Broadcast over BLE if client is connected
    if (deviceConnected && pCharacteristic != NULL) {
      pCharacteristic->setValue((uint8_t*)jsonPayload.c_str(), jsonPayload.length());
      pCharacteristic->notify();
    }
  }
}
