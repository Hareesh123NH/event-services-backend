const bcrypt = require("bcryptjs");
const { User } = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const JWT_SECRET = process.env.JWT_SECRET;
const token_expiresIn = process.env.JWT_EXPIRESIN;

const otpStore = new Map();

// Nodemailer transporter (use Gmail or SMTP)
const transporter = nodemailer.createTransport({
  // service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAIL_ID,
    pass: process.env.MAIL_PASSWORD
  }
});


const getModel = (role) => {
  switch (role.toLowerCase()) {
    case "user":
      return require("../models/User").User;
    case "admin":
      return require("../models/User").Admin;
    case "vendor":
      return require("../models/Vendor").Vendor;
  }
}

//POST /login common login
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body || {}; // role: "user", "admin", "vendor"

    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password, and role are required" });
    }

    let Model = getModel(role);

    if (!Model) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await Model.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: role.toLowerCase() },
      JWT_SECRET,
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


const sendOTP = async (req, res) => {

  try {
    const { email } = req.query || {};

    if (!email) {
      return res.status(400).json({ message: "please provid the mail" });
    }

    const otp = Math.floor(Math.random() * 1000000);

    await transporter.sendMail({
      from: process.env.MAIL_ID,
      to: email,
      subject: "OTP for Verification",
      text: `This is the OTP for verify: ${otp}`
    });
    const ttlSeconds = 24 * 60 * 60;
    const expiresAt = Date.now() + ttlSeconds * 1000;
    otpStore.set(email, { otp, expiresAt });

    return res.status(200).json({
      message: "SuccussFully send otp"
    })

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }

}


function verifyOTP(email, providedOtp) {

  const record = otpStore.get(email);

  if (!record) return { ok: false, reason: 'Please verify your mail!' };

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return { ok: false, reason: 'Otp expired' };
  }

  const match = record.otp === Number(providedOtp);
  if (match) otpStore.delete(email);

  return { ok: match, reason: match ? 'verified' : 'wrong_otp' };

}

// POST /signup
const signup = async (req, res) => {
  try {
    const { full_name, email, password, phone_number, otp } = req.body || {};

    // 1. Validate input
    if (!full_name || !email || !password || !otp) {
      return res.status(400).json({ message: "Name, email,otp and password are required" });
    }

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }


    const verify = verifyOTP(email, otp);

    if (!verify.ok) {
      return res.status(400).json({ message: verify.reason });
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



const forgetPassword = async (req, res) => {

  try {
    const { email, role } = req.body || {};

    if (!email) {
      return res.status(400).json({ message: "please provid the mail" });
    }

    let Model = getModel(role);

    if (!Model) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await Model.findOne({ email });

    if (!user) return res.status(401).json({ message: "Email not exist!" });

    // Create token valid for 15 minutes
    const token = jwt.sign({ id: user._id, role: role }, JWT_SECRET, { expiresIn: "15m" });

    const link = `${process.env.CLIENT_BASE_URL}/forgot_password.html?token=${token}`;

    // Send email
    const info = await transporter.sendMail({
      from: process.env.MAIL_ID,
      to: user.email,
      subject: "Password Reset",
      // text: `Click here to reset your password: ${link}`,
      html: `<p>Click <a href="${link}">here</a> to reset your password.</p>`
    });

    res.status(200).json({
      message: "Password reset link sent to email",
      id: info.messageId
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}


const setPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body || {};

  if(!password){
    return res.status(400).json({message:"Password must required!"});
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { id, role } = decoded;

    let Model = getModel(role);

    if (!Model) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = await Model.findByIdAndUpdate(id, { password: hashed });

    if (!user) return res.status(400).json({ message: "Invalid token" });

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    res.status(400).json({ message: "Invalid or expired token" });
  }
}

module.exports = { signup, login, forgetPassword, sendOTP, verifyOTP, setPassword };