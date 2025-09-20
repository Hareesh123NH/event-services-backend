const { Admin} = require('../models/User');
const bcrypt = require("bcryptjs");
const { VendorRegistration, Media } = require("../models/Vendor");
const mongoose=require('mongoose');

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
      const vendorId= req.params.id;
  
      // Check if vendor exists
      if(!mongoose.Types.ObjectId.isValid(vendorId)){
        return res.status(400).json({ error: "Invalid vendor id" });
      }
  
      const vendor = await VendorRegistration.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
  
      // Delete vendor registration
      await VendorRegistration.findByIdAndDelete(vendorId);
  
      // Delete all media files linked to this vendor
      await Media.deleteMany({
        owner_type: "VendorRegistration",
        owner_id: vendorId,
      });
  
      res.status(200).json({ message: "Vendor rejected and related media deleted" });
    } catch (error) {
      console.error("Error rejecting vendor:", error);
      res.status(500).json({ message: "Server error" });
    }
  };
 
  module.exports = { adminSignup ,rejectVendor};