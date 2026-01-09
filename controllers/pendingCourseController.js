const PendingCourse = require("../models/PendingCourse");
const Course = require("../models/Course");
const Video = require("../models/Video");

// POST /api/pending-courses/apply
// exports.apply = async (req, res) => {
//   try {
//     console.log("📩 Incoming course payload:", req.body);
//     const course = new PendingCourse({ ...req.body, status: 'pending' }, { new: true });
//     await course.save();
//     res.status(201).json({ message: 'Course submitted for review', course });

//   } catch (err) {
//     console.error("🔥 PENDING COURSE ERROR:", err);
//     res.status(500).json({
//       message: 'Failed to submit course for review',
//       error: err.message,
//       stack: err.stack
//     });
//   }
// };

// GET /api/pending-courses/
exports.getAll = async (req, res) => {
  try {
    const courses = await PendingCourse.find()
      .sort({ createdAt: -1 })
      .populate("instructor", "name email");
    res.json(courses);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch pending courses", error: err.message });
  }
};

// GET /api/pending-courses/:id
exports.getById = async (req, res) => {
  try {
    const course = await PendingCourse.findById(req.params.id)
      .populate("instructor", "name email")
      .lean();
    if (!course) return res.status(404).json({ message: "Course not found" });

    // Collect all videoIds that appear in the curriculum
    const vids = [];
    (course.curriculum || []).forEach((sec) => {
      (sec.items || []).forEach((it) => {
        if (it.videoId) vids.push(String(it.videoId));
      });
    });

    // fetch video docs in one query
    const videos = vids.length
      ? await Video.find({ _id: { $in: vids } }).lean()
      : [];
    const videoMap = videos.reduce((acc, v) => {
      acc[String(v._id)] = v;
      return acc;
    }, {});

    // enrich curriculum items with videoUrl (for frontend)
    const enrichedCurriculum = (course.curriculum || []).map((sec) => ({
      id: sec._id,
      title: sec.title,
      items: (sec.items || []).map((it) => ({
        id: it._id,
        type: it.type,
        title: it.title,
        videoId: it.videoId || null,
        videoUrl: it.videoId ? videoMap[String(it.videoId)]?.url || "" : "",
        documents: it.documents || [],
        quizId: it.quizId || null,
      })),
    }));

    const formatted = {
      ...course,
      curriculum: enrichedCurriculum,
    };

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to fetch course", error: err.message });
  }
};

// /api/pending-courses/my-courses
exports.getMyCourses = async (req, res) => {
  try {
    const id = req.user._id.toString();

    const courses = await PendingCourse.find({
      $or: [
        { instructor: req.user._id }, // ObjectId stored
        { instructor: id }, // String stored
        { "instructor._id": req.user._id }, // Object in DB
        { "instructor._id": id }, // Object with string _id
      ],
    })
      .sort({ createdAt: -1 })
      .populate("instructor", "name email");

    res.json(courses);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch pending courses",
      error: error.message,
    });
  }
};

