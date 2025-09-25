const express = require("express");
const router = express.Router();
const { createAddress, updateAddress, getAddresses, updateProfile, searchVendorServices }=require("../controllers/userController");

router.post("/address",createAddress);
router.put("/address/:id",updateAddress);
router.get("/address", getAddresses);
router.put("/update-profile",updateProfile);

router.get("/services",searchVendorServices)


module.exports = router;