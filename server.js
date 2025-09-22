const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");


const app = express();
app.use(express.json());


// 👉 Middleware
const authMiddleware = require("./middlewares/authMiddleware");

// 👉 Routers
const authRouters = require("./routes/authRouter");
const userRouters = require("./routes/userRouter");
const serviceRouters=require("./routes/serviceRouter");
const adminRouters=require('./routes/adminRouter');



// 👉 Test route
// app.get("/", (req, res) => {
//     res.send("API Running 🚀");
// });

app.use('/auth', authRouters);
app.use('/user', authMiddleware("user"), userRouters);
app.use('/service',serviceRouters);
app.use('/admin',authMiddleware("admin"),adminRouters);



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

//signup--admin
// reject vendors