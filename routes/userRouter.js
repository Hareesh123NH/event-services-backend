const express = require("express");
const router = express.Router();
const user=require("../controllers/userController");

router.post("/address", user.createAddress);
router.put("/address/:id" , user.updateAddress);
router.get("/address", user.getAddresses);
router.put("/update-profile",user.updateProfile);


module.exports = router;