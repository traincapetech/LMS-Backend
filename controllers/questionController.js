const Question = require('../models/Question');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// Get all questions for a course with pagination and filters
exports.getQuestions = async (req, res) => {
    try {
        const { courseId } = req.params;
        const {
            page = 1,
            limit = 10,
            search = '',
            sortBy = 'recent',
            filter = 'all',
            lectureId = null
        } = req.query;

        const query = { course: courseId };

        // Search filter
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { body: { $regex: search, $options: 'i' } }
            ];
        }

        // Lecture filter
        if (lectureId) {
            query.lectureId = lectureId;
        }

        // Additional filters
        if (req.user) {
            if (filter === 'following') {
                query.followers = req.user._id;
            } else if (filter === 'asked') {
                query.author = req.user._id;
            } else if (filter === 'unanswered') {
                query.replyCount = 0;
            }
        }

        // Sort options
        let sort = {};
        switch (sortBy) {
            case 'popular':
                sort = { upvoteCount: -1, createdAt: -1 };
                break;
            case 'recent':
            default:
                sort = { createdAt: -1 };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [questions, total] = await Promise.all([
            Question.find(query)
                .populate('author', 'name profilePhoto')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Question.countDocuments(query)
        ]);

        res.json({
            questions,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                total
            }
        });
    } catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get featured questions (instructor answered)
exports.getFeaturedQuestions = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { limit = 5 } = req.query;

        const questions = await Question.find({
            course: courseId,
            hasInstructorReply: true
        })
            .populate('author', 'name profilePhoto')
            .sort({ upvoteCount: -1, createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        res.json({ questions });
    } catch (error) {
        console.error('Get featured questions error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get single question with replies
exports.getQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        const question = await Question.findByIdAndUpdate(
            id,
            { $inc: { viewCount: 1 } },
            { new: true }
        )
            .populate('author', 'name profilePhoto')
            .populate('replies.author', 'name profilePhoto')
            .lean();

        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        res.json({ question });
    } catch (error) {
        console.error('Get question error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Create new question
exports.createQuestion = async (req, res) => {
    try {
        const { courseId, title, body, lectureId, lectureTitle } = req.body;
        const userId = req.user._id;

        if (!courseId || !title) {
            return res.status(400).json({ message: 'Course ID and title are required' });
        }

        // Check enrollment
        const enrollment = await Enrollment.findOne({ user: userId, course: courseId });
        if (!enrollment) {
            return res.status(403).json({ message: 'You must be enrolled to ask questions' });
        }

        const question = new Question({
            course: courseId,
            author: userId,
            title,
            body: body || '',
            lectureId: lectureId || null,
            lectureTitle: lectureTitle || null,
            followers: [userId] // Auto-follow own question
        });

        await question.save();

        const populated = await Question.findById(question._id)
            .populate('author', 'name profilePhoto')
            .lean();

        res.status(201).json({
            message: 'Question created successfully',
            question: populated
        });
    } catch (error) {
        console.error('Create question error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Add reply to question
exports.addReply = async (req, res) => {
    try {
        const { id } = req.params;
        const { body } = req.body;
        const userId = req.user._id;

        if (!body) {
            return res.status(400).json({ message: 'Reply body is required' });
        }

        const question = await Question.findById(id).populate('course');
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        // Check if user is instructor
        const isInstructor = question.course.instructor.toString() === userId.toString();

        const reply = {
            author: userId,
            body,
            isInstructor,
            upvotes: [],
            upvoteCount: 0
        };

        question.replies.push(reply);
        question.replyCount = question.replies.length;

        // Mark as featured if instructor replies
        if (isInstructor && !question.hasInstructorReply) {
            question.hasInstructorReply = true;
            question.isFeatured = true;
        }

        await question.save();

        // Get the added reply with populated author
        const updatedQuestion = await Question.findById(id)
            .populate('replies.author', 'name profilePhoto')
            .lean();

        const addedReply = updatedQuestion.replies[updatedQuestion.replies.length - 1];

        res.status(201).json({
            message: 'Reply added successfully',
            reply: addedReply,
            replyCount: question.replyCount
        });
    } catch (error) {
        console.error('Add reply error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Toggle upvote on question
exports.upvoteQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const question = await Question.findById(id);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        const hasUpvoted = question.upvotes.includes(userId);

        if (hasUpvoted) {
            question.upvotes.pull(userId);
            question.upvoteCount = Math.max(0, question.upvoteCount - 1);
        } else {
            question.upvotes.push(userId);
            question.upvoteCount += 1;
        }

        await question.save();

        res.json({
            upvoted: !hasUpvoted,
            upvoteCount: question.upvoteCount
        });
    } catch (error) {
        console.error('Upvote question error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Toggle upvote on reply
exports.upvoteReply = async (req, res) => {
    try {
        const { id, replyId } = req.params;
        const userId = req.user._id;

        const question = await Question.findById(id);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        const reply = question.replies.id(replyId);
        if (!reply) {
            return res.status(404).json({ message: 'Reply not found' });
        }

        const hasUpvoted = reply.upvotes.includes(userId);

        if (hasUpvoted) {
            reply.upvotes.pull(userId);
            reply.upvoteCount = Math.max(0, reply.upvoteCount - 1);
        } else {
            reply.upvotes.push(userId);
            reply.upvoteCount += 1;
        }

        await question.save();

        res.json({
            upvoted: !hasUpvoted,
            upvoteCount: reply.upvoteCount
        });
    } catch (error) {
        console.error('Upvote reply error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Toggle follow question
exports.followQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const question = await Question.findById(id);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        const isFollowing = question.followers.includes(userId);

        if (isFollowing) {
            question.followers.pull(userId);
        } else {
            question.followers.push(userId);
        }

        await question.save();

        res.json({
            following: !isFollowing
        });
    } catch (error) {
        console.error('Follow question error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