// Post /api/pending-course/create
exports.createPendingCourse = async (req, res) => {
  try {
    const pending = await PendingCourse.create({
      courseType: req.body.courseType,
      category: req.body.category,
      timeCommitment: req.body.timeCommitment,
      instructor: req.user._id, // store full user object or minimal
      isBrandNew: true,
    });
    res.status(201).json({ success: true, pendingCourseId: pending._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// /api/pending-courses/update/:pendingCourseId
exports.editCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    console.log("courseid ", courseId);

    // Parse FormData JSON body
    let body = req.body;
    if (req.body.data) {
      try {
        body = JSON.parse(req.body.data);
      } catch (e) {
        return res.status(400).json({ message: "Invalid JSON in form-data" });
      }
    }

    // 1. Find course independent of owner
    const course = await PendingCourse.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // 2. Check ownership safely
    const instructorId = req.user._id;
    // Allow if owner OR if admin (optional, but good for safety)
    if (
      String(course.instructor) !== String(instructorId) &&
      req.user.role !== "admin"
    ) {
      console.log(
        `⛔ Unauthorized edit: User ${instructorId} tried to edit Course ${course.instructor}`
      );
      return res.status(403).json({
        message: "Unauthorized: You are not the instructor of this course.",
      });
    }

    // Whitelist allowed fields
    const allowed = [
      "learningObjectives",
      "requirements",
      "courseFor",
      "structure",
      "testVideo",
      "thumbnailUrl",
      "filmEdit",
      "sampleVideo",
      "captions",
      "accessibility",
      "landingTitle",
      "landingSubtitle",
      "landingDesc",
      "price",
      "promoCode",
      "promoDesc",
      "welcomeMsg",
      "congratsMsg",
      "curriculum",
    ];

    allowed.forEach((k) => {
      if (body[k] !== undefined) {
        course[k] = body[k];
      }
    });

    course.isBrandNew = false;
    course.updatedAt = new Date();
    await course.save();

    return res.json({ success: true, course });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to update course", error: err.message });
  }
};

// This is an old logic
// PUT /api/pending-courses/:id/approve
// exports.approve = async (req, res) => {
//   try {
//     const course = await PendingCourse.findByIdAndUpdate(
//       req.params.id,
//       { status: 'approved', adminMessage: req.body.adminMessage },
//       { new: true }
//     );
//     if (!course) return res.status(404).json({ message: 'Course not found' });

//     // Create a published course
//     let instructorId = undefined;
//     if (course.instructor && course.instructor._id) {
//       instructorId = course.instructor._id;
//       // Update user role to instructor
//       const User = require('../models/User');
//       const user = await User.findById(instructorId);
//       if (user && user.role !== 'instructor') {
//         user.role = 'instructor';
//         await user.save();
//       }
//     }
//     const published = new Course({
//       title: course.landingTitle,
//       subtitle: course.landingSubtitle,
//       description: course.landingDesc,
//       price: isNaN(Number(course.price)) ? 0 : Number(course.price),
//       instructor: instructorId,
//       published: true,
//       thumbnailUrl: course.thumbnailUrl,
//       rating: course.rating || 0,
//       badges: course.badges || [],
//       learningObjectives: course.learningObjectives || [],
//       language: course.language || 'English',
//       learners: course.learners || 0,
//       ratingsCount: course.ratingsCount || 0,
//     });
//     await published.save();

//     res.json({ message: 'Course approved and published', course: published });
//   } catch (err) {
//     res.status(500).json({ message: 'Failed to approve course', error: err.message });
//   }
// };

// This is the new logic
// PUT /api/pending-courses/:id/approve
exports.approve = async (req, res) => {
  try {
    const pending = await PendingCourse.findById(req.params.id).populate(
      "instructor"
    );

    if (!pending) {
      return res.status(404).json({ message: "Pending course not found" });
    }

    const instructorId = pending.instructor._id;

    // PROMOTE USER IF NEEDED
    const User = require("../models/User");
    const user = await User.findById(instructorId);
    if (user.role !== "instructor" && user.role !== "admin") {
      user.role = "instructor";
      await user.save();
    }

    // GET ALL VIDEO DOCUMENTS FOR THIS COURSE
    const Video = require("../models/Video");
    const videos = await Video.find({ pendingCourseId: pending._id }).lean();

    const videoMap = {};
    videos.forEach((v) => {
      videoMap[String(v._id)] = v.videoUrl;
    });

    // CONVERT CURRICULUM
    const convertedCurriculum = pending.curriculum.map((section) => ({
      sectionId: section._id,
      title: section.title,
      items: section.items.map((item) => ({
        itemId: item._id,
        type: item.type,
        title: item.title,
        videoId: item.videoId,
        videoUrl: videoMap[String(item.videoId)] || "",
        documents: item.documents,
        quizQuestions: item.quizQuestions || [],
        quizId: item.quizId,
      })),
    }));

    /* -------------------------------------------------------------
       ⭐ MAIN LOGIC — UPDATE OR CREATE
    -------------------------------------------------------------- */
    let course;

    if (pending.courseId) {
      // UPDATE existing published course
      course = await Course.findByIdAndUpdate(
        pending.courseId,
        {
          title: pending.landingTitle || "",
          subtitle: pending.landingSubtitle || "",
          description: pending.landingDesc || "",
          price: Number(pending.price) || 0,
          thumbnailUrl: pending.thumbnailUrl,
          instructor: instructorId,
          pendingCourseId: pending._id,
          learningObjectives: pending.learningObjectives,
          requirements: pending.requirements,
          courseFor: pending.courseFor,
          structure: pending.structure,
          testVideo: pending.testVideo,
          sampleVideo: pending.sampleVideo,
          filmEdit: pending.filmEdit,
          captions: pending.captions,
          accessibility: pending.accessibility,
          promoCode: pending.promoCode,
          promoDesc: pending.promoDesc,
          welcomeMsg: pending.welcomeMsg,
          congratsMsg: pending.congratsMsg,
          language: pending.language,
          curriculum: convertedCurriculum,
        },
        { new: true }
      );
    } else {
      // CREATE new course (first approval)
      course = await Course.create({
        title: pending.landingTitle || "",
        subtitle: pending.landingSubtitle || "",
        description: pending.landingDesc || "",
        price: Number(pending.price) || 0,
        thumbnailUrl: pending.thumbnailUrl,
        instructor: instructorId,
        pendingCourseId: pending._id,
        learningObjectives: pending.learningObjectives,
        requirements: pending.requirements,
        courseFor: pending.courseFor,
        structure: pending.structure,
        testVideo: pending.testVideo,
        sampleVideo: pending.sampleVideo,
        filmEdit: pending.filmEdit,
        captions: pending.captions,
        accessibility: pending.accessibility,
        promoCode: pending.promoCode,
        promoDesc: pending.promoDesc,
        welcomeMsg: pending.welcomeMsg,
        congratsMsg: pending.congratsMsg,
        language: pending.language,
        curriculum: convertedCurriculum,
        published: true,
        rating: 0,
        ratingsCount: 0,
        learners: 0,
        badges: [],
      });

      // SAVE the new courseId ★ THIS IS IMPORTANT ★
      pending.courseId = course._id;
    }

    // NOW update pendingCourse status and save it
    pending.status = "approved";
    pending.adminMessage = req.body.adminMessage || "";
    await pending.save(); // ✔ Save AFTER setting courseId

    res.json({
      success: true,
      message: "Course approved & published successfully",
      course,
    });
  } catch (err) {
    console.error("Approve error:", err);
    res.status(500).json({
      message: "Failed to approve course",
      error: err.message,
    });
  }
};

exports.deletePendingCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const user = req.user;

    // 1. Check if course exists
    const course = await PendingCourse.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    // 2. Instructor can delete only their course
    if (user.role === "instructor") {
      if (String(course.instructor) !== String(user._id)) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to delete this course.",
        });
      }
    }

    // 3. Admin can delete ANY course (no check needed)

    await PendingCourse.deleteOne({ _id: courseId });

    return res.json({
      success: true,
      message: "Course deleted successfully.",
    });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/pending-courses/:id/reject
