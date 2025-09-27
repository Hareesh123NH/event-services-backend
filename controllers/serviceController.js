const { Service, VendorService } = require("../models/Service");
const mongoose = require('mongoose');


// post:create service

const createService = async (req, res) => {
  try {
    const { service_name, description, base_price, pricing_type } = req.body;

    // Validate required fields
    if (!service_name || !description || !base_price) {
      return res.status(400).json({ message: "Service name, description, and base_price are required" });
    }

    // Check if service already exists
    const existingService = await Service.findOne({ service_name });
    if (existingService) {
      return res.status(400).json({ message: "Service with this name already exists" });
    }

    // Create new service
    const newService = new Service({
      created_by: req.user.id,
      service_name,
      description,
      base_price,
      pricing_type,
    });

    const savedService = await newService.save();

    res.status(201).json({
      message: "Service created successfully",
      service_id: savedService._id,
      created_by: savedService.created_by
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// get:get services

const getService = async (req, res) => {
  try {
    const services = await Service.find();

    const result = services.map(s => ({
      service_id: s._id,
      service_name: s.service_name,
      description: s.description,
      base_price: s.base_price,
      pricing_type: s.pricing_type,
    }));

    res.status(200).json({
      services: result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

//put: update service 
const updateService = async (req, res) => {
  try {
    const serviceId = req.params.id;
    const updates = req.body;

    // If no fields provided
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Please provide at least one field to update" });
    }

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ error: "Invalid service id" });
    }

    // Check for null or empty string in any provided field
    for (const key in updates) {
      if (updates[key] === null || updates[key] === "") {
        return res.status(400).json({ message: `${key} cannot be null or empty` });
      }
    }

    const updatedService = await Service.findByIdAndUpdate(
      serviceId,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedService) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.status(200).json({
      message: "Service updated successfully",
      service: {
        service_id: updatedService._id,
        service_name: updatedService.service_name,
        description: updatedService.description,
        base_price: updatedService.base_price,
        pricing_type: updatedService.pricing_type,
        created_by: updatedService.created_by
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// Update VendorService
const updateVendorService = async (req, res) => {
  try {
    const vendorId = req.user.id; // From JWT middleware
    const { serviceId } = req.params;

    const { price, discount, status, addons, notes } = req.body;


    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ error: "Invalid service id" });
    }

    // Find VendorService record
    const vendorService = await VendorService.findOne({
      vendor: vendorId,
      service: serviceId
    });

    if (!vendorService) {
      return res.status(404).json({ message: "Vendor service not found" });
    }


    const updatedResponse = {};

    // Update fields conditionally
    if (price !== undefined) {
      if (price <= 0) return res.status(400).json({ message: "Price must be greater than 0" });
      vendorService.price = price;
      updatedResponse.price = price;
    }

    if (discount !== undefined) {
      if (discount < 0 || discount > 100) {
        return res.status(400).json({ message: "Discount must be between 0 and 100" });
      }
      vendorService.discount = discount;
      updatedResponse.discount = discount;
    }

    // ✅ Recalculate final_price if price or discount is updated
    vendorService.final_price = vendorService.price - (vendorService.price * vendorService.discount / 100);
    updatedResponse.price = vendorService.price;
    updatedResponse.final_price = vendorService.final_price;

    // ✅ Update status but restrict to only "active" or "inactive"
    if (status !== undefined) {
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({ message: "Status can only be 'active' or 'inactive'" });
      }
      vendorService.status = status;
      updatedResponse.status = status;
    }

    // ✅ Update addons if provided
    if (addons !== undefined) {
      if (!Array.isArray(addons)) {
        return res.status(400).json({ message: "Addons must be an array" });
      }
      vendorService.addons = addons;
      updatedResponse.addons = addons;
    }


    await vendorService.save();

    return res.status(200).json({
      message:"Successfully updated vender-service",
      updatedResponse
    })
  }
  catch (error) {
    console.error("Error updating vendor service:", error);
    res.status(500).json({ message: "Server error" });
  }
}


const getVendorServices = async (req, res) => {
  try {
    const vendorId = req.user.id; // ✅ from JWT middleware

    const services = await VendorService.find({ vendor: vendorId })
      .select("-vendor -service -_id -createdAt -updatedAt -__v")
      .populate("service", "service_name base_price pricing_type") // get service details
      .lean();

    if (!services || services.length === 0) {
      return res.status(404).json({ message: "No services found for this vendor" });
    }

    res.status(200).json({
      services
    });
  } catch (error) {
    console.error("Error fetching vendor services:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//post: add existing services

const addVendorService = async (req, res) => {
  try {
    const vendorId = req.user.id; // from JWT
    const { serviceId } = req.params;
    let { price, discount } = req.body || {};
    const { status, addons, notes } = req.body || {};

    // Check if service exists
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Check if vendor already has this service
    const existing = await VendorService.findOne({ vendor: vendorId, service: serviceId });
    if (existing) {
      return res.status(400).json({ message: "You already have this service" });
    }

    // Apply defaults if not provided
    price = (price && price > 0) ? price : service.base_price;
    discount = (discount && discount >= 0 && discount <= 100 ? discount : 0);
    const appliedDiscount = price * discount / 100;

    // Ensure finalPrice can't be negative
    const computedFinalPrice = price - appliedDiscount;

    let appliedStatus = "active";
    if (status && ["active", "inactive"].includes(status)) {
      appliedStatus = status;
    }

    // Create VendorService
    const newVendorService = new VendorService({
      vendor: vendorId,
      service: serviceId,
      price: price,
      discount: discount,
      final_price: computedFinalPrice,
      status: appliedStatus,
      addons: addons || [],
      notes: notes || ""
    });

    const saved = await newVendorService.save();

    res.status(201).json({
      message: "Service added to vendor successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { createService, getService, updateService, updateVendorService, getVendorServices, addVendorService };




