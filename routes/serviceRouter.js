const express = require("express");
const router = express.Router();
const authMiddleware=require("../middlewares/authMiddleware");
const { createService, getService,updateService,updateVendorService }=require('../controllers/serviceController');

router.post("/create",authMiddleware("admin"),createService);
router.get("/",authMiddleware("admin"),getService);
router.put("/:id",authMiddleware("admin"), updateService);

// PATCH /vendor-service/:serviceId
router.patch("/vendor-service/:serviceId",authMiddleware("vendor"),updateVendorService);


module.exports=router;