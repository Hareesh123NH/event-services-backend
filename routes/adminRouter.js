const express = require("express");
const router = express.Router();
const { adminSignup, rejectVendor, acceptVendor } = require("../controllers/adminController");

router.post("/create", adminSignup);
router.delete("/reject/:id", rejectVendor)
router.post("/accept/:id", acceptVendor)
module.exports = router;
