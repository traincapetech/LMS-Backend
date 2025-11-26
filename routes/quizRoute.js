const express = require('express');
const router = express.Router();
const Quiz = require('../models/QuizModel/Quiz');

// Create a quiz
router.post('/', async (req, res) => {
  try {
    const quiz = new Quiz(req.body);
    await quiz.save();
    res.status(201).json({ success: true, quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// // Get all quizzes
// router.get('/', async (req, res) => {
//   try {
//     const quizzes = await Quiz.find();
//     res.status(200).json({ success: true, quizzes });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

router.get("/", async (req, res) => {
  try {
    const quizzes = await Quiz.find()
      // populate all questions for each quiz
      .populate({
        path: "questions",
        populate: {
          path: "options",
          model: "Option",
        },
      });

    res.status(200).json({
      success: true,
      total: quizzes.length,
      quizzes,
    });
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch quizzes with questions and options",
      error: error.message,
    });
  }
});



// Get quiz by ID
router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    res.status(200).json({ success: true, quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
