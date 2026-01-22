const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, default: "" },
    price: { type: Number, default: 0 },
    quantity: { type: Number, default: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    currency: { type: String, default: "INR" },
    couponCode: { type: String, default: null },
    discountPercentage: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled"],
      default: "pending",
    },
    paymentMethod: { type: String, default: "manual" },
    paymentReference: { type: String, default: null },
    paidAt: { type: Date, default: null },
    source: { type: String, enum: ["cart", "single"], default: "cart" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
