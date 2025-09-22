const mongoose = require("mongoose");

const { Schema } = mongoose;
const Vendor=require("./Vendor");

// 🔹 Services
const serviceSchema = new Schema({
  service_name: { type: String, required: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, required: true},
  description: String,
  base_price: Number,
  pricing_type: { type: String, enum: ["per_day", "per_hour", "fixed"], default: "per_day" }
}, { timestamps: true });

// 🔹 Vendor Services
const vendorServiceSchema = new Schema({
  vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
  service: { type: Schema.Types.ObjectId, ref: "Service", required: true },
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  final_price:{ type: Number, default: 0 , required: true},
  average_rating: { type: Number, default: 2.5 },
  total_bookings: { type: Number, default: 0 },
  status: { type: String, enum: ["active", "inactive", "suspended"], default: "active" },
  addons: [{
    title: String,
    price: Number,
    description: String
  }],
  notes: String
}, { timestamps: true });


const Service = mongoose.model("Service", serviceSchema);
const VendorService = mongoose.model("VendorService", vendorServiceSchema);


module.exports = {
  Service,
  VendorService
};


