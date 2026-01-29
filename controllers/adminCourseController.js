const Cart = require("../models/Cart");
const Course = require("../models/Course");
const PendingCourse = require("../models/PendingCourse");
const Enrollment = require("../models/Enrollment");
const Progress = require("../models/Progress");
const Review = require("../models/Review");
const Question = require("../models/Question");
const Note = require("../models/Note");
const CourseDiscussion = require("../models/CourseDiscussion");
const Video = require("../models/Video");
const User = require("../models/User");
const Instructor = require("../models/Instructor");
const InstructorRequest = require("../models/InstructorRequest");
const { deleteFromBucket } = require("../config/r2");

const bucketMap = [
  {
    base: process.env.R2_PUBLIC_URL_VIDEOS?.trim(),
    bucket: process.env.R2_BUCKET_VIDEOS?.trim(),
  },
  {
    base: process.env.R2_PUBLIC_URL_DOCS?.trim(),
    bucket: process.env.R2_BUCKET_DOCS?.trim(),
  },
  {
    base: process.env.R2_PUBLIC_URL_IMAGES?.trim(),
    bucket: process.env.R2_BUCKET_IMAGES?.trim(),
  },
];

const parseR2Key = (url) => {
  if (!url || typeof url !== "string") return null;
  const match = bucketMap.find((entry) => entry.base && url.startsWith(entry.base));
  if (!match || !match.bucket) return null;
  let key = url.slice(match.base.length);
  if (key.startsWith("/")) key = key.slice(1);
  if (!key) return null;
  return { bucket: match.bucket, key };
};

const addUrl = (set, url) => {
  if (url && typeof url === "string") set.add(url);
};

const collectCurriculumUrls = (curriculum, set) => {
  (curriculum || []).forEach((section) => {
    (section.items || []).forEach((item) => {
      addUrl(set, item.videoUrl);
      (item.documents || []).forEach((doc) => addUrl(set, doc.fileUrl));
    });
  });
};

const deleteR2Urls = async (urls) => {
  for (const url of urls) {
    const parsed = parseR2Key(url);
    if (!parsed) continue;
    try {
      await deleteFromBucket(parsed.bucket, parsed.key);
    } catch (err) {
      console.error("Failed to delete R2 object:", parsed, err.message);
    }
  }
};

const deleteCourseAndRelated = async (courseId) => {
  const course = await Course.findById(courseId).lean();
  if (!course) return;

  const urls = new Set();
  addUrl(urls, course.thumbnailUrl);
  collectCurriculumUrls(course.curriculum, urls);

  await deleteR2Urls(urls);

  await Enrollment.deleteMany({ course: courseId });
  await Progress.deleteMany({ course: courseId });
  await Review.deleteMany({ course: courseId });
  await Question.deleteMany({ course: courseId });
  await Note.deleteMany({ course: courseId });
  await CourseDiscussion.deleteMany({ courseId });

  await Cart.updateMany({}, { $pull: { items: { course: courseId } } });
  await Course.findByIdAndDelete(courseId);
};

const deletePendingAndRelated = async (pendingId, deletePublished = true) => {
  const pending = await PendingCourse.findById(pendingId).lean();
  if (!pending) return;

  const urls = new Set();
  addUrl(urls, pending.thumbnailUrl);
  collectCurriculumUrls(pending.curriculum, urls);

  const videos = await Video.find({ pendingCourseId: pending._id }).lean();
  videos.forEach((video) => addUrl(urls, video.url));

  await deleteR2Urls(urls);
  await Video.deleteMany({ pendingCourseId: pending._id });

  if (deletePublished && pending.courseId) {
    await deleteCourseAndRelated(pending.courseId);
  }

  await PendingCourse.findByIdAndDelete(pending._id);
};

const deleteUserData = async (userId) => {
  await Enrollment.deleteMany({ user: userId });
  await Progress.deleteMany({ user: userId });
  await Review.deleteMany({ user: userId });
  await Question.deleteMany({ author: userId });
  await Note.deleteMany({ user: userId });
  await CourseDiscussion.deleteMany({
    $or: [{ sender: userId }, { recipient: userId }],
  });
};

exports.deletePendingCourse = async (req, res) => {
  try {
    const { pendingId } = req.params;
    const deletePublished = req.query.deletePublished !== "false";

    await deletePendingAndRelated(pendingId, deletePublished);

    res.json({ success: true, message: "Pending course deleted" });
  } catch (error) {
    console.error("Admin delete pending error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteAllCourses = async (req, res) => {
  try {
    const pendingCourses = await PendingCourse.find().lean();
    const pendingCourseIds = pendingCourses.map((p) => p._id);
    const courseIdsFromPending = new Set(
      pendingCourses
        .map((p) => p.courseId)
        .filter(Boolean)
        .map((id) => id.toString())
    );

    for (const pendingId of pendingCourseIds) {
      await deletePendingAndRelated(pendingId, false);
    }

    const allCourses = await Course.find().select("_id").lean();
    for (const course of allCourses) {
      if (courseIdsFromPending.has(course._id.toString())) {
        await deleteCourseAndRelated(course._id);
      } else {
        await deleteCourseAndRelated(course._id);
      }
    }

    res.json({ success: true, message: "All courses deleted" });
  } catch (error) {
    console.error("Admin delete all courses error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteInstructor = async (req, res) => {
  try {
    const { instructorId } = req.params;

    const user = await User.findById(instructorId);
    if (!user) {
      return res.status(404).json({ message: "Instructor not found" });
    }

    const courses = await Course.find({ instructor: instructorId })
      .select("_id")
      .lean();
    for (const course of courses) {
      await deleteCourseAndRelated(course._id);
    }

    const pendingCourses = await PendingCourse.find({ instructor: instructorId })
      .select("_id")
      .lean();
    for (const pending of pendingCourses) {
      await deletePendingAndRelated(pending._id, false);
    }

    await deleteUserData(instructorId);

    await Instructor.deleteMany({ email: user.email });
    await InstructorRequest.deleteMany({ email: user.email });
    await User.findByIdAndDelete(instructorId);

    res.json({ success: true, message: "Instructor deleted" });
  } catch (error) {
    console.error("Admin delete instructor error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
