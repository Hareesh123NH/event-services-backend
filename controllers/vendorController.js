const bcrypt = require("bcryptjs");
const { VendorRegistration, Media } = require("../models/Vendor");
const { Service } = require("../models/Service");
const mongoose=require('mongoose');

// Vendor Registration with documents
const registerVendor = async (req, res) => {
  try {
    const { vendor_name, email, password, phonenumber, desc, address, location, service_id } = req.body || {};

    // Validate required fields
    if (!vendor_name || !email || !password || !phonenumber || !location || !service_id) {

      return res.status(400).json({ error: "All required fields must be provided" });
    }

    if (await VendorRegistration.findOne({ email })) {
      return res.status(400).json({ error: "Your details are under verification!" });
    }

    if(!mongoose.Types.ObjectId.isValid(service_id) || !await Service.findById(service_id)){
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
    const newVendor = await VendorRegistration.create({
      vendor_name, email, password: hashedPassword,
      phonenumber, desc, address, location:loc, service_id
    });

    // Save uploaded files
    let uploadedFiles = [];
    const docFields = ["aadhar", "pancard", "business_doc"];
    for (let field of docFields) {

      if (req.files[field]) {

        for (let file of req.files[field]) {

          const mediaDoc = await Media.create({
            owner_type: "Vendor",          // the type of owner
            owner_id: newVendor._id,       // link to the vendor
            file_data: file.buffer,        // the actual file data
            mime_type: file.mimetype,      // file MIME type
            file_name:`${field}_${file.originalname}`            // e.g., "aadhar", "pancard"
          });
          uploadedFiles.push({
            mime_type:mediaDoc.mime_type,
            file:mediaDoc.file_name
          });
        }
      }
    }


    return res.status(201).json({
      message: "Vendor registered successfully",
      vendor: newVendor,
      documents: uploadedFiles
    });

  } catch (error) {
    console.error("Vendor registration error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { registerVendor };
