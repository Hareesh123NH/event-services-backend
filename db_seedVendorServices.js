import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { Service, VendorService } from "./models/Service.js";
import { Vendor } from "./models/Vendor.js";

// ===== MODELS =====
// const vendorSchema = new mongoose.Schema({
//   full_name: String,
//   email: String,
//   password: String,
//   phone_number: String,
//   description: String,
//   address: String,
//   location: {
//     type: { type: String },
//     coordinates: [Number]
//   }
// });

// const serviceSchema = new mongoose.Schema({
//   service_name: String,
//   created_by: mongoose.Schema.Types.ObjectId,
//   description: String,
//   base_price: Number,
//   pricing_type: String
// });

// const vendorServiceSchema = new mongoose.Schema({
//   vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
//   service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
//   price: { type: Number, required: true, min: 0 },
//   discount: { type: Number, default: 10, min: 0, max: 100 },
//   final_price: { type: Number, required: true },
//   average_rating: { type: Number, default: 2.5, min: 0, max: 5 },
//   total_bookings: { type: Number, default: 15 },
//   status: { type: String, enum: ["active", "inactive", "suspended"], default: "active" },
//   addons: [{
//     title: String,
//     price: Number,
//     description: String
//   }],
//   notes: String,
//   location: {
//     type: { type: String, enum: ["Point"], default: "Point" },
//     coordinates: { type: [Number], required: true }
//   }
// }, { timestamps: true });

// const Vendor = mongoose.model("Vendor", vendorSchema);
// const Service = mongoose.model("Service", serviceSchema);
// const VendorService = mongoose.model("VendorService", vendorServiceSchema);

// ===== MAIN FUNCTION =====
async function seedVendorServices() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const vendors = await Vendor.find({});
    const services = await Service.find({});

    if (vendors.length !== 56) {
        console.error("⚠️ Expected 56 vendors (2 per 28 states), found:", vendors.length);
        return;
    }

    if (services.length !== 24) {
        console.error("⚠️ Expected 24 services, found:", services.length);
        return;
    }

    const vendorServices = [];

    for (let i = 0; i < vendors.length; i += 2) {
        const vendor1 = vendors[i];
        const vendor2 = vendors[i + 1];

        // first 12 services for vendor1
        for (let j = 0; j < 12; j++) {
            const svc = services[j];
            const price = svc.base_price;
            const discount = 10;
            const final_price = price - (price * discount) / 100;

            vendorServices.push({
                vendor: vendor1._id,
                service: svc._id,
                price,
                discount,
                final_price,
                location: vendor1.location
            });
        }

        // next 12 services for vendor2
        for (let j = 12; j < 24; j++) {
            const svc = services[j];
            const price = svc.base_price;
            const discount = 10;
            const final_price = price - (price * discount) / 100;

            vendorServices.push({
                vendor: vendor2._id,
                service: svc._id,
                price,
                discount,
                final_price,
                location: vendor2.location
            });
        }
    }

    await VendorService.insertMany(vendorServices);
    console.log(`✅ Inserted ${vendorServices.length} vendor-services successfully!`);

    mongoose.connection.close();
}

seedVendorServices().catch(console.error);
