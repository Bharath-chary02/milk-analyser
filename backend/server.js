const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const axios = require('axios');
const Reading = require('./models/Reading');

const app = express();

app.disable('x-powered-by');
app.set('etag', false);

let lastResult = '0';

const setLastResult = (result) => {
  const r = String(result || '').trim().toLowerCase();
  if (r === 'pure') lastResult = 'P';
  else if (r === 'watered') lastResult = 'W';
  else if (r === 'water') lastResult = 'W';
  else if (r === 'detergent') lastResult = 'D';
  else if (r === 'urea') lastResult = 'U';
  else lastResult = '0';
  console.log('lastResult set to:', lastResult, '| from:', result);
};

// ===== ARDUINO ROUTES - before cors =====

// Arduino fetches this after POST
app.get('/api/latest-result', (req, res) => {
  console.log('GET /api/latest-result ->', lastResult);
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Content-Length': '1',
    'Connection': 'close'
  });
  res.end(lastResult);
});

// Arduino checks trigger
app.get('/api/check-trigger', (req, res) => {
  console.log('GET /api/check-trigger ->', triggerReading);
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Content-Length': '1',
    'Connection': 'close'
  });
  res.end(triggerReading ? '1' : '0');
  triggerReading = false;
});

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log('Incoming request:', req.method, req.url);
  next();
});

// ===== MONGODB =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// ===== TRIGGER FLAG =====
let triggerReading = false;

// ===== API ROUTES =====

// Arduino POST - short route
app.post('/api/r', async (req, res) => {
  try {
    const { ph, temperature, conductivity } = req.body;
    console.log('Data received /api/r:', req.body);

    const mlResponse = await axios.post('http://127.0.0.1:5000/predict', {
      ph, temperature, conductivity
    });
    const result = mlResponse.data.result;
    const confidence = mlResponse.data.confidence;

    const reading = new Reading({ ph, temperature, conductivity, result, confidence });
    await reading.save();

    setLastResult(result);
    console.log('Saved result:', result, '| confidence:', confidence);

    res.json({ success: true, result, confidence });
  } catch (err) {
    console.log('Error in /api/r:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Dashboard trigger
app.post('/api/trigger', (req, res) => {
  triggerReading = true;
  console.log('Trigger set to true');
  res.json({ success: true });
});

// GET all readings for dashboard
app.get('/api/readings', async (req, res) => {
  try {
    const readings = await Reading.find().sort({ timestamp: -1 });
    res.json(readings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});