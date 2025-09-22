const express = require("express");
const router = express.Router();
const { adminSignup, rejectVendor, acceptVendor, getAllVendorRegistrations } = require("../controllers/adminController");

router.post("/create", adminSignup);
router.delete("/reject/:id", rejectVendor);
router.post("/accept/:id", acceptVendor);

router.get("/vendor-registrations", getAllVendorRegistrations)

module.exports = router;
