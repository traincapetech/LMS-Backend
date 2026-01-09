const CourseDiscussion = require('../models/CourseDiscussion');
const Course = require('../models/Course');

/**
 * Send a new message in private 1:1 conversation
 * POST /api/discussion/:courseId
 * 
 * Private messaging: Each student has separate chat with instructor
 * Students cannot see other students' messages
 */
exports.sendMessage = async (req, res) => {
    try {
        const { message, recipientId } = req.body; // NEW: recipientId required for private chat
        const { courseId } = req.params;
        const sender = req.user._id || req.user.id;

        // Validate message content
        if (!message || !message.trim()) {
            return res.status(400).json({ message: 'Message content is required' });
        }

        // IMPORTANT: Validate recipient is provided (required for private messaging)
        if (!recipientId) {
            return res.status(400).json({
                success: false,
                message: 'Recipient ID is required for private messaging'
            });
        }

        // Create new private message
        // This message will only be visible to sender and recipient
        const newMessage = await CourseDiscussion.create({
            courseId,
            sender,
            recipient: recipientId, // NEW: Recipient field for private chat
            message: message.trim(),
            isInstructorMessage: req.user.role === 'instructor',
            isWelcomeMessage: false // Regular user message, not auto-welcome
        });

        // Populate both sender and recipient details for frontend display
        await newMessage.populate('sender recipient', 'name email photoUrl role');

        res.status(201).json({
            success: true,
            message: newMessage
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: error.message
        });
    }
};

/**
 * Get private messages between current user and instructor
 * GET /api/discussion/:courseId
 * 
 * PRIVACY: Only returns messages in private conversation
 * Students cannot see other students' messages
 */
exports.getCourseMessages = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user._id || req.user.id;

        // Step 1: Get course details to find instructor
        const course = await Course.findById(courseId).select('instructor');

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        const instructorId = course.instructor;

        // Step 2: Fetch ONLY private messages between current user and instructor
        // This ensures privacy - students cannot see each other's messages
        // $or query finds messages where:
        //   - User sent to instructor, OR
        //   - Instructor sent to user
        const messages = await CourseDiscussion.find({
            courseId,
            $or: [
                { sender: userId, recipient: instructorId },      // Messages user sent to instructor
                { sender: instructorId, recipient: userId }       // Messages instructor sent to user
            ]
        })
            .populate('sender recipient', 'name email photoUrl role')
            .sort({ createdAt: 1 }); // Oldest first (chronological conversation flow)

        res.json({
            success: true,
            count: messages.length,
            messages,
            instructorId // Send instructor ID to frontend for sending replies
        });
    } catch (error) {
        console.error('Fetch messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages',
            error: error.message
        });
    }
};

/**
 * NEW: Get instructor's student conversations
 * GET /api/discussion/instructor/conversations
 * 
 * Returns list of students who have messaged in instructor's courses
 * Used by instructors to see all their student conversations
 */
exports.getInstructorConversations = async (req, res) => {
    try {
        const instructorId = req.user._id || req.user.id;

        // Get all courses taught by this instructor
        const courses = await Course.find({ instructor: instructorId }).select('_id title thumbnailUrl');

        if (!courses || courses.length === 0) {
            return res.json({
                success: true,
                conversations: []
            });
        }

        const courseIds = courses.map(c => c._id);

        // Get all unique student conversations across instructor's courses
        // Group messages by student and course to get latest message per conversation
        const conversations = await CourseDiscussion.aggregate([
            {
                // Match messages in instructor's courses
                $match: {
                    courseId: { $in: courseIds }
                }
            },
            {
                // Group by course and student (the other person in conversation)
                $group: {
                    _id: {
                        courseId: '$courseId',
                        // Student is either sender (if recipient is instructor) or recipient (if sender is instructor)
                        studentId: {
                            $cond: [
                                { $eq: ['$sender', instructorId] },
                                '$recipient',
                                '$sender'
                            ]
                        }
                    },
                    lastMessage: { $last: '$message' },
                    lastMessageTime: { $last: '$createdAt' },
                    messageCount: { $sum: 1 }
                }
            },
            {
                // Sort by latest message time
                $sort: { lastMessageTime: -1 }
            }
        ]);

        // Populate student and course details
        const User = require('../models/User');
        const populatedConversations = await Promise.all(
            conversations.map(async (conv) => {
                const student = await User.findById(conv._id.studentId).select('name photoUrl email');
                const course = courses.find(c => c._id.equals(conv._id.courseId));

                return {
                    id: `${conv._id.courseId}_${conv._id.studentId}`,
                    courseId: conv._id.courseId,
                    courseTitle: course?.title || 'Unknown Course',
                    courseImage: course?.thumbnailUrl,
                    studentId: conv._id.studentId,
                    studentName: student?.name || 'Unknown Student',
                    studentPhoto: student?.photoUrl,
                    lastMessage: conv.lastMessage,
                    lastMessageTime: conv.lastMessageTime,
                    messageCount: conv.messageCount
                };
            })
        );

        res.json({
            success: true,
            conversations: populatedConversations.filter(c => c.studentId && !c.studentId.equals(instructorId))
        });
    } catch (error) {
        console.error('Get instructor conversations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversations',
            error: error.message
        });
    }
};

