const { Address, User } = require('../models/User')
const mongoose = require('mongoose');
const { Service, VendorService } = require("../models/Service");
const { Vendor } = require("../models/Vendor");


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
    } = req.body || {};

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



// Update profile (full_name & password)
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, phone_number } = req.body || {};

    // if nothing provided
    if (!full_name || !phone_number) {
      return res.status(400).json({ message: "Please provide data to update" });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId },
      { full_name, phone_number }, // direct update
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        full_name: updatedUser.full_name,
        email: updatedUser.email,
        phone_number: updatedUser.phone_number,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


//get vendor services
// const searchVendorServices = async (req, res) => {
//     try {
//       let { query, page, limit } = req.query;

//       // ---------- DEFAULTS ----------
//       if (!page) page = 1;        // default page = 1
//       if (!limit) limit = 10;     // default limit = 10
//       if (!query) query = "";     // default query = "" (means fetch all)

//       // ---------- VALIDATIONS ----------
//       page = parseInt(page);
//       limit = parseInt(limit);

//       if (isNaN(page) || page <= 0) {
//         return res.status(400).json({
//           success: false,
//           message: "Page must be a positive integer",
//         });
//       }

//       if (isNaN(limit) || limit <= 0 || limit > 100) {
//         return res.status(400).json({
//           success: false,
//           message: "Limit must be between 1 and 100",
//         });
//       }

//       let filter = { status: "active" };

//       // ---------- IF USER GAVE QUERY ----------
//       if (query.trim().length > 0) {
//         const services = await Service.find({
//           name: { $regex: query, $options: "i" },
//         }).select("_id");

//         if (services.length === 0) {
//           return res.status(200).json({
//             success: true,
//             message: "No vendor services found",
//             data: [],
//             pagination: { total: 0, page, limit },
//           });
//         }

//         const serviceIds = services.map((s) => s._id);
//         filter.service = { $in: serviceIds };
//       }

//       // ---------- FETCH VENDOR SERVICES ----------
//       const total = await VendorService.countDocuments(filter);

//       const vendorServices = await VendorService.find(filter)
//         .populate("vendor", "name email phone")
//         .populate("service", "name description category")
//         .skip((page - 1) * limit)
//         .limit(limit)
//         .sort({ createdAt: -1 });

//       return res.status(200).json({
//         success: true,
//         message: "Vendor services fetched successfully",
//         data: vendorServices,
//         pagination: {
//           total,
//           page,
//           limit,
//           totalPages: Math.ceil(total / limit),
//         },
//       });
//     } catch (error) {
//       console.error("Search VendorServices Error:", error);
//       return res.status(500).json({
//         success: false,
//         message: "Server error",
//         error: error.message,
//       });
//     }
//   };



const searchVendorServices = async (req, res) => {
  try {
    let { query, page, limit, maxDistance } = req.query;
    const { addressId } = req.params;

    // ---------- DEFAULTS ----------
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    maxDistance = parseInt(maxDistance) || 10000; // default 10 km
    query = query ? query.trim() : "";

    // ---------- VALIDATIONS ----------
    if (page <= 0 || limit <= 0 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters",
      });
    }

    // ---------- FETCH USER ADDRESS ----------
    const userAddress = await Address.findById(addressId);
    if (!userAddress || !userAddress.location || !userAddress.location.coordinates) {
      return res.status(400).json({
        success: false,
        message: "User address with valid coordinates not found",
      });
    }

    // ---------- FIND MATCHING SERVICES ----------
    let serviceFilter = {};

    const matchedServices = await Service.find({
      service_name: { $regex: query, $options: "i" },
    }).select("_id");
    if (matchedServices.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No vendor services found for the given query",
        data: [],
        pagination: { total: 0, page, limit },
      });
    }
    serviceFilter = { service: { $in: matchedServices.map(s => s._id) } };



    // ---------- AGGREGATION PIPELINE ----------
    const pipeline = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: userAddress.location.coordinates
          },
          distanceField: "distance",
          spherical: true,
          maxDistance: maxDistance
        }
      },
      {
        $lookup: {
          from: "vendors",
          localField: "vendor",
          foreignField: "_id",
          as: "vendor"
        }
      },
      { $unwind: "$vendor" },
      {
        $match: serviceFilter
      },
      {
        $lookup: {
          from: "services",
          localField: "service",
          foreignField: "_id",
          as: "service"
        }
      },
      { $unwind: "$service" },
      { $sort: { distance: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          final_price: 1,
          average_rating: 1,
          total_bookings: 1,
          distance: 1,
          "vendor._id": 1,
          "vendor.full_name": 1,
          "vendor.email": 1,
          "vendor.phone_number": 1,
          "vendor.location": 1,
          "service.service_name": 1,
          "service.description": 1
        }
      }
    ];

    const vendorServices = await VendorService.aggregate(pipeline);

    // ---------- COUNT TOTAL ----------
    const total = vendorServices.length;

    return res.status(200).json({
      success: true,
      message: "Nearby vendor services fetched successfully",
      data: vendorServices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Search VendorServices Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


module.exports = {
  createAddress,
  updateAddress,
  getAddresses,
  updateProfile,
  searchVendorServices
};
