const express = require("express");
const { createOrder, updateProviderStatus, getOrderHistory, getVendorOrderHistory, getVendorPendingOrders  } = require("../controllers/orderController");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/create", authMiddleware("user"), createOrder);
router.put("/status", authMiddleware("vendor"), updateProviderStatus)



router.get("/user", authMiddleware("user"), getOrderHistory);
router.get("/vendor", authMiddleware("vendor"), getVendorOrderHistory);
router.get("/vendor-pending", authMiddleware("vendor"), getVendorPendingOrders);


module.exports = router;