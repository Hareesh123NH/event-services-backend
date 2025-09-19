const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(express.json());


// 👉 Middleware
const authMiddleware = require("./middlewares/authMiddleware");

// 👉 Routers
const authRouters = require("./routes/authRouter");
const userRouters = require("./routes/userRouter");



// 👉 Test route
app.get("/", (req, res) => {
    res.send("API Running 🚀");
});

app.use('/auth', authRouters);
app.use('/user', authMiddleware("user"), userRouters);



// ===================
// 🔹 MongoDB Connect
// ===================
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("✅ MongoDB connected"))
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
