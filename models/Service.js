const mongoose = require("mongoose");

const { Schema } = mongoose;
const { Vendor } = require("./Vendor");

// 🔹 Services
const serviceSchema = new Schema({
  service_name: { type: String, required: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, required: true },
  description: String,
  base_price: Number,
  pricing_type: { type: String, enum: ["per_day", "per_hour", "fixed","per_person"], default: "per_day" }
}, { timestamps: true });

// 🔹 Vendor Services
const vendorServiceSchema = new Schema({
  vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
  service: { type: Schema.Types.ObjectId, ref: "Service", required: true },
  price: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 10, min: 0, max: 100 },
  final_price: { type: Number, required: true },
  average_rating: { type: Number, default: 2.5, min: 0, max: 5 },
  total_bookings: { type: Number, default: 15 },
  status: { type: String, enum: ["active", "inactive", "suspended"], default: "active" },
  addons: [{
    title: String,
    price: Number,
    description: String
  }],
  notes: String,
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  }
}, { timestamps: true });



vendorServiceSchema.index({ location: "2dsphere" });



const Service = mongoose.model("Service", serviceSchema);
const VendorService = mongoose.model("VendorService", vendorServiceSchema);


module.exports = {
  Service,
  VendorService
};


