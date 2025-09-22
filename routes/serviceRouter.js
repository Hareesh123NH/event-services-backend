const express = require("express");
const router = express.Router();
const authMiddleware=require("../middlewares/authMiddleware");
const { createService, getService,updateService,updateVendorService ,getVendorServices,addVendorService}=require('../controllers/serviceController');

router.post("/create",authMiddleware("admin"),createService);
router.get("/",authMiddleware("admin","vendor","user"),getService);
router.put("/:id",authMiddleware("admin"), updateService);

// PATCH /vendor-service/:serviceId
router.patch("/vendor-service/:serviceId",authMiddleware("vendor"),updateVendorService);

//get/vendor services
router.get("/vendor",authMiddleware("vendor"),getVendorServices);

//post/vendor service
router.post("/vendor/:serviceId",authMiddleware("vendor"),addVendorService);


module.exports=router;