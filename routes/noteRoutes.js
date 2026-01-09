const express = require("express");
const router = express.Router();
const noteController = require("../controllers/noteController");
const requireAuth = require("../utils/requireAuth");

// All routes require authentication
router.use(requireAuth);

// Create a new note
router.post("/", noteController.createNote);

// Get notes for a course
router.get("/course/:courseId", noteController.getNotes);

// Update a note
router.put("/:id", noteController.updateNote);

// Delete a note
router.delete("/:id", noteController.deleteNote);

module.exports = router;
