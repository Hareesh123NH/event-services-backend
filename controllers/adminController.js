const { Admin } = require('../models/User');
const bcrypt = require("bcryptjs");
const { VendorRegistration, Media, Vendor, VendorVerification } = require("../models/Vendor");
const { VendorService, Service } = require('../models/Service');
const mongoose = require('mongoose');

// Admin Signup
const adminSignup = async (req, res) => {
  try {
    const { full_name, email, password, phone_number } = req.body || {};

    // Validate required fields
    if (!full_name || !email || !password) {
      return res.status(400).json({ message: "Full name, email, and password are required" });
    }

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin with this email already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    const newAdmin = new Admin({
      full_name,
      email,
      password: hashedPassword,
      phone_number,
    });

    const savedAdmin = await newAdmin.save();

    res.status(201).json({
      message: "Admin registered successfully",
      admin: {
        id: savedAdmin._id,
        full_name: savedAdmin.full_name,
        email: savedAdmin.email,
        phone_number: savedAdmin.phone_number,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// Admin rejects vendor
const rejectVendor = async (req, res) => {
  try {
    const vendorId = req.params.id;

    // Check if vendor exists
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ error: "Invalid vendor id" });
    }

    const vendor = await VendorRegistration.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    deleteVendorRegistration(vendorId)

    res.status(200).json({ message: "Vendor rejected and related media deleted" });
  } catch (error) {
    console.error("Error rejecting vendor:", error);
    res.status(500).json({ message: "Server error" });
  }
};

async function deleteVendorRegistration(vendorId) {

  // Delete all media files linked to this vendor
  await Media.deleteMany({
    owner_type: "VendorRegistration",
    owner_id: vendorId,
  });

  // Delete vendor registration
  await VendorRegistration.findByIdAndDelete(vendorId);

}

const acceptVendor = async (req, res) => {

  const vendorId = req.params.id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check if vendor exists
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ error: "Invalid vendor id" });
    }

    const vendorReg = await VendorRegistration.findById(vendorId).session(session);
    if (!vendorReg) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    if (await Vendor.findOne({ email: vendorReg.email }).session(session)) {

      deleteVendorRegistration(vendorId);

      return res.status(400).json({ message: "Vendor already exist!" })
    }

    // ✅ Create Vendor entry
    const newVendor = new Vendor({
      full_name: vendorReg.vendor_name,
      email: vendorReg.email,
      password: vendorReg.password,
      phone_number: vendorReg.phonenumber,
      description: vendorReg.desc,
      address: vendorReg.address,
      location: vendorReg.location
    });
    await newVendor.save({ session });

    // ✅ Update Media (reassign ownership)
    await Media.updateMany(
      { owner_id: vendorReg._id, owner_type: "VendorRegistration" },
      { $set: { owner_id: newVendor._id, owner_type: "Vendor" } },
      { session }
    );


    const service = await Service.findById(vendorReg.service_id).session(session);

    // ✅ Create VendorService (linked with chosen service)
    const vendorService = new VendorService({
      vendor: newVendor._id,
      service: service._id,
      price: service.base_price, // default or based on logic
      discount_price: service.base_price
    });
    await vendorService.save({ session });

    // ✅ Create VendorVerification
    const verification = new VendorVerification({
      vendor: newVendor._id,
      admin: req.user.id,
      remarks: "Accepted vendor registration",
      decision_at: new Date()
    });
    await verification.save({ session });

    // ✅ Delete from registration
    await VendorRegistration.findByIdAndDelete(vendorId).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Vendor accepted Successfully",
      venderId: newVendor._id
    });

  } catch (error) {

    await session.abortTransaction();
    session.endSession();

    console.error("Error Accepting vendor:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// GET all vendor registrations with media
const getAllVendorRegistrations = async (req, res) => {
  try {
    // 1️ Fetch vendors
    const vendors = await VendorRegistration.find()
      .select("vendor_name email phonenumber desc address")
      .populate("service","_id service_name base_price pricing_type")
      .lean();

    // 2️ Fetch media for each vendor
    const vendorIds = vendors.map(v => v._id);
    const mediaList = await Media.find({
      owner_type: "VendorRegistration",
      owner_id: { $in: vendorIds }
    }).select("_id mime_type owner_id");

    // 3️ Map media to vendors
    const vendorsWithMedia = vendors.map(vendor => {
      const mediaForVendor = mediaList.filter(m => m.owner_id.toString() === vendor._id.toString());
      return {
        ...vendor,
        media: mediaForVendor.map(m => ({ id: m._id, mime_type: m.mime_type }))
      };
    });

    res.json(vendorsWithMedia);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};


module.exports = { adminSignup, rejectVendor, acceptVendor, getAllVendorRegistrations };