const express = require("express");
const router = express.Router();
const user=require("../controllers/userController");

router.post("/address", user.createAddress);
router.put("/address/:id" , user.updateAddress);
router.get("/address", user.getAddresses);
router.put("/update-profile",user.updateProfile);

// TODO search for nearest vendor-servies by service_id with filters like price,query etc


module.exports = router;