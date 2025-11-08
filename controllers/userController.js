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

    res.json({ message: "Address updated successfully" });
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



const searchVendorServices = async (req, res) => {
  try {
    let { query, page, limit, maxDistance, addressId } = req.query;

    const { coords } = req.body || {};

    // ---------- DEFAULTS ----------
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    maxDistance = parseInt(maxDistance) * 1000 || 10000;
    query = query ? query.trim() : "";

    // ---------- VALIDATIONS ----------
    if (page <= 0 || limit <= 0 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters",
      });
    }


    // ---------- DETERMINE LOCATION ----------
    let userCoordinates = null;

    console.log(coords, addressId, maxDistance / 1000);

    if (coords && Array.isArray(coords) && coords.length === 2) {
      userCoordinates = coords;
    } else if (addressId) {
      const userAddress = await Address.findById(addressId);
      if (
        !userAddress ||
        !userAddress.location ||
        !Array.isArray(userAddress.location.coordinates)
      ) {
        return res.status(400).json({
          success: false,
          message: "User address with valid coordinates not found",
        });
      }
      userCoordinates = userAddress.location.coordinates;
    } else {
      return res.status(400).json({
        success: false,
        message: "Either coords or addressId must be provided",
      });
    }

    // ---------- FIND MATCHING SERVICES ----------
    let serviceFilter = {};

    const matchedServices = await Service.find({
      $or: [
        { service_name: { $regex: query, $options: "i" } }, // service_name includes query
        { $expr: { $regexMatch: { input: query, regex: "$service_name", options: "i" } } } // query includes service_name
      ]
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
            coordinates: userCoordinates
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
        $match: {
          ...serviceFilter,
          "status": "active"
        }
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
      { $limit: limit + 1 },
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

    const isLastPage = vendorServices.length <= limit;

    // remove the extra record if we fetched one more
    const paginatedServices = isLastPage
      ? vendorServices
      : vendorServices.slice(0, limit);


    return res.status(200).json({
      success: true,
      message: "Nearby vendor services fetched successfully",
      data: paginatedServices,
      pagination: {
        page,
        limit,
        isLastPage,
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


//get vendor service by ID
const getVendorServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor service ID format",
      });
    }

    const vendorService = await VendorService.findById(id)
      // exclude fields directly here
      .select("-location -createdAt -updatedAt -__v")
      .populate({
        path: "vendor",
        select: "full_name email phone_number description address",
      })
      .populate({
        path: "service",
        select: "service_name description base_price pricing_type",
      });

    if (!vendorService) {
      return res.status(404).json({
        success: false,
        message: "Vendor service not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Vendor service details fetched successfully",
      data: vendorService,
    });
  } catch (error) {
    console.error("Error fetching vendor service details:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  createAddress,
  updateAddress,
  getAddresses,
  searchVendorServices,
  getVendorServiceById,
};
