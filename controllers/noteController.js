const Note = require("../models/Note");

// Create a new note
exports.createNote = async (req, res) => {
    try {
        const { courseId, lectureId, lectureTitle, content, timestamp } = req.body;
        const userId = req.user.id;

        if (!courseId || !lectureId || !content) {
            return res.status(400).json({
                success: false,
                message: "courseId, lectureId, and content are required",
            });
        }

        // Strip HTML to check actual content length
        const plainText = content.replace(/<[^>]*>/g, "").trim();
        if (plainText.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Note content cannot be empty",
            });
        }

        if (plainText.length > 1000) {
            return res.status(400).json({
                success: false,
                message: "Note content cannot exceed 1000 characters",
            });
        }

        const note = new Note({
            user: userId,
            course: courseId,
            lectureId,
            lectureTitle: lectureTitle || "",
            content,
            timestamp: timestamp || 0,
        });

        await note.save();

        res.status(201).json({
            success: true,
            message: "Note created successfully",
            note,
        });
    } catch (error) {
        console.error("Create note error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create note",
            error: error.message,
        });
    }
};

// Get notes for a course (optionally filtered by lectureId)
exports.getNotes = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { lectureId, sortBy = "createdAt", order = "desc" } = req.query;
        const userId = req.user.id;

        const query = { user: userId, course: courseId };
        if (lectureId) {
            query.lectureId = lectureId;
        }

        const sortOptions = {};
        if (sortBy === "timestamp") {
            sortOptions.lectureId = order === "asc" ? 1 : -1;
            sortOptions.timestamp = order === "asc" ? 1 : -1;
        } else {
            sortOptions[sortBy] = order === "asc" ? 1 : -1;
        }

        const notes = await Note.find(query).sort(sortOptions);

        res.json({
            success: true,
            notes,
            count: notes.length,
        });
    } catch (error) {
        console.error("Get notes error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch notes",
            error: error.message,
        });
    }
};

// Update a note
exports.updateNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        const note = await Note.findOne({ _id: id, user: userId });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: "Note not found",
            });
        }

        // Strip HTML to check actual content length
        const plainText = content.replace(/<[^>]*>/g, "").trim();
        if (plainText.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Note content cannot be empty",
            });
        }

        if (plainText.length > 1000) {
            return res.status(400).json({
                success: false,
                message: "Note content cannot exceed 1000 characters",
            });
        }

        note.content = content;
        await note.save();

        res.json({
            success: true,
            message: "Note updated successfully",
            note,
        });
    } catch (error) {
        console.error("Update note error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update note",
            error: error.message,
        });
    }
};

// Delete a note
exports.deleteNote = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const note = await Note.findOneAndDelete({ _id: id, user: userId });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: "Note not found",
            });
        }

        res.json({
            success: true,
            message: "Note deleted successfully",
        });
    } catch (error) {
        console.error("Delete note error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete note",
            error: error.message,
        });
    }
};