exports.reject = async (req, res) => {
  try {
    const course = await PendingCourse.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", adminMessage: req.body.adminMessage },
      { new: true }
    );
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json({ message: "Course rejected", course });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to reject course", error: err.message });
  }
};

// PATCH /api/pending-courses/:id - Quick curriculum update
exports.updateCurriculum = async (req, res) => {
  try {
    const courseId = req.params.id;
    const { curriculum } = req.body;

    console.log("📝 Updating curriculum for course:", courseId);
    if (curriculum && curriculum.length > 0) {
      const firstItem = curriculum[0]?.items?.[0];
      console.log("🔍 Payload check - Curriculum Type:", typeof curriculum);
      console.log("🔍 First section items type:", typeof curriculum[0]?.items);
      if (firstItem) {
        console.log("🔍 First item keys:", Object.keys(firstItem));
        console.log("🔍 quizQuestions Type:", typeof firstItem.quizQuestions);
        console.log("🔍 quizQuestions Value:", firstItem.quizQuestions);
      }
    }

    // Find the course and verify ownership
    const course = await PendingCourse.findOne({
      _id: courseId,
      instructor: req.user._id,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or unauthorized",
      });
    }

    // Update only the curriculum
    if (curriculum) {
      course.curriculum = curriculum;
      course.updatedAt = new Date();
      await course.save();
      console.log("✅ Curriculum updated successfully");

      // Return the saved curriculum with MongoDB-generated IDs
      const savedCurriculum = course.curriculum.map((section) => ({
        id: section._id,
        _id: section._id,
        title: section.title,
        published: section.published,
        items: section.items.map((item) => ({
          id: item._id,
          _id: item._id,
          type: item.type,
          title: item.title,
          videoId: item.videoId,
          documents: item.documents,
          quizQuestions: item.quizQuestions,
          quizId: item.quizId,
        })),
      }));

      return res.json({
        success: true,
        message: "Curriculum updated successfully",
        curriculum: savedCurriculum,
      });
    }

    res.json({
      success: true,
      message: "No curriculum to update",
    });
  } catch (err) {
    console.error("❌ Update curriculum error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update curriculum",
      error: err.message,
    });
  }
};