/**
 * NEW: Get messages for specific student-course conversation (instructor view)
 * GET /api/discussion/instructor/:courseId/:studentId
 * 
 * Allows instructor to view conversation with specific student in specific course
 */
exports.getStudentConversation = async (req, res) => {
    try {
        const { courseId, studentId } = req.params;
        const instructorId = req.user._id || req.user.id;

        // Verify instructor owns this course
        const course = await Course.findOne({ _id: courseId, instructor: instructorId });
        if (!course) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this conversation'
            });
        }

        // Fetch messages between instructor and this student
        const messages = await CourseDiscussion.find({
            courseId,
            $or: [
                { sender: instructorId, recipient: studentId },
                { sender: studentId, recipient: instructorId }
            ]
        })
            .populate('sender recipient', 'name photoUrl role')
            .sort({ createdAt: 1 });

        res.json({
            success: true,
            messages,
            studentId // For replying
        });
    } catch (error) {
        console.error('Get student conversation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversation',
            error: error.message
        });
    }
};

/**
 * Get unread message count for logged-in user
 * GET /api/discussion/unread-count
 * 
 * PRIVACY: Only counts messages sent TO this user (recipient field)
 * Excludes messages sent by user themselves
 * 
 * Supports both students and instructors:
 * - Students: Count messages in enrolled courses
 * - Instructors: Count messages in taught courses
 */
exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const userRole = req.user.role;

        // Get user's last check time from header (sent from frontend)
        const lastCheckTime = req.headers['x-last-check']
            ? new Date(req.headers['x-last-check'])
            : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: 24 hours ago

        let courseIds = [];

        // BRANCHING: Different logic for students vs instructors
        if (userRole === 'instructor') {
            // INSTRUCTOR: Get courses they teach
            const courses = await Course.find({ instructor: userId }).select('_id');
            courseIds = courses.map(c => c._id);
        } else {
            // STUDENT: Get enrolled courses
            const Enrollment = require('../models/Enrollment');
            const enrollments = await Enrollment.find({ user: userId }).select('course');
            courseIds = enrollments.map(e => e.course);
        }

        if (courseIds.length === 0) {
            return res.json({ success: true, unreadCount: 0 });
        }

        // IMPORTANT: Count only messages sent TO this user (recipient field)
        // This ensures privacy - user only sees count of their own messages
        // Query filters:
        //   - courseId in user's courses (enrolled or taught)
        //   - recipient is current user (messages sent TO user)
        //   - sender is NOT current user (exclude own messages)
        //   - created after last check time
        const unreadCount = await CourseDiscussion.countDocuments({
            courseId: { $in: courseIds },
            recipient: userId,            // Messages sent TO this user
            sender: { $ne: userId },      // Not sent by user themselves
            createdAt: { $gt: lastCheckTime }
        });

        res.json({
            success: true,
            unreadCount
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch unread count',
            error: error.message
        });
    }
};

/**
 * Send welcome message to newly enrolled student
 * Called automatically when student enrolls in course
 * 
 * Uses instructor's custom welcome message from course creation (PendingCourse.welcomeMsg)
 * Falls back to default message if custom message not available
 * 
 * @param {ObjectId} courseId - Course ID
 * @param {ObjectId} studentId - Student who just enrolled
 * @param {ObjectId} instructorId - Course instructor
 * @returns {Promise} Welcome message object
 */
exports.sendWelcomeMessage = async (courseId, studentId, instructorId) => {
    try {
        let welcomeText = '';

        // Step 1: Try to get custom welcome message from course
        const course = await Course.findById(courseId).select('pendingCourseId');

        if (course && course.pendingCourseId) {
            // Get pending course data which contains instructor's custom welcome message
            const PendingCourse = require('../models/PendingCourse');
            const pendingCourse = await PendingCourse.findById(course.pendingCourseId).select('welcomeMsg');

            // Use instructor's custom message if available
            if (pendingCourse && pendingCourse.welcomeMsg && pendingCourse.welcomeMsg.trim()) {
                welcomeText = pendingCourse.welcomeMsg.trim();
                console.log('✅ Using custom welcome message from instructor');
            }
        }

        // Step 2: Fallback to default message if no custom message
        if (!welcomeText) {
            welcomeText = `Welcome to the course! 🎉\n\nI'm excited to have you as a student. Feel free to ask any questions here anytime. Let's make this a great learning experience!\n\nBest regards,\nYour Instructor`;
            console.log('ℹ️ Using default welcome message');
        }

        // Step 3: Create welcome message in database
        // This appears as first message in student's private chat with instructor
        const welcomeMessage = await CourseDiscussion.create({
            courseId,
            sender: instructorId,         // Sent from instructor
            recipient: studentId,         // Sent to newly enrolled student
            message: welcomeText,
            isInstructorMessage: true,    // From instructor
            isWelcomeMessage: true        // Flag for special styling in UI
        });

        console.log(`✅ Welcome message sent to student ${studentId} for course ${courseId}`);
        return welcomeMessage;
    } catch (error) {
        // Don't fail enrollment if welcome message fails
        // Just log the error and continue
        console.error('⚠️ Failed to send welcome message:', error);
        return null;
    }
};
