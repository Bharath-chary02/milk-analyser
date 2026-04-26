const mongoose = require('mongoose');

const ReadingSchema = new mongoose.Schema({
  ph: Number,
  temperature: Number,
  conductivity: Number,
  result: String,
  confidence: Number,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Reading', ReadingSchema);