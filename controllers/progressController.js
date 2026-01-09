const Progress = require('../models/Progress');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const CourseDiscussion = require('../models/CourseDiscussion');
const PendingCourse = require('../models/PendingCourse');
const User = require('../models/User');
const PDFDocument = require('pdfkit');

// Mark lecture as completed
exports.markLectureComplete = async (req, res) => {
  try {
    const { courseId, lectureId, itemId } = req.body;
    const userId = req.user._id || req.user.id;

    if (!courseId || (!lectureId && !itemId)) {
      return res.status(400).json({
        message: 'Course ID and Lecture ID (or itemId) are required'
      });
    }

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      user: userId,
      course: courseId
    });

    if (!enrollment) {
      return res.status(403).json({
        message: 'You must be enrolled in this course to track progress'
      });
    }

    // Get or create progress
    let progress = await Progress.findOne({
      user: userId,
      course: courseId
    });

    if (!progress) {
      progress = new Progress({
        enrollment: enrollment._id,
        user: userId,
        course: courseId
      });
    }

    // Check if already completed
    const lectureIdToUse = lectureId || itemId;
    const alreadyCompleted = progress.completedLectures.some(
      l => l.lectureId?.toString() === lectureIdToUse?.toString() ||
        l.itemId === itemId
    );

    if (!alreadyCompleted) {
      progress.completedLectures.push({
        lectureId: lectureId || null,
        itemId: itemId || null,
        completedAt: new Date()
      });

      // Calculate progress percentage including both lectures and quizzes
      const course = await Course.findById(courseId).populate('instructor');
      if (course && course.curriculum) {
        const totalLectures = course.curriculum.reduce(
          (sum, section) => sum + (section.items?.filter(item => item.type === 'lecture').length || 0),
          0
        );
        const totalQuizzes = course.curriculum.reduce(
          (sum, section) => sum + (section.items?.filter(item => item.type === 'quiz').length || 0),
          0
        );
        const totalItems = totalLectures + totalQuizzes;

        if (totalItems > 0) {
          const completedCount = progress.completedLectures.length + progress.completedQuizzes.length;
          progress.progressPercentage = Math.round((completedCount / totalItems) * 100);
        }

        // Check if course is completed
        const wasNotCompleted = !progress.isCompleted;
        if (progress.progressPercentage >= 100) {
          progress.isCompleted = true;
          progress.completedAt = new Date();
          enrollment.isCompleted = true;
          enrollment.completedAt = new Date();
          enrollment.progress = 100;
          await enrollment.save();

          // 🎉 AUTO-SEND CONGRATULATIONS MESSAGE (only first time)
          if (wasNotCompleted) {
            try {
              const pendingCourse = await PendingCourse.findById(course.pendingCourseId);

              if (pendingCourse && pendingCourse.congratsMsg && pendingCourse.congratsMsg.trim()) {
                await CourseDiscussion.create({
                  courseId: courseId,
                  sender: course.instructor._id,
                  message: pendingCourse.congratsMsg.trim(),
                  isInstructorMessage: true
                });
                console.log('🎉 Congratulations message sent to student who completed course');
              }
            } catch (msgError) {
              console.error('Failed to send congratulations message:', msgError);
              // Don't fail progress if message fails
            }
          }
        }
      }

      await progress.save();
    }

    // Update enrollment progress
    enrollment.progress = progress.progressPercentage;
    enrollment.lastAccessedAt = new Date();
    await enrollment.save();

    res.json({
      message: 'Lecture marked as completed',
      progress: {
        progressPercentage: progress.progressPercentage,
        completedLectures: progress.completedLectures.length,
        isCompleted: progress.isCompleted
      }
    });
  } catch (error) {
    console.error('Mark lecture complete error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update last accessed lecture
exports.updateLastAccessed = async (req, res) => {
  try {
    const { courseId, lectureId, itemId, sectionId } = req.body;
    const userId = req.user._id || req.user.id;

    if (!courseId) {
      return res.status(400).json({ message: 'Course ID is required' });
    }

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      user: userId,
      course: courseId
    });

    if (!enrollment) {
      return res.status(403).json({
        message: 'You must be enrolled in this course'
      });
    }

    // Update enrollment
    enrollment.lastAccessedAt = new Date();
    if (lectureId || itemId) {
      enrollment.lastAccessedLecture = lectureId || itemId;
    }
    await enrollment.save();

    // Update progress
    let progress = await Progress.findOne({
      user: userId,
      course: courseId
    });

    if (progress) {
      progress.lastAccessedLecture = {
        lectureId: lectureId || null,
        itemId: itemId || null,
        sectionId: sectionId || null,
        accessedAt: new Date()
      };
      await progress.save();
    }

    res.json({ message: 'Last accessed updated' });
  } catch (error) {
    console.error('Update last accessed error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get progress for a course
exports.getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id || req.user.id;

    const progress = await Progress.findOne({
      user: userId,
      course: courseId
    }).populate('course');

    if (!progress) {
      return res.json({
        progressPercentage: 0,
        completedLectures: [],
        completedQuizzes: [],
        isCompleted: false,
        lastAccessedLecture: null
      });
    }

    res.json({
      progressPercentage: progress.progressPercentage,
      completedLectures: progress.completedLectures,
      completedQuizzes: progress.completedQuizzes,
      isCompleted: progress.isCompleted,
      completedAt: progress.completedAt,
      certificateId: progress.certificateId,
      lastAccessedLecture: progress.lastAccessedLecture,
      timeSpent: progress.timeSpent
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark quiz as completed
exports.markQuizComplete = async (req, res) => {
  try {
    const { courseId, quizId, score, maxScore } = req.body;
    const userId = req.user._id || req.user.id;

    if (!courseId || !quizId) {
      return res.status(400).json({
        message: 'Course ID and Quiz ID are required'
      });
    }

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      user: userId,
      course: courseId
    });

    if (!enrollment) {
      return res.status(403).json({
        message: 'You must be enrolled in this course'
      });
    }

    // Get or create progress
    let progress = await Progress.findOne({
      user: userId,
      course: courseId
    });

    if (!progress) {
      progress = new Progress({
        enrollment: enrollment._id,
        user: userId,
        course: courseId
      });
    }

    // Check if already completed
    const existingQuiz = progress.completedQuizzes.find(
      q => q.quizId?.toString() === quizId.toString()
    );

    if (!existingQuiz) {
      progress.completedQuizzes.push({
        quizId,
        score: score || 0,
        maxScore: maxScore || 0,
        completedAt: new Date()
      });

      // Calculate progress percentage including both lectures and quizzes
      const course = await Course.findById(courseId).populate('instructor');
      if (course && course.curriculum) {
        const totalLectures = course.curriculum.reduce(
          (sum, section) => sum + (section.items?.filter(item => item.type === 'lecture').length || 0),
          0
        );
        const totalQuizzes = course.curriculum.reduce(
          (sum, section) => sum + (section.items?.filter(item => item.type === 'quiz').length || 0),
          0
        );
        const totalItems = totalLectures + totalQuizzes;

        if (totalItems > 0) {
          const completedCount = progress.completedLectures.length + progress.completedQuizzes.length;
          progress.progressPercentage = Math.round((completedCount / totalItems) * 100);
        }

        // Check if course is completed
        const wasNotCompleted = !progress.isCompleted;
        if (progress.progressPercentage >= 100) {
          progress.isCompleted = true;
          progress.completedAt = new Date();
          enrollment.isCompleted = true;
          enrollment.completedAt = new Date();
          enrollment.progress = 100;
          await enrollment.save();

          // 🎉 AUTO-SEND CONGRATULATIONS MESSAGE (only first time)
          if (wasNotCompleted) {
            try {
              const pendingCourse = await PendingCourse.findById(course.pendingCourseId);

              if (pendingCourse && pendingCourse.congratsMsg && pendingCourse.congratsMsg.trim()) {
                await CourseDiscussion.create({
                  courseId: courseId,
                  sender: course.instructor._id,
                  message: pendingCourse.congratsMsg.trim(),
                  isInstructorMessage: true
                });
                console.log('🎉 Congratulations message sent to student who completed course');
              }
            } catch (msgError) {
              console.error('Failed to send congratulations message:', msgError);
              // Don't fail progress if message fails
            }
          }
        }
      }

      await progress.save();
    }

    // Update enrollment progress
    enrollment.progress = progress.progressPercentage;
    enrollment.lastAccessedAt = new Date();
    await enrollment.save();

    res.json({
      message: 'Quiz marked as completed',
      quizResult: existingQuiz || progress.completedQuizzes[progress.completedQuizzes.length - 1],
      progress: {
        progressPercentage: progress.progressPercentage,
        completedLectures: progress.completedLectures.length,
        completedQuizzes: progress.completedQuizzes.length,
        isCompleted: progress.isCompleted
      }
    });
  } catch (error) {
    console.error('Mark quiz complete error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Generate course completion certificate
exports.generateCertificate = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id || req.user.id;

    if (!courseId) {
      return res.status(400).json({ message: 'Course ID is required' });
    }

    // Check enrollment and progress
    const enrollment = await Enrollment.findOne({
      user: userId,
      course: courseId
    });

    if (!enrollment) {
      return res.status(403).json({
        message: 'You must be enrolled in this course'
      });
    }

    // Get progress
    const progress = await Progress.findOne({
      user: userId,
      course: courseId
    }).populate('course');

    if (!progress || !progress.isCompleted) {
      return res.status(403).json({
        message: 'Course must be completed to generate certificate'
      });
    }

    // Get user and course details
    const user = await User.findById(userId);
    const course = await Course.findById(courseId).populate('instructor');

    if (!user || !course) {
      return res.status(404).json({ message: 'User or course not found' });
    }

    // Create PDF certificate
    const doc = new PDFDocument({
      size: 'LETTER',
      layout: 'landscape',
      margin: 50
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Certificate_${course.title.replace(/[^a-z0-9]/gi, '_')}_${user.name.replace(/[^a-z0-9]/gi, '_')}.pdf"`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Certificate background design
    // Border
    doc.rect(30, 30, 750, 510)
      .lineWidth(8)
      .stroke('#2563eb');

    // Inner border
    doc.rect(50, 50, 710, 470)
      .lineWidth(2)
      .stroke('#1e40af');

    // Decorative corner elements
    const cornerSize = 40;
    doc.lineWidth(3).strokeColor('#3b82f6');
    
    // Top-left corner
    doc.moveTo(50, 50).lineTo(50 + cornerSize, 50).stroke();
    doc.moveTo(50, 50).lineTo(50, 50 + cornerSize).stroke();
    
    // Top-right corner
    doc.moveTo(760, 50).lineTo(760 - cornerSize, 50).stroke();
    doc.moveTo(760, 50).lineTo(760, 50 + cornerSize).stroke();
    
    // Bottom-left corner
    doc.moveTo(50, 520).lineTo(50 + cornerSize, 520).stroke();
    doc.moveTo(50, 520).lineTo(50, 520 - cornerSize).stroke();
    
    // Bottom-right corner
    doc.moveTo(760, 520).lineTo(760 - cornerSize, 520).stroke();
    doc.moveTo(760, 520).lineTo(760, 520 - cornerSize).stroke();

    // Certificate Title
    doc.fontSize(48)
      .font('Helvetica-Bold')
      .fillColor('#1e40af')
      .text('CERTIFICATE OF COMPLETION', 0, 120, {
        align: 'center',
        width: 810
      });

    // Subtitle
    doc.fontSize(18)
      .font('Helvetica')
      .fillColor('#64748b')
      .text('This is to certify that', 0, 200, {
        align: 'center',
        width: 810
      });

    // Student Name
    doc.fontSize(36)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text(user.name, 0, 240, {
        align: 'center',
        width: 810
      });

    // Course completion text
    doc.fontSize(18)
      .font('Helvetica')
      .fillColor('#475569')
      .text('has successfully completed the course', 0, 310, {
        align: 'center',
        width: 810
      });

    // Course Title
    doc.fontSize(28)
      .font('Helvetica-Bold')
      .fillColor('#1e40af')
      .text(course.title || course.landingTitle || 'Course', 0, 350, {
        align: 'center',
        width: 810
      });

    // Completion Date
    const completionDate = progress.completedAt || new Date();
    const formattedDate = completionDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    doc.fontSize(16)
      .font('Helvetica')
      .fillColor('#64748b')
      .text(`Completed on ${formattedDate}`, 0, 420, {
        align: 'center',
        width: 810
      });

    // Certificate ID (ensure IDs are strings before slicing)
    const certificateId = `CERT-${String(courseId).slice(-6)}-${String(userId).slice(-6)}-${Date.now()
      .toString()
      .slice(-6)}`;

    // Store certificate ID on progress for future reference
    progress.certificateId = certificateId;
    await progress.save();
    doc.fontSize(12)
      .font('Helvetica')
      .fillColor('#94a3b8')
      .text(`Certificate ID: ${certificateId}`, 0, 470, {
        align: 'center',
        width: 810
      });

    // Instructor signature line (if instructor exists)
    if (course.instructor) {
      doc.fontSize(14)
        .font('Helvetica')
        .fillColor('#475569')
        .text('Instructor:', 150, 500, {
          width: 200
        });

      doc.fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(course.instructor.name || 'Course Instructor', 150, 520, {
          width: 200
        });
    }

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Certificate generation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

