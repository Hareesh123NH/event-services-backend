const express = require("express");
const router = express.Router();
const { createService, getService,updateService }=require('../controllers/serviceController');

router.post("/services", createService);
router.get("/services", getService);
router.put("/services/:id", updateService);


module.exports=router;