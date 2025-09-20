const { Service } = require("../models/Service");
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
        service_name,
        description,
        base_price,
        pricing_type,
      });
  
      const savedService = await newService.save();
  
      res.status(201).json({
        message: "Service created successfully",
        service_id: savedService._id,
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
        message: "Services fetched successfully",
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
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  };

module.exports = { createService, getService ,updateService};



