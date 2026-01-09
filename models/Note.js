const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
            required: true,
        },
        lectureId: {
            type: String,
            required: true,
        },
        lectureTitle: {
            type: String,
            default: "",
        },
        content: {
            type: String,
            required: true,
            maxlength: 1000,
        },
        timestamp: {
            type: Number, // Video timestamp in seconds
            required: true,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
noteSchema.index({ user: 1, course: 1 });
noteSchema.index({ user: 1, course: 1, lectureId: 1 });

module.exports = mongoose.model("Note", noteSchema);
