const express = require('express');
const router = express.Router({ mergeParams: true });
const Result = require('../models/QuizModel/Result');
const Quiz = require('../models/QuizModel/Quiz');
const Question = require('../models/QuizModel/Question');
const Option = require('../models/QuizModel/Option');

// Submit answers for a quiz
router.post('/submit', async (req, res) => {
  try {
    const { quizId } = req.params;
    const { userId, answers } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    let score = 0;

    for (let ans of answers) {
      const question = await Question.findById(ans.question);
      const correctOptions = await Option.find({ question: ans.question, isCorrect: true });
      const correctIds = correctOptions.map(o => o._id.toString());
      const selectedIds = ans.selectedOptions.map(id => id.toString());

      if (JSON.stringify(correctIds.sort()) === JSON.stringify(selectedIds.sort())) {
        score += question.marks;
      }
    }

    const result = new Result({
      quiz: quizId,
      user: userId,
      answers,
      score,
      completedAt: new Date()
    });

    await result.save();
    res.status(201).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all results for a quiz
router.get('/', async (req, res) => {
  try {
    const { quizId } = req.params;
    const results = await Result.find({ quiz: quizId }).populate('user', 'name email');
    res.status(200).json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
