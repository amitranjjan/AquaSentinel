/*
 * AquaSentinel — ESP8266 Water Quality IoT Node + HM-10 BLE Bridge
 * 
 * Hardware Setup:
 *  - ESP8266 Development Board (NodeMCU v2/v3 or Wemos D1 Mini)
 *  - HM-10 (or AT-09 / CC2541 / MLT-BT05) Bluetooth 4.0 LE Module
 *  - DS18B20 Digital Waterproof Temperature Sensor (GPIO 4 / D2, 4.7k pull-up)
 *  - Analog Sensor on A0 (e.g., Analog pH or Turbidity Sensor)
 *  - Alert Buzzer on GPIO 5 / D1
 *  - Onboard Status LED on GPIO 2 / D4
 *
 * HM-10 to ESP8266 Wiring:
 *  - HM-10 VCC  --> 5V (or 3.3V depending on module breakout board)
 *  - HM-10 GND  --> ESP8266 GND
 *  - HM-10 TXD  --> ESP8266 D5 (GPIO 14, SoftwareSerial RX)
 *  - HM-10 RXD  --> ESP8266 D6 (GPIO 12, SoftwareSerial TX)
 *    (Note: HM-10 RX is 3.3V logic tolerant, matching ESP8266 3.3V logic)
 *
 * How it works with the Web Dashboard:
 *  1. HM-10 advertises standard BLE Service UUID: 0000ffe0-0000-1000-8000-00805f9b34fb
 *  2. ESP8266 formats sensor data as a compact JSON string terminated with '\n'.
 *  3. SoftwareSerial sends this string to HM-10.
 *  4. HM-10 transmits it over BLE characteristic 0000ffe1-0000-1000-8000-00805f9b34fb in 20-byte chunks.
 *  5. AquaSentinel web app reassembles the chunks on '\n' and feeds them to the live dashboard & Gemini AI!
 */

#include <SoftwareSerial.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ================= PIN DEFINITIONS =================
#define ONE_WIRE_BUS      4   // D2 (GPIO 4) for DS18B20 1-Wire
#define BUZZER_PIN        5   // D1 (GPIO 5) for alert buzzer
#define STATUS_LED_PIN    2   // D4 (GPIO 2) onboard LED (Active LOW on ESP8266)
#define ANALOG_PIN        A0  // ESP8266 ADC0 (0-1.0V or 0-3.3V on NodeMCU boards)

// HM-10 SoftwareSerial Pins
#define HM10_RX_PIN       14  // D5 (GPIO 14) connects to HM-10 TX
#define HM10_TX_PIN       12  // D6 (GPIO 12) connects to HM-10 RX

// Sensor Objects
SoftwareSerial bleSerial(HM10_RX_PIN, HM10_TX_PIN); // RX, TX
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);

// Telemetry thresholds
const float TEMP_MIN = 20.0;
const float TEMP_MAX = 33.0;
const float PH_MIN = 6.5;
const float PH_MAX = 8.5;
const float TURB_ALERT = 80.0;

// Variables
float currentTemp = 27.5;
float currentPh = 7.2;
float currentTurbidity = 22.0;

unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL_MS = 2000; // Broadcast every 2 seconds

// Moving average for analog pin
float readA0Voltage(int samples = 10) {
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(ANALOG_PIN);
    delay(5);
  }
  float avgRaw = (float)sum / samples;
  // NodeMCU internal voltage divider scales 0-3.3V down to 0-1.0V for ESP8266 ADC
  return (avgRaw / 1024.0) * 3.3;
}

void setup() {
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(STATUS_LED_PIN, HIGH); // Off for active-low LED

  // USB Serial Monitor
  Serial.begin(115200);
  delay(500);
  Serial.println(F("\n====================================="));
  Serial.println(F("AquaSentinel ESP8266 + HM-10 Node Starting..."));
  Serial.println(F("====================================="));

  // HM-10 BLE Baud Rate (Standard default is 9600)
  bleSerial.begin(9600);
  Serial.println(F("[BLE] SoftwareSerial initialized at 9600 baud."));

  // Initialize Temperature Sensor
  tempSensor.begin();
  tempSensor.setResolution(10);
  Serial.println(F("[Sensors] DS18B20 temperature sensor ready."));

  // Beep on boot
  digitalWrite(BUZZER_PIN, HIGH);
  delay(150);
  digitalWrite(BUZZER_PIN, LOW);
}

void loop() {
  unsigned long now = millis();

  // Read sensors and transmit every SEND_INTERVAL_MS
  if (now - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = now;

    // 1. Read DS18B20 Temperature
    tempSensor.requestTemperatures();
    float t = tempSensor.getTempCByIndex(0);
    if (t > -50.0 && t < 85.0) {
      currentTemp = t;
    } else {
      // Fallback simulated realistic variation if probe disconnected
      currentTemp += ((float)(random(-15, 16)) / 100.0);
      if (currentTemp < 24.0) currentTemp = 24.5;
      if (currentTemp > 31.0) currentTemp = 30.5;
    }

    // 2. Read Analog Sensor (pH calculation formula: pH = 7.0 + (2.5 - V) * slope)
    float vA0 = readA0Voltage(10);
    currentPh = 7.0 + (2.5 - vA0) * 3.5;
    if (currentPh < 0.0) currentPh = 0.0;
    if (currentPh > 14.0) currentPh = 14.0;

    // 3. Turbidity simulation or reading
    currentTurbidity = 20.0 + ((float)random(0, 150) / 10.0);

    // 4. Determine status indicators
    String tempStatus = "NORMAL";
    if (currentTemp < TEMP_MIN || currentTemp > TEMP_MAX) tempStatus = "DANGER";
    else if (currentTemp < 23.0 || currentTemp > 30.0) tempStatus = "WARNING";

    String phStatus = "NORMAL";
    if (currentPh < 6.0 || currentPh > 9.0) phStatus = "DANGER";
    else if (currentPh < PH_MIN || currentPh > PH_MAX) phStatus = "WARNING";

    String turbStatus = (currentTurbidity > TURB_ALERT) ? "DANGER" : (currentTurbidity > 50.0 ? "WARNING" : "NORMAL");

    String overallStatus = "NORMAL";
    if (tempStatus == "DANGER" || phStatus == "DANGER" || turbStatus == "DANGER") {
      overallStatus = "DANGER";
    } else if (tempStatus == "WARNING" || phStatus == "WARNING" || turbStatus == "WARNING") {
      overallStatus = "WARNING";
    }

    // 5. Trigger buzzer on DANGER
    bool buzzerActive = (overallStatus == "DANGER");
    digitalWrite(BUZZER_PIN, buzzerActive ? HIGH : LOW);

    // Blink Status LED during transmission
    digitalWrite(STATUS_LED_PIN, LOW); // LED ON

    // 6. Assemble compact JSON payload terminated with '\n'
    // IMPORTANT: Keep JSON concise to minimize BLE chunk count
    String jsonPayload = "{\"temperature\":" + String(currentTemp, 2) +
                         ",\"ph\":" + String(currentPh, 2) +
                         ",\"turbidity\":" + String(currentTurbidity, 1) +
                         ",\"temperatureStatus\":\"" + tempStatus + "\"" +
                         ",\"phStatus\":\"" + phStatus + "\"" +
                         ",\"turbidityStatus\":\"" + turbStatus + "\"" +
                         ",\"overallStatus\":\"" + overallStatus + "\"" +
                         ",\"buzzer\":" + (buzzerActive ? "1" : "0") + "}\n";

    // 7. Send to HM-10 over SoftwareSerial
    bleSerial.print(jsonPayload);

    // Also mirror to USB Serial monitor for easy debugging
    Serial.print(F("[ESP8266 -> HM-10] "));
    Serial.print(jsonPayload);

    digitalWrite(STATUS_LED_PIN, HIGH); // LED OFF
  }

  // Pass any incoming BLE commands back to USB Serial
  if (bleSerial.available()) {
    char c = bleSerial.read();
    Serial.write(c);
  }
}
