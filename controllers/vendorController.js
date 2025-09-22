const bcrypt = require("bcryptjs");
const { VendorRegistration, Media } = require("../models/Vendor");
const { Service } = require("../models/Service");
const mongoose = require('mongoose');

// Vendor Registration with documents
const registerVendor = async (req, res) => {

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { vendor_name, email, password, phonenumber, desc, address, location, service_id } = req.body || {};

    // Validate required fields
    if (!vendor_name || !email || !password || !phonenumber || !location || !service_id) {

      return res.status(400).json({ error: "All required fields must be provided" });
    }

    if (await VendorRegistration.findOne({ email }).session(session)) {
      return res.status(400).json({ error: "Your details are under verification!" });
    }

    if (!mongoose.Types.ObjectId.isValid(service_id) || !await Service.findById(service_id).session(session)) {
      return res.status(400).json({ error: "Invalid service id" });
    }

    let loc;
    try {
      loc = typeof location === "string" ? JSON.parse(location) : location;
    } catch (err) {
      return res.status(400).json({ error: "Invalid location format" });
    }

    if (!Array.isArray(loc.coordinates) || loc.coordinates.length !== 2) {
      return res.status(400).json({ error: "Location must have coordinates [lng, lat]" });
    }



    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create vendor
    const vendorDoc = new VendorRegistration({
      vendor_name,
      email,
      password: hashedPassword,
      phonenumber,
      desc,
      address,
      location: loc,
      service:service_id
    });

    const newVendor = await vendorDoc.save({ session });


    // Save uploaded files
    let uploadedFiles = [];
    const docFields = ["aadhar", "pancard", "business_doc"];

    for (let field of docFields) {
      if (req.files[field]) {
        for (let file of req.files[field]) {
          const mediaDoc = new Media({
            owner_type: "VendorRegistration",          // always Vendor after acceptance
            owner_id: newVendor._id,       // link to the vendor
            file_data: file.buffer,        // the actual file data
            mime_type: file.mimetype,      // file MIME type
            file_name: `${field}_${file.originalname}` // prefix with field name
          });

          const savedMedia = await mediaDoc.save({ session });

          uploadedFiles.push({
            mime_type: savedMedia.mime_type,
            file: savedMedia.file_name,
            fileId:savedMedia._id
          });
        }
      }
    }

    // 🔹 Abort transaction if no files uploaded
    if (uploadedFiles.length === 0) {

      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "At least one document (Aadhar, PAN, Business Doc) is required" });
    }


    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Vendor registered successfully",
      vendor: newVendor,
      documents: uploadedFiles
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Vendor registration error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { registerVendor };
