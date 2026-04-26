#include <SoftwareSerial.h>
#include <DHT.h>
#include <LiquidCrystal.h>

LiquidCrystal lcd(13, 12, 11, 10, 9, 8);

#define PH_PIN A0
#define COND_PIN A4
#define DHT_PIN A5
#define DHT_TYPE DHT11

SoftwareSerial esp(2, 3);
DHT dht(DHT_PIN, DHT_TYPE);

const char* ssid = "milk";
const char* password = "milk1234";
const char* host = "192.168.43.122";
const int port = 3000;

void sendAT(String cmd, int delayMs) {
  esp.println(cmd);
  delay(delayMs);
  while (esp.available()) {
    Serial.write(esp.read());
  }
}

void setup() {
  Serial.begin(9600);
  esp.begin(9600);
  dht.begin();

  lcd.begin(16, 2);
  lcd.print("Milk Analyser");
  delay(2000);
  lcd.clear();

  Serial.println("Starting...");

  sendAT("AT", 1000);
  sendAT("AT+CWMODE=1", 1000);
  sendAT("AT+CIPRECVMODE=0", 1000); // important fix
  sendAT("AT+CWJAP=\"" + String(ssid) + "\",\"" + String(password) + "\"", 6000);
  sendAT("AT+CIFSR", 3000);

  Serial.println("WiFi connected!");
}

void loop() {

  // ===== SENSOR READ =====
  int rawPH = analogRead(PH_PIN);
  float ph = 7.0 + (676 - rawPH) * 0.0178;
  float conductivity = analogRead(COND_PIN) * (1000.0 / 1023.0);
  float temperature = dht.readTemperature();

  if (isnan(temperature)) {
    Serial.println("DHT failed");
    delay(3000);
    return;
  }

  Serial.print("pH: "); Serial.println(ph);
  Serial.print("Temp: "); Serial.println(temperature);
  Serial.print("Cond: "); Serial.println(conductivity);

  // ===== LCD DISPLAY =====
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("pH:");
  lcd.print(ph);
  lcd.print(" T:");
  lcd.print(temperature);

  lcd.setCursor(0, 1);
  lcd.print("Cond:");
  lcd.print(conductivity);

  delay(3000);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Milk Status:");
  lcd.setCursor(0, 1);
  lcd.print("Sending...");

  // ===== JSON =====
  String json = "{\"ph\":" + String(ph) +
                ",\"temperature\":" + String(temperature) +
                ",\"conductivity\":" + String(conductivity) + "}";

  // ===== POST =====
  sendAT("AT+CIPCLOSE", 500);
  sendAT("AT+CIPSTART=\"TCP\",\"" + String(host) + "\"," + String(port), 3000);

  String httpRequest = "POST /api/r HTTP/1.1\r\n";
  httpRequest += "Host: 192.168.43.122:3000\r\n";
  httpRequest += "Content-Type: application/json\r\n";
  httpRequest += "Content-Length: " + String(json.length()) + "\r\n";
  httpRequest += "Connection: close\r\n\r\n";
  httpRequest += json;

  esp.println("AT+CIPSEND=" + String(httpRequest.length()));
  delay(2000);

  // wait for >
  long timeout = millis() + 4000;
  String waitBuf = "";
  while (millis() < timeout) {
    while (esp.available()) {
      waitBuf += (char)esp.read();
    }
    if (waitBuf.indexOf(">") != -1) break;
  }

  esp.print(httpRequest);
  delay(4000);

  while (esp.available()) esp.read();
  sendAT("AT+CIPCLOSE", 500);

  // ===== GET =====
  sendAT("AT+CIPSTART=\"TCP\",\"" + String(host) + "\"," + String(port), 3000);

  String getRequest = "GET /api/latest-result HTTP/1.1\r\n";
  getRequest += "Host: 192.168.43.122:3000\r\n";
  getRequest += "Connection: close\r\n\r\n";

  esp.println("AT+CIPSEND=" + String(getRequest.length()));
  delay(2000);

  while (esp.available()) esp.read();

  esp.print(getRequest);

  // ===== 🔥 FIXED RESPONSE PARSER =====
  String buffer = "";
  String body = "";
  bool httpStarted = false;
  bool bodyStarted = false;

  timeout = millis() + 8000;

  while (millis() < timeout) {
    while (esp.available()) {
      char c = esp.read();
      Serial.write(c); // debug

      buffer += c;

      // Start only when HTTP begins
      if (!httpStarted && buffer.indexOf("HTTP/1.1") != -1) {
        httpStarted = true;
        buffer = "HTTP/1.1";
      }

      // Detect header end
      if (httpStarted && !bodyStarted && buffer.indexOf("\r\n\r\n") != -1) {
        bodyStarted = true;
        body = "";
      }

      // Capture body
      else if (bodyStarted) {
        body += c;

        // STOP early (Content-Length = 1)
        if (body.length() >= 1) {
          break;
        }
      }
    }

    if (bodyStarted && body.length() >= 1) break;
  }

  body.trim();

  Serial.println("\nBODY:");
  Serial.println(body);

  // ===== RESULT =====
  String mlResult = "Unknown";

  if (body.length() > 0) {
    char result = body.charAt(0);

    if (result == 'P') mlResult = "Pure";
    else if (result == 'W') mlResult = "Watered";
    else if (result == 'D') mlResult = "Detergent";
    else if (result == 'U') mlResult = "Urea";
    else if (result == 'A') mlResult = "Adulterated";
  }

  Serial.println("Result: " + mlResult);

  // ===== LCD RESULT =====
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Milk Status:");
  lcd.setCursor(0, 1);
  lcd.print(mlResult);

  delay(3000);

  Serial.println("Cycle complete\n");

  delay(10000);
}