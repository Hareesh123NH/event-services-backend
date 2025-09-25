const express = require("express");
const router = express.Router();
const { login, signup, forgetPassword, sendOTP } = require('../controllers/authController');

const vendor = require('../controllers/vendorController');
const upload = require('../middlewares/multer');


router.post('/login', login);

router.post("/user-signup", signup);

router.post("/vendor-register", upload.fields([
  { name: "aadhar", maxCount: 1 },
  { name: "pancard", maxCount: 1 },
  { name: "business_doc", maxCount: 1 } // optional
]), vendor.registerVendor);


router.post('/send-otp', sendOTP);


router.post("/forget-password", forgetPassword);

module.exports = router;