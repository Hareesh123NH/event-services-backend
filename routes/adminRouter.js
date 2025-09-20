const express = require("express");
const router = express.Router();
const { adminSignup, rejectVendor }=require("../controllers/adminController");

router.post("/create", adminSignup);
router.delete("/reject/:id",rejectVendor)
module.exports = router;
