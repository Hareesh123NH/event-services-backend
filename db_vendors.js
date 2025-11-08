import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const vendorSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone_number: String,
  description: String,
  address: String,
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  }
}, { timestamps: true });

const Vendor = mongoose.model("Vendor", vendorSchema);

async function insertVendors() {
  await mongoose.connect(process.env.MONGO_URI);

  const password = "$2b$10$NEPaQiCU1K68Jt9nGNlxAeXclxe5l0OW1x95c44hYFW0maboCI1rC";

  // 28 Indian states with codes + coordinates (approx center points)
  const states = [
    { name: "Andhra Pradesh", code: "AP", coords: [80.0193, 15.9129] },
    { name: "Arunachal Pradesh", code: "AR", coords: [94.7278, 28.2180] },
    { name: "Assam", code: "AS", coords: [92.9376, 26.2006] },
    { name: "Bihar", code: "BR", coords: [85.3131, 25.0961] },
    { name: "Chhattisgarh", code: "CG", coords: [82.1400, 21.2787] },
    { name: "Goa", code: "GA", coords: [74.1240, 15.2993] },
    { name: "Gujarat", code: "GJ", coords: [71.1924, 22.2587] },
    { name: "Haryana", code: "HR", coords: [76.0856, 29.0588] },
    { name: "Himachal Pradesh", code: "HP", coords: [77.5712, 31.1048] },
    { name: "Jharkhand", code: "JH", coords: [85.2799, 23.6102] },
    { name: "Karnataka", code: "KA", coords: [75.7139, 15.3173] },
    { name: "Kerala", code: "KL", coords: [76.2711, 10.8505] },
    { name: "Madhya Pradesh", code: "MP", coords: [78.6569, 22.9734] },
    { name: "Maharashtra", code: "MH", coords: [75.7139, 19.7515] },
    { name: "Manipur", code: "MN", coords: [93.9368, 24.6637] },
    { name: "Meghalaya", code: "ML", coords: [91.3662, 25.4670] },
    { name: "Mizoram", code: "MZ", coords: [92.9376, 23.1645] },
    { name: "Nagaland", code: "NL", coords: [94.5624, 26.1584] },
    { name: "Odisha", code: "OD", coords: [85.0985, 20.9517] },
    { name: "Punjab", code: "PB", coords: [75.3412, 31.1471] },
    { name: "Rajasthan", code: "RJ", coords: [74.2179, 27.0238] },
    { name: "Sikkim", code: "SK", coords: [88.5122, 27.5330] },
    { name: "Tamil Nadu", code: "TN", coords: [78.6569, 11.1271] },
    { name: "Telangana", code: "TS", coords: [79.0193, 18.1124] },
    { name: "Tripura", code: "TR", coords: [91.9882, 23.9408] },
    { name: "Uttar Pradesh", code: "UP", coords: [80.9462, 26.8467] },
    { name: "Uttarakhand", code: "UK", coords: [79.0193, 30.0668] },
    { name: "West Bengal", code: "WB", coords: [87.8550, 22.9868] }
  ];

  const vendors = [];

  states.forEach(({ name, code, coords }) => {
    for (let i = 1; i <= 2; i++) {
      vendors.push({
        full_name: `Vendor${i} ${name}`,
        email: `v${i}${code}@events.com`,
        password,
        phone_number: `9${Math.floor(100000000 + Math.random() * 900000000)}`, // random 10-digit
        description: `I provide event services in ${name}.`,
        address: `Main Street, ${name}`,
        location: { type: "Point", coordinates: coords }
      });
    }
  });

  await Vendor.insertMany(vendors);
  console.log(`✅ Inserted ${vendors.length} vendors successfully!`);

  mongoose.connection.close();
}

insertVendors().catch(console.error);
