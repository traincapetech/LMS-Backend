const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
const { createEnrollmentForUser } = require("./enrollmentController");
const { getRate } = require("../utils/exchangeRate");

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? require("stripe")(stripeSecret) : null;
const frontendUrl =
  process.env.FRONTEND_URL || "http://localhost:5173";

const normalizeTotals = (cart) => {
  const subtotal = Number(cart.totalBeforeDiscount || 0);
  const total = Number(cart.totalAfterDiscount || subtotal);
  return { subtotal, total };
};

const collectExistingEnrollments = async (userId, courseIds) => {
  const existing = await Enrollment.find({
    user: userId,
    course: { $in: courseIds },
  }).select("course");
  return new Set(existing.map((e) => e.course.toString()));
};

const validateCourses = async (courseIds) => {
  const courses = await Course.find({ _id: { $in: courseIds } });
  const courseMap = new Map(courses.map((c) => [c._id.toString(), c]));
  const missing = courseIds.filter((id) => !courseMap.has(id.toString()));
  const unpublished = courses.filter((c) => !c.published);
  return { courseMap, missing, unpublished };
};

const fulfillOrder = async (order) => {
  const discount = Number(order.discountPercentage || 0);
  const enrollments = [];

  for (const item of order.items) {
    const basePrice = Number(item.price || 0);
    const amountPaid =
      discount > 0 ? Number((basePrice * (100 - discount)) / 100) : basePrice;

    const result = await createEnrollmentForUser({
      userId: order.user,
      courseId: item.course,
      paymentMethod: order.paymentMethod || "manual",
      amountPaid,
      paymentId: order.paymentReference || null,
      orderId: order._id,
    });

    if (result?.enrollment) {
      enrollments.push(result.enrollment);
    }
  }

  return enrollments;
};

const normalizeCurrency = (value) =>
  String(value || "INR").toUpperCase();

const SUPPORTED_CURRENCIES = new Set(["INR", "USD", "EUR"]);

const createOrderFromCart = async ({
  userId,
  paymentMethod = "manual",
  currency = "INR",
}) => {
  const cart = await Cart.findOne({ user: userId }).populate("items.course");
  if (!cart || cart.items.length === 0) {
    return { error: { status: 400, message: "Cart is empty" } };
  }

  const courseIds = cart.items.map((item) => item.course?._id).filter(Boolean);
  const { missing, unpublished } = await validateCourses(courseIds);

  if (missing.length > 0) {
    return {
      error: {
        status: 404,
        message: "Some courses are no longer available",
        missing,
      },
    };
  }

  if (unpublished.length > 0) {
    return {
      error: {
        status: 400,
        message: "Some courses are not published",
        unpublished: unpublished.map((c) => c._id),
      },
    };
  }

  const existingEnrollments = await collectExistingEnrollments(
    userId,
    courseIds
  );
  if (existingEnrollments.size > 0) {
    return {
      error: {
        status: 409,
        message: "Already enrolled in one or more courses",
        enrolledCourseIds: Array.from(existingEnrollments),
      },
    };
  }

  const baseCurrency = "INR";
  const resolvedCurrency = normalizeCurrency(currency);
  if (!SUPPORTED_CURRENCIES.has(resolvedCurrency)) {
    return {
      error: {
        status: 400,
        message: `Unsupported currency: ${resolvedCurrency}`,
      },
    };
  }

  const { subtotal: baseSubtotal, total: baseTotal } = normalizeTotals(cart);
  let rate = 1;
  let effectiveCurrency = resolvedCurrency;
  if (resolvedCurrency !== baseCurrency) {
    try {
      rate = await getRate(baseCurrency, resolvedCurrency);
    } catch (err) {
      console.error("Currency conversion failed, falling back to INR:", err.message);
      rate = 1;
      effectiveCurrency = baseCurrency;
    }
  }

  const subtotal = Number((baseSubtotal * rate).toFixed(2));
  const total = Number((baseTotal * rate).toFixed(2));

  const orderItems = cart.items.map((item) => {
    const basePrice = Number(item.course.price || 0);
    const price = Number((basePrice * rate).toFixed(2));
    return {
      course: item.course._id,
      title: item.course.title || item.course.landingTitle || "Course",
      price,
      quantity: item.quantity || 1,
      basePrice,
    };
  });

  const order = await Order.create({
    user: userId,
    items: orderItems,
    currency: effectiveCurrency,
    baseCurrency,
    couponCode: cart.couponCode || null,
    discountPercentage: cart.discountPercentage || 0,
    subtotal,
    total,
    baseSubtotal,
    baseTotal,
    paymentMethod,
    source: "cart",
    status: "pending",
  });

  return { order, cart };
};

