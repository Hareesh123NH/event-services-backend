const bcrypt = require("bcryptjs");
const { User }= require("../models/User");
const jwt = require("jsonwebtoken");

const JWT_SECRET=process.env.JWT_SECRET;
const token_expiresIn=process.env.JWT_EXPIRESIN;

//POST /login common login
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body || {}; // role: "user", "admin", "vendor"

    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password, and role are required" });
    }

    let Model;

    // Select model and password field based on role
    switch (role.toLowerCase()) {
      case "user":
        Model = require("../models/User").User;
        break;
      case "admin":
        Model = require("../models/User").Admin;
        break;
      case "vendor":
        Model = require("../models/Vendor").Vendor;
        break;
      default:
        return res.status(400).json({ message: "Invalid role" });
    }

    const user = await Model.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: role.toLowerCase() },
      JWT_SECRET ,
      { expiresIn: token_expiresIn } 
    );

    res.json({
      message: "Login successful",
      token,
      token_expiresIn,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: role.toLowerCase()
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// POST /signup
const signup = async (req, res) => {
  try {
    const { full_name, email, password, phone_number } = req.body || {};

    // 1. Validate input
    if (!full_name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // 3. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create new user
    const newUser = new User({
      full_name,
      email,
      password: hashedPassword,
      phone_number
    });

    await newUser.save();

    // 5. Respond
    return res.status(201).json({
      message: "User registered successfully",
      id: newUser._id
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};



module.exports = { signup , login };