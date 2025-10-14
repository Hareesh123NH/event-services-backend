const express = require("express");
const { createOrder, updateProviderStatus } = require("../controllers/orderController");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/create", authMiddleware("user"), createOrder);
router.put("/status", authMiddleware("vendor"), updateProviderStatus)
module.exports = router;