const mongoose = require("mongoose");

const { Schema } = mongoose;
const Admin=require("./User");
const Service=require("./Service");


// 🔹 Vendors
const vendorSchema = new Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone_number: String,
  description: String,
  rating: { type: Number, default: 0.0 },
  address: String,
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  }
}, { timestamps: true });
vendorSchema.index({ location: "2dsphere" });


// 🔹 Vendor Verifications
const vendorVerificationSchema = new Schema({
  vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
  admin: { type: Schema.Types.ObjectId, ref: "Admin" },
  submitted_at: { type: Date, default: Date.now },
  decision_at: Date,
  remarks: String,
  supporting_documents: String
});


// 🔹 Media
const mediaSchema = new Schema({
  owner_type: { type: String, enum: ["vendor", "vendor_service", "user", "order", "verification"], required: true },
  owner_id: { type: Schema.Types.ObjectId, required: true },
  file_url: { type: String, required: true },
  mime_type: String,
  description: String
}, { timestamps: true });


// 🔹 VendorRegistration
const VendorRegistrationSchema = new Schema({
  Vender_name: { type: String, required: true },
  Email: { type: String, required: true, unique: true },
  Password: { type: String, required: true },
  Phonenumber: { type: String, required: true },
  Desc: String,
  Address: String,
  Latitude: { type: String, required: true },
  Longtitude: { type: String, required: true }, // keep same spelling as table
  Service_id: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true }
}, { timestamps: true });



// ✅ Models
const Vendor = mongoose.model("Vendor", vendorSchema);
const VendorVerification = mongoose.model("VendorVerification", vendorVerificationSchema);
const Media = mongoose.model("Media", mediaSchema);
const VendorRegistration = mongoose.model("VendorRegistration", VendorRegistrationSchema);


module.exports = {
  Vendor,
  VendorVerification,
  Media,
  VendorRegistration
};


