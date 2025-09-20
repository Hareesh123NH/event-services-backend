const { Address } = require('../models/User')
const mongoose=require('mongoose');

// Create a new address
const createAddress = async (req, res) => {
  try {
    const {
      label,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      alternate_phone,
      location
    } = req.body ||{} ;

    if (!location || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
      return res.status(400).json({ message: "Location coordinates [longitude, latitude] required" });
    }

    const newAddress = new Address({
      user: req.user.id, // from authMiddleware
      label,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country: country || "India",
      alternate_phone,
      location
    });

    await newAddress.save();
    res.status(201).json({ message: "Address created successfully", address: newAddress });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "This location already exists for the user" });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update an existing address
const updateAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const updates = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    if (updates.location) {
      if (!Array.isArray(updates.location.coordinates) || updates.location.coordinates.length !== 2) {
        return res.status(400).json({ message: "Location coordinates [longitude, latitude] required" });
      }
    }

    const updatedAddress = await Address.findOneAndUpdate(
      { _id: addressId, user: req.user.id },
      updates,
      { new: true }
    );

    if (!updatedAddress) {
      return res.status(404).json({ message: "Address not found" });
    }

    res.json({ message: "Address updated successfully", address: updatedAddress });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all addresses of the user
const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user.id });
    res.json({ addresses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createAddress,
  updateAddress,
  getAddresses
};
