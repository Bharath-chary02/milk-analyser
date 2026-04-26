# 🥛 Smart Milk Adulteration Detector

An IoT-based dairy fraud detection system that uses real-time sensor data and Machine Learning to classify milk as **Pure**, **Watered**, **Detergent-adulterated**, or **Urea-adulterated**.

Built as a college project combining **IoT + Fraud Detection + AI/ML**.

---

## 📁 Repository Structure

```
smart-milk-adulteration-detector/
├── backend/        → Node.js + Express + MongoDB REST API
├── frontend/       → React.js + Vite dashboard
├── ml/             → Python Flask + scikit-learn ML service
├── arduino/        → Arduino sketch (.ino) for sensor reading
└── README.md
```

> ⚠️ Each folder must be set up and run **separately**. See setup instructions below.

---

## 🔧 Hardware Components

| Component | Details |
|---|---|
| Arduino UNO | Microcontroller |
| ESP8266 ESP-01 | WiFi module (SoftwareSerial pins 2 & 3, baud 9600) |
| pH Sensor | Analog pin A0 |
| DHT11 Temperature Sensor | Analog pin A5 |
| Conductivity Sensor | Analog pin A4 |
| LCD JHD 162A | RS=13, EN=12, D4=11, D5=10, D6=9, D7=8 |
| CH340 USB Driver | Required for Arduino-PC communication |

### Arduino Pin Map

```
Arduino UNO
├── A0  → pH Sensor
├── A4  → Conductivity Sensor
├── A5  → DHT11 Temperature Sensor
├── D2  → ESP8266 TX (SoftwareSerial RX)
├── D3  → ESP8266 RX (SoftwareSerial TX)
├── D8  → LCD D7
├── D9  → LCD D6
├── D10 → LCD D5
├── D11 → LCD D4
├── D12 → LCD EN
└── D13 → LCD RS
```

---

## 🌐 Network Configuration

| Setting | Value |
|---|---|
| Hotspot SSID | `milk` |
| Hotspot Password | `milk1234` |
| Laptop IP (on hotspot) | `192.168.43.122` |

> ⚠️ If the laptop IP changes, run `ipconfig` and update the `host` variable in the Arduino sketch.

---

## ⚙️ System Architecture

```
Arduino (sensors)
    ↓  HTTP POST every 10 seconds
Node.js Backend (port 3000)
    ↓  calls
Flask ML Service (port 5000)
    ↓  returns result + confidence
MongoDB (stores reading)
    ↓
React Dashboard (port 5173)
    ↓  Test Now button
Arduino LCD displays result
```

---

## 🤖 ML Model Details

| Property | Value |
|---|---|
| Algorithm | Random Forest (200 estimators) |
| Features | pH, Temperature, Conductivity |
| Classes | Pure, Watered, Detergent, Urea |
| Training Samples | 400 (100 per class) |
| Model Accuracy | 96% |

### Adulteration Detection Ranges

| Class | pH Range | Conductivity (µS/cm) |
|---|---|---|
| Pure Milk | 6.4 – 6.8 | 400 – 550 |
| Watered | 6.8 – 7.2 | 250 – 540 |
| Detergent | 7.5 – 9.0 | 800 – 1500 |
| Urea | 6.8 – 7.2 | 560 – 700 |

### pH Calibration Formula

```
Raw value 676 = pH 7.0 (water reference)
float ph = 7.0 + (676 - rawPH) * 0.0178
```

> Allow 2–3 minutes for pH sensor to stabilize before taking readings.

---

## 🔌 API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/r` | POST | Arduino sends sensor data |
| `/api/readings` | GET | Dashboard fetches all readings |
| `/api/trigger` | POST | Dashboard triggers LCD display |
| `/api/check-trigger` | GET | Arduino polls for trigger |
| `/api/latest-result` | GET | Arduino fetches latest result |

`/api/latest-result` returns a single character:
- `P` = Pure
- `W` = Watered
- `D` = Detergent
- `U` = Urea

---

## 🚀 Setup & Running

### Prerequisites
- Node.js v18+
- Python 3.9+
- MongoDB (local or Atlas)
- Arduino IDE
- CH340 driver installed

---

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:
```
MONGO_URI=your_mongodb_connection_string
PORT=3000
```

Run the backend:
```bash
node server.js
```

---

### 2. ML Service Setup

```bash
cd ml
pip install flask scikit-learn numpy
python app.py
```

Runs on `http://127.0.0.1:5000`

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`

---

### 4. Arduino Setup

1. Open `arduino/sketch_apr18a.ino` in Arduino IDE
2. Install required libraries:
   - `LiquidCrystal`
   - `DHT sensor library`
   - `SoftwareSerial` (built-in)
3. Verify the `host` variable matches your laptop's hotspot IP
4. Connect Arduino via USB, select correct COM port
5. Upload the sketch

---

## ⚠️ Known Issues & Notes

- **pH sensor drift** — Allow 2–3 minutes to stabilize before each test
- **Conductivity sensor** — Clean with distilled water between tests to avoid residue readings
- **Watered vs Urea overlap** — At conductivity 490–560 µS/cm, occasional misclassification may occur due to overlapping ranges
- **Hotspot IP change** — Always run `ipconfig` after reconnecting hotspot and update `host` in Arduino code if changed

---

## 👥 Team

Developed by a 4-member team as part of B.Tech CSE coursework at **Vidya Jyothi Institute of Technology (VJIT), Hyderabad** (2023–2027).