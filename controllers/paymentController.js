const Stripe = require("stripe");
const Payment = require("../models/paymentModel");
const Enrollment = require("../models/Enrollment");
const Progress = require("../models/Progress");
const Course = require("../models/Course");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Helper function to enroll user in courses after successful payment
 * @param {String} userId - User ID
 * @param {Array} courseIds - Array of course IDs
 * @param {String} paymentId - Stripe payment session ID
 * @param {Number} amountPaid - Amount paid for the courses
 */
const enrollUserInCourses = async (
  userId,
  courseIds,
  paymentId,
  amountPaid
) => {
  try {
    const enrollments = [];

    for (const courseId of courseIds) {
      // Check if course exists
      const course = await Course.findById(courseId).populate("instructor");
      if (!course) {
        console.error(`Course ${courseId} not found, skipping enrollment`);
        continue;
      }

      // Check if already enrolled (prevent duplicates)
      const existingEnrollment = await Enrollment.findOne({
        user: userId,
        course: courseId,
      });

      if (existingEnrollment) {
        console.log(`User ${userId} already enrolled in course ${courseId}`);
        enrollments.push(existingEnrollment);
        continue;
      }

      // Create enrollment
      const enrollment = await Enrollment.create({
        user: userId,
        course: courseId,
        enrolledAt: new Date(),
        lastAccessedAt: new Date(),
        paymentId: paymentId,
        paymentMethod: "stripe",
        amountPaid: amountPaid / courseIds.length, // Split amount across courses
      });

      // Create progress tracking
      await Progress.create({
        enrollment: enrollment._id,
        user: userId,
        course: courseId,
      });

      // Update course learners count
      await Course.findByIdAndUpdate(courseId, {
        $inc: { learners: 1 },
      });

      // Optional: Send welcome message (non-blocking)
      if (course.instructor) {
        const { sendWelcomeMessage } = require("./discussionController");
        sendWelcomeMessage(courseId, userId, course.instructor._id)
          .then(() =>
            console.log(
              `✅ Welcome message sent for enrollment ${enrollment._id}`
            )
          )
          .catch((err) => console.error("⚠️ Welcome message failed:", err));
      }

      enrollments.push(enrollment);
      console.log(`✅ User ${userId} enrolled in course ${courseId}`);
    }

    return enrollments;
  } catch (error) {
    console.error("Error enrolling user:", error);
    throw error;
  }
};

exports.createCheckoutSession = async (req, res) => {
  try {
    const { courseIds, userId } = req.body;

    // For now, let's assume single course or handle array.
    // Ideally you calculate price on backend from DB to prevent tampering.
    // For this MVP request, we'll assume the frontend sends what's needed, but better to look up.

    // Placeholder line items
    // You should fetch course details here.
    // const course = await Course.findById(courseId);

    // Let's assume the frontend sends simple data for now like "items" array with { name, price, quantity: 1 }
    // Or simpler: just validation.

    const { items } = req.body; // Expecting [{ name: 'Course A', price: 9.99 }] in USD (dollars)

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + item.price, 0);

    // Stripe requires minimum $0.50 (50 cents) for USD transactions
    if (totalAmount < 0.5) {
      return res.status(400).json({
        error: `Minimum order amount is $0.50. Current amount: $${totalAmount.toFixed(
          2
        )}`,
      });
    }

    const lineItems = items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100), // Stripe expects cents for USD
      },
      quantity: 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"], // Only card payments for USD
      line_items: lineItems,
      mode: "payment",
      success_url: `${
        process.env.CLIENT_URL || "http://localhost:5173"
      }/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${
        process.env.CLIENT_URL || "http://localhost:5173"
      }/payment-failure`,
      metadata: {
        userId: userId,
        courseIds: JSON.stringify(courseIds || []),
      },
    });

    

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.webhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    // Note: req.body needs to be raw buffer for verification
    // You might need to configure express.raw({type: 'application/json'}) in server.js for this route specific
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Fulfill the order
    const userId = session.metadata.userId;
    const courseIds = JSON.parse(session.metadata.courseIds || "[]");

    // Save payment record
    try {
      await Payment.create({
        userId,
        paymentId: session.id,
        amount: session.amount_total / 100,
        currency: session.currency,
        status: "succeeded",
      });

      // Enroll user in all purchased courses
      await enrollUserInCourses(
        userId,
        courseIds,
        session.id,
        session.amount_total / 100
      );

      console.log("Payment recorded for session:", session.id);
    } catch (err) {
      console.error("Error saving payment to DB:", err);
    }
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
};

// Fallback for verification without webhook (simple version for localhost)
exports.verifyPayment = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      // Check if already saved?
      // Save to DB
      const existing = await Payment.findOne({ paymentId: session.id });
      if (!existing) {
        const userId = session.metadata.userId;
        const courseIds = JSON.parse(session.metadata.courseIds || "[]");

        await Payment.create({
          userId: userId,
          paymentId: session.id,
          amount: session.amount_total / 100,
          currency: session.currency,
          status: "succeeded",
        });

        // Enroll user in all purchased courses
        await enrollUserInCourses(
          userId,
          courseIds,
          session.id,
          session.amount_total / 100
        );
      }
      res.json({ success: true, payment: session });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};