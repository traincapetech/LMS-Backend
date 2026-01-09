const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  text: { type: String, required: true },
  type: { type: String, enum: ['single', 'multiple'], default: 'single' },
  marks: { type: Number, default: 1 }
}, { timestamps: true });

// 🔹 Virtual field to link options
questionSchema.virtual('options', {
  ref: 'Option',
  localField: '_id',
  foreignField: 'question',
});

questionSchema.set('toObject', { virtuals: true });
questionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Question', questionSchema);
