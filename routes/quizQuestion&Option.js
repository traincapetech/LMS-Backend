const express = require('express');
const Quiz = require('../models/QuizModel/Quiz');
const Question = require('../models/QuizModel/Question');
const Option = require('../models/QuizModel/Option');

const router = express.Router({ mergeParams: true });

// Add a question to a quiz
router.post('/', async (req, res) => {
  try {
    const { quizId } = req.params;
    const { text, type, marks } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    const question = new Question({ quiz: quizId, text, type, marks });
    await question.save();

    res.status(201).json({ success: true, question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add an option to a question
router.post('/:questionId/options', async (req, res) => {
  try {
    const { questionId } = req.params;
    const { text, isCorrect } = req.body;

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });

    const option = new Option({ question: questionId, text, isCorrect });
    await option.save();

    res.status(201).json({ success: true, option });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:quizId/questions', async (req, res) => {
  try {
    const { quizId } = req.params;

    // Check if quiz exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    // Find all questions for this quiz
    const questions = await Question.find({ quiz: quizId });

    // For each question, find its options
    const questionsWithOptions = await Promise.all(
      questions.map(async (question) => {
        const options = await Option.find({ question: question._id });
        return { ...question.toObject(), options };
      })
    );

    res.status(200).json({
      success: true,
      quizTitle: quiz.title,
      questions: questionsWithOptions,
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Get all questions (from all quizzes)
router.get('/', async (req, res) => {
  try {
    const questions = await Question.find().populate('quiz', 'title description');
    const questionsWithOptions = await Promise.all(
      questions.map(async (question) => {
        const options = await Option.find({ question: question._id });
        return { ...question.toObject(), options };
      })
    );

    res.status(200).json({
      success: true,
      total: questionsWithOptions.length,
      questions: questionsWithOptions,
    });
  } catch (error) {
    console.error('Error fetching all questions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
module.exports = router;
