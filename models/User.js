const mongoose = require("mongoose");
const { Schema } = mongoose;

const Vendor = require("./Vendor");
const OrderDetail = require("./Service");

// 🔹 Users
const userSchema = new Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone_number: { type: String }
}, { timestamps: true });

// 🔹 Admins
const adminSchema = new Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone_number: { type: String }
}, { timestamps: true });


// 🔹 Addresses
const addressSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  label: String,
  address_line1: String,
  address_line2: String,
  city: String,
  state: String,
  postal_code: String,
  country: { type: String, default: "India" },
  alternate_phone: String,
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true }
  }
}, { timestamps: true });

addressSchema.index(
  { user: 1, "location.coordinates": 1 },
  { unique: true }
);


// 🔹 Reviews
const reviewSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  order_detail: { type: Schema.Types.ObjectId, ref: "OrderDetail" },
  vendor: { type: Schema.Types.ObjectId, ref: "Vendor" },
  rating: { type: Number, required: true },
  comment: String,
  review_date: { type: Date, default: Date.now }
}, { timestamps: true });


// ✅ Models
const User = mongoose.model("User", userSchema);
const Admin = mongoose.model("Admin", adminSchema);
const Address = mongoose.model("Address", addressSchema);
const Review = mongoose.model("Review", reviewSchema);


module.exports = {
  User,
  Admin,
  Address,
  Review
};

