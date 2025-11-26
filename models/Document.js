const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        fileUrl: { type: String, required: true },
        fileName: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
        courseId: { type: String, required: true }, // optional if linked to a course
    },
    { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);
