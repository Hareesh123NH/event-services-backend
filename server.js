const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(express.json());


// 👉 Middleware
const authMiddleware=require("./middlewares/authMiddleware");

// 👉 Routers
const authRouters=require("./routes/authRouter");
const userRouters=require("./routes/userRouter");



// 👉 Test route
app.get("/", (req, res) => {
    res.send("API Running 🚀");
});

app.use('/auth',authRouters);
app.use('/user',authMiddleware("user"),userRouters);


// const {
//     Vendor,
//     VendorVerification,
//     Media,
//     VendorRegistration
// } = require("./models/Vendor");

// const {
//     User,
//     Admin,
//     Address,
//     Review
// } = require('./models/User');

// const {
//     Service,
//     VendorService
// }=require("./models/Service");

// const {
//     Order,
//     OrderDetail
// }=require("./models/Order");


// app.get("/get", async (req, res) => {
//     try {
//         const vendors = await Vendor.find();
//         const VendorVerifications=await VendorVerification.find();
//         const Medias=await Media.find();
//         const VendorRegistratios=await VendorRegistration.find();

//         const Users= await User.find();
//         const Admins= await Admin.find();
//         const Ads= await Address.find();
//         const Reviews= await Review.find();

//         const Services= await Service.find();
//         const VendorServices= await VendorService.find();

//         const Orders=await Order.find();
//         const OrderDetails=await OrderDetail.find();


//         res.status(200).json({ 
//             vendors,
//             VendorVerifications,
//             VendorRegistratios,
//             Medias,
//             Users,
//             Admins,
//             Ads,
//             Reviews,
//             Services,
//             VendorServices,
//             Orders,
//             OrderDetails

//         });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });



// ===================
// 🔹 MongoDB Connect
// ===================

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("✅ MongoDB connected"))
    .catch(err => console.error("❌ MongoDB connection error:", err));


// ===================
// 🔹 Start Server
// ===================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});


// leetcode ✅
// linkedin ==> profile,about ✅
// github ==> profile ✅
//  TODO tmr ❌ Resume ==> follow the sections summury-> tech Skill -> Projects more content -> Education -> Certification/Achivements