const clearCart = async (cart, userId) => {
  const targetCart = cart || (await Cart.findOne({ user: userId }));
  if (!targetCart) return;
  targetCart.items = [];
  targetCart.couponCode = null;
  targetCart.discountPercentage = 0;
  targetCart.totalBeforeDiscount = 0;
  targetCart.totalAfterDiscount = 0;
  await targetCart.save();
};

exports.checkoutCart = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const paymentMethod = req.body?.paymentMethod || "manual";
    const currency = req.body?.currency || "INR";

    const { order, cart, error } = await createOrderFromCart({
      userId,
      paymentMethod,
      currency,
    });
    if (error) {
      return res.status(error.status).json(error);
    }

    if (order.total <= 0) {
      order.status = "paid";
      order.paidAt = new Date();
      await order.save();

      const enrollments = await fulfillOrder(order);
      await clearCart(cart, userId);

      return res.json({
        message: "Order completed (free checkout)",
        order,
        enrollments,
      });
    }

    return res.json({
      message: "Order created",
      order,
      requiresPayment: true,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.createStripeSession = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe is not configured" });
    }

    const userId = req.user._id || req.user.id;
    const currency = req.body?.currency || "INR";
    const { order, error } = await createOrderFromCart({
      userId,
      paymentMethod: "stripe",
      currency,
    });
    if (error) {
      return res.status(error.status).json(error);
    }

    if (order.total <= 0) {
      order.status = "paid";
      order.paidAt = new Date();
      await order.save();
      const enrollments = await fulfillOrder(order);
      await clearCart(null, userId);
      return res.json({
        message: "Order completed (free checkout)",
        order,
        enrollments,
        requiresPayment: false,
      });
    }

    const discount = Number(order.discountPercentage || 0);
    const lineItems = order.items.map((item) => {
      const basePrice = Number(item.price || 0);
      const discountedPrice =
        discount > 0 ? (basePrice * (100 - discount)) / 100 : basePrice;
      return {
        quantity: item.quantity || 1,
        price_data: {
          currency: order.currency.toLowerCase(),
          unit_amount: Math.max(0, Math.round(discountedPrice * 100)),
          product_data: {
            name: item.title || "Course",
          },
        },
      };
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      metadata: {
        orderId: order._id.toString(),
        userId: userId.toString(),
      },
      success_url: `${frontendUrl}/payment?status=success&orderId=${order._id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/payment?status=cancelled&orderId=${order._id}`,
    });

    order.paymentReference = session.id;
    await order.save();

    res.json({
      message: "Stripe session created",
      order,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe session error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.confirmOrder = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { orderId, paymentMethod, paymentReference } = req.body || {};

    if (!orderId) {
      return res.status(400).json({ message: "orderId is required" });
    }

    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status === "paid") {
      return res.json({ message: "Order already paid", order });
    }

    if (order.total > 0) {
      const allowManual =
        process.env.NODE_ENV !== "production" ||
        process.env.PAYMENT_MODE === "manual";

      if (!paymentReference && !allowManual) {
        return res.status(400).json({
          message: "paymentReference is required for paid orders",
        });
      }
    }

    order.status = "paid";
    order.paymentMethod = paymentMethod || order.paymentMethod || "manual";
    order.paymentReference = paymentReference || order.paymentReference || null;
    order.paidAt = new Date();
    await order.save();

    const enrollments = await fulfillOrder(order);

    if (order.source === "cart") {
      await clearCart(null, userId);
    }

    res.json({
      message: "Payment confirmed and enrollment completed",
      order,
      enrollments,
    });
  } catch (error) {
    console.error("Confirm order error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
