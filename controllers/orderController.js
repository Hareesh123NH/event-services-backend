const { Order, OrderDetail } = require("../models/Order");
const mongoose = require("mongoose");
const { VendorService } = require("../models/Service");
const { Address } = require("../models/User");


const createOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { event_addressId, event_date, services } = req.body || {};
        const userId = req.user.id;

        // 1️⃣ Validate required fields
        if (!event_addressId || !event_date) {
            throw new Error("event_addressId and event_date are required");
        }

        if (!mongoose.Types.ObjectId.isValid(event_addressId)) {
            throw new Error("Invalid event_addressId");
        }

        const parsedEventDate = new Date(event_date);
        if (isNaN(parsedEventDate)) {
            throw new Error("Invalid event_date format");
        }

        // 🔹 Reject past event dates
        if (parsedEventDate < new Date()) {
            throw new Error("Cannot create order for a past date");
        }

        // 2️⃣ Validate address
        const address = await Address.findById(event_addressId);
        if (!address) throw new Error("Address not found");

        // 🔹 Ensure address belongs to the logged-in user
        if (address.user.toString() !== userId) {
            throw new Error("Unauthorized: address does not belong to this user");
        }

        // 3️⃣ Validate services
        if (!services || !Array.isArray(services) || services.length === 0) {
            throw new Error("At least one service must be provided");
        }

        // 4️⃣ Validate vendorServiceIds
        const vendorServiceIds = services.map(s => s.vendorserviceid);
        const invalidIds = vendorServiceIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
        if (invalidIds.length > 0) {
            throw new Error(`Invalid vendorserviceid(s): ${invalidIds.join(", ")}`);
        }

        // 5️⃣ Fetch vendor services and check status
        const vendorServices = await VendorService.find({ _id: { $in: vendorServiceIds } }).session(session);

        if (vendorServices.length !== vendorServiceIds.length) {
            throw new Error("Some vendorservices are not found!");
        }

        // 🔹 Reject inactive/suspended vendor services
        // const inactiveServices = vendorServices.filter(vs => vs.status !== "active");
        // if (inactiveServices.length > 0) {
        //     const inactiveIds = inactiveServices.map(vs => vs._id);
        //     throw new Error(`Some services are not active: ${inactiveIds.join(", ")}`);
        // }

        // 6️⃣ Map vendor service prices
        const serviceMap = {};
        vendorServices.forEach(vs => (serviceMap[vs._id] = vs.final_price));

        // 7️⃣ Calculate total amount & prepare order details
        let total_amount = 0;
        const orderDetailsData = services.map(s => {
            const finalPrice = serviceMap[s.vendorserviceid];
            const quantity = s.quantity || 1;
            total_amount += finalPrice * quantity;

            return {
                vendor_service: s.vendorserviceid,
                quantity,
                price: finalPrice,
                scheduled_from: s.scheduled_from ? new Date(s.scheduled_from) : null,
                scheduled_to: s.scheduled_to ? new Date(s.scheduled_to) : null
            };
        });

        // 8️⃣ Create Order
        const order = new Order({
            user: userId,
            event_address: event_addressId,
            event_date: parsedEventDate,
            total_amount
        });

        const savedOrder = await order.save({ session });

        // 9️⃣ Link OrderDetails to the Order
        orderDetailsData.forEach(od => (od.order = savedOrder._id));
        await OrderDetail.insertMany(orderDetailsData, { session });

        // 🔟 Commit transaction
        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: { order: savedOrder, orderDetails: orderDetailsData }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: error.message });
    }
};


const updateProviderStatus = async (req, res) => {
    try {
        const { id, status } = req.query;
        const vendorId = req.user.id;

        if (!["accepted", "declined"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ success: false, message: "Invalid Order detail Id" });
        }

        const orderDetail = await OrderDetail.findById(id);
        if (!orderDetail) {
            return res.status(404).json({ success: false, message: "Order detail not found" });
        }

        const vendorService = await VendorService.findById(orderDetail.vendor_service);
        if (!vendorService) {
            return res.status(404).json({ success: false, message: "Vendor service not found" });
        }

        // Ensure vendor owns the service
        if (vendorService.vendor.toString() !== vendorId) {
            return res.status(403).json({ success: false, message: "Unauthorized: not your service" });
        }

        if (orderDetail.provider_status !== "pending") {
            return res.status(400).json({ success: false, message: "Status already updated" });
        }

        // Update order detail
        orderDetail.provider_status = status;
        await orderDetail.save();

        // Check all order details under the same order
        const allDetails = await OrderDetail.find({ order: orderDetail.order });

        const allAccepted = allDetails.every(d => d.provider_status === "accepted");
        const allDeclined = allDetails.every(d => d.provider_status === "declined");
        const someAccepted = allDetails.some(d => d.provider_status === "accepted");

        let newOrderStatus = null;

        if (allAccepted) newOrderStatus = "confirmed";
        else if (allDeclined) newOrderStatus = "cancelled";
        else if (someAccepted) newOrderStatus = "partially_confirmed";

        if (newOrderStatus) {
            await Order.findByIdAndUpdate(orderDetail.order, { status: newOrderStatus });
        }


        // ✅ Update actual_amount incrementally if accepted
        const order = await Order.findById(orderDetail.order);
        let updatedAmount = order.actual_amount;

        if (status === "accepted") {
            const addedAmount = orderDetail.price * (orderDetail.quantity || 1);
            updatedAmount += addedAmount;
        }

        // ✅ If all declined → reset to 0
        if (allDeclined) {
            updatedAmount = 0;
        }

        // ✅ Update order document
        order.status = newOrderStatus;
        order.actual_amount = updatedAmount;
        await order.save();

        return res.status(200).json({
            success: true,
            message: `Order detail ${status} successfully`,
            updated_order_status: newOrderStatus,
            actual_amount: updatedAmount,
            data: orderDetail,
        });
    } catch (err) {
        console.error("Error updating provider status:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = { createOrder, updateProviderStatus };

