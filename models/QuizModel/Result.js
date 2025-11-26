const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  user: { type: String,  required: true },
  answers: [{
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    selectedOptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Option' }],
  }],
  score: { type: Number, default: 0 },
  completedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Result', resultSchema);
