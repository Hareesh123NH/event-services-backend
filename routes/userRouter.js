const express = require("express");
const router = express.Router();
const { createAddress, updateAddress, getAddresses, updateProfile, searchVendorServices }=require("../controllers/userController");

router.post("/address",createAddress);
router.put("/address/:id",updateAddress);
router.get("/address", getAddresses);
router.put("/update-profile",updateProfile);

router.get("/services",searchVendorServices)

// TODO search for nearest vendor-servies by service_id with filters like price,query etc


module.exports = router;