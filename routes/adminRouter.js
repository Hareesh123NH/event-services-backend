const express = require("express");
const router = express.Router();
const { adminSignup, rejectVendor, acceptVendor, getAllVendorRegistrations, getMediaFile } = require("../controllers/adminController");

router.post("/create", adminSignup);
router.delete("/reject/:id", rejectVendor);
router.post("/accept/:id", acceptVendor);

router.get("/vendor-registrations", getAllVendorRegistrations);


//TODO get api for media file by id
router.get("/media/:id",getMediaFile);

module.exports = router;
