import mongoose from "mongoose";
import dotenv from "dotenv";
import { Service } from "./models/Service.js";


dotenv.config();

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("✅ MongoDB connected"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

async function insertServices() {
  await mongoose.connect(process.env.MONGO_URI);

  const createdBy = new mongoose.Types.ObjectId("68d0e57cb8f8ae1d0c031820");

  const services = [
    { service_name: "Photography", description: "Professional photography services for weddings, parties, and corporate events.", base_price: 5000, pricing_type: "per_day" },
    { service_name: "Videography", description: "High-quality video recording and editing for all occasions.", base_price: 7000, pricing_type: "per_day" },
    { service_name: "Stage Decoration", description: "Creative stage setups with lights and floral decorations.", base_price: 8000, pricing_type: "fixed" },
    { service_name: "Catering", description: "Delicious multi-cuisine catering services for all events.", base_price: 300, pricing_type: "per_person" }, // if you want only enum types, change to per_day
    { service_name: "Makeup & Styling", description: "Professional makeup and hairstyling for brides, grooms, and guests.", base_price: 4000, pricing_type: "per_day" },
    { service_name: "Lighting", description: "Event lighting setups for indoor and outdoor venues.", base_price: 2000, pricing_type: "per_day" },
    { service_name: "Sound System", description: "Sound setup including speakers, mics, and mixers.", base_price: 2500, pricing_type: "per_day" },
    { service_name: "Venue Decoration", description: "Complete venue decor including drapes, lights, and flowers.", base_price: 9000, pricing_type: "fixed" },
    { service_name: "Flower Arrangement", description: "Custom floral designs for stage, entrance, and centerpieces.", base_price: 1500, pricing_type: "fixed" },
    { service_name: "Event Management", description: "End-to-end event planning and management services.", base_price: 12000, pricing_type: "fixed" },
    { service_name: "Mehendi", description: "Traditional mehendi designs for weddings and festivals.", base_price: 2000, pricing_type: "per_hour" },
    { service_name: "DJ & Music", description: "Professional DJs and music setup for parties and weddings.", base_price: 6000, pricing_type: "per_day" },
    { service_name: "Live Band", description: "Live music performances for special occasions.", base_price: 10000, pricing_type: "per_hour" },
    { service_name: "Invitation Design", description: "Digital and printed invitation card designs.", base_price: 1000, pricing_type: "fixed" },
    { service_name: "Transportation", description: "Luxury cars, buses, and logistics for guests and crew.", base_price: 5000, pricing_type: "per_day" },
    { service_name: "Tent House", description: "Tent setup and furniture rentals for outdoor events.", base_price: 8000, pricing_type: "per_day" },
    { service_name: "Costume Rental", description: "Costumes for performances and themed events.", base_price: 1500, pricing_type: "per_day" },
    { service_name: "Security Services", description: "Professional bouncers and security guards for safety.", base_price: 2000, pricing_type: "per_day" },
    { service_name: "Cleaning & Maintenance", description: "Event venue cleaning before and after the event.", base_price: 1000, pricing_type: "per_day" },
    { service_name: "Guest Management", description: "Assistance with guest seating, entry, and coordination.", base_price: 3000, pricing_type: "per_day" },
    { service_name: "Entertainment", description: "Performers, magicians, and dancers for entertainment.", base_price: 7000, pricing_type: "per_hour" },
    { service_name: "Anchoring", description: "Professional anchors/emcees to host the event.", base_price: 4000, pricing_type: "per_day" },
    { service_name: "Traditional Performers", description: "Folk and cultural performers for special events.", base_price: 5000, pricing_type: "per_hour" },
    { service_name: "Drone Shoot", description: "Aerial videography and photography with drones.", base_price: 6000, pricing_type: "per_hour" }
  ].map(s => ({ ...s, created_by: createdBy }));

  await Service.insertMany(services);
  console.log("✅ 24 services inserted successfully!");
  mongoose.connection.close();
}

insertServices().catch(err => console.error(err));
