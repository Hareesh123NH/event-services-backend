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
            // data: { order: savedOrder, orderDetails: orderDetailsData }
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

        // if (newOrderStatus) {
        //     await Order.findByIdAndUpdate(orderDetail.order, { status: newOrderStatus });
        // }

        // ✅ Update actual_amount incrementally if accepted
        const order = await Order.findById(orderDetail.order);
        let updatedAmount = order.actual_amount;

        if (status === "accepted") {
            const addedAmount = orderDetail.price * (orderDetail.quantity || 1);
            updatedAmount += addedAmount;
            vendorService.total_bookings += 1;
            await vendorService.save();
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


// userhistory
const getOrderHistory = async (req, res) => {
    try {
        const userId = req.user.id; // from middleware

        // 1️⃣ Fetch all orders placed by this user
        const orders = await Order.find({ user: userId })
            .sort({ createdAt: -1 }) // latest first
            .populate("event_address")
            .lean(); // return plain JS objects for easier manipulation

        if (!orders.length) {
            return res.status(200).json({ message: "No orders found", orders: [] });
        }

        // 2️⃣ Get all order IDs
        const orderIds = orders.map(order => order._id);

        // 3️⃣ Fetch order details for those orders
        const orderDetails = await OrderDetail.find({ order: { $in: orderIds } })
            .populate({
                path: "vendor_service",
                populate: {
                    path: "vendor",
                    select: "full_name phone_number email"
                },
                populate:{
                    path:"service",
                    select:"service_name base_price"
                }
            })
            .lean();

        // 4️⃣ Group orderDetails by orderId
        const detailsByOrder = {};
        for (const detail of orderDetails) {
            const orderId = detail.order.toString();
            if (!detailsByOrder[orderId]) detailsByOrder[orderId] = [];
            detailsByOrder[orderId].push(detail);
        }

        // 5️⃣ Merge details into each order
        const ordersWithDetails = orders.map(order => ({
            ...order,
            services: detailsByOrder[order._id.toString()] || []
        }));

        const simplifiedOrders = ordersWithDetails.map(order => ({
            _id: order._id,
            event_date: order.event_date,
            actual_amount: order.actual_amount,
            total_amount: order.total_amount,
            status: order.status,
            payment_status: order.payment_status,
            order_date: order.order_date,
            event_address: order.event_address
                ? {
                    _id: order.event_address._id,
                    label: order.event_address.label,
                    address_line1: order.event_address.address_line1,
                    address_line2: order.event_address.address_line2,
                    city: order.event_address.city

                }
                : null,
            services: order.services?.map(service => ({
                _id: service._id,
                quantity: service.quantity,
                price: service.price,
                scheduled_from: service.scheduled_from,
                scheduled_to: service.scheduled_to,
                provider_status: service.provider_status,
                vendor_service: service.vendor_service
                    ? {
                        _id: service.vendor_service._id,
                        final_price: service.vendor_service.final_price,
                        status: service.vendor_service.status,
                        vendor: {
                            _id: service.vendor_service.vendor?._id,
                            email: service.vendor_service.vendor?.email,
                            name: service.vendor_service.vendor?.full_name,
                            phone_number: service.vendor_service.vendor?.phone_number
                        },
                        service: {
                            service_name: service.vendor_service.service?.service_name,
                            base_price: service.vendor_service.service?.base_price
                        }
                    }
                    : null
            }))
        }));

        res.status(200).json({
            success: true,
            count: simplifiedOrders.length,
            orders: simplifiedOrders
        });


    } catch (error) {
        console.error("Error fetching order history:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch order history",
            error: error.message
        });
    }
};


//vendor histroy 
const getVendorOrderHistory = async (req, res) => {
    try {
        const vendorId = req.user.id; // vendor ID from token (middleware verified)

        // 1️⃣ Find all vendor services owned by this vendor
        const vendorServices = await VendorService.find({ vendor: vendorId }).select("_id");

        if (!vendorServices.length) {
            return res.status(200).json({
                success: true,
                message: "No services found for this vendor",
                orders: []
            });
        }

        const vendorServiceIds = vendorServices.map(vs => vs._id);

        // 2️⃣ Find all order details that reference any of these vendor services
        const orderDetails = await OrderDetail.find({ vendor_service: { $in: vendorServiceIds } })
            .populate("vendor_service") // for showing which service it was
            .populate({
                path: "order",
                populate: { path: "user", select: "name email phone" } // optional: show user info
            })
            .populate({
                path: "order",
                populate: { path: "event_address" } // optional: show event address
            })
            .sort({ createdAt: -1 })
            .lean();

        if (!orderDetails.length) {
            return res.status(200).json({
                success: true,
                message: "No orders found for this vendor",
                orders: []
            });
        }

        // 3️⃣ Group orderDetails by order (so one order may have multiple services)
        const groupedOrders = {};
        for (const detail of orderDetails) {
            const orderId = detail.order._id.toString();
            if (!groupedOrders[orderId]) {
                groupedOrders[orderId] = {
                    order: detail.order,
                    services: []
                };
            }
            groupedOrders[orderId].services.push(detail);
        }

        // 4️⃣ Convert object to array for clean response
        const orders = Object.values(groupedOrders);

        const simplifiedOrders = orders.map(o => ({
            _id: o.order._id,
            event_date: o.order.event_date,
            total_amount: o.order.total_amount,
            status: o.order.status,
            payment_status: o.order.payment_status,
            order_date: o.order.order_date,
            user: o.order.user
                ? {
                    _id: o.order.user._id,
                    email: o.order.user.email
                }
                : null,
            event_address: o.order.event_address
                ? {
                    _id: o.order.event_address._id,
                    label: o.order.event_address.label,
                    address_line1: o.order.event_address.address_line1,
                    address_line2: o.order.event_address.address_line2,
                    city: o.order.event_address.city
                }
                : null,
            services: o.services.map(s => ({
                _id: s._id,
                quantity: s.quantity,
                price: s.price,
                provider_status: s.provider_status,
                scheduled_from: s.scheduled_from,
                scheduled_to: s.scheduled_to,
                vendor_service: s.vendor_service
                    ? {
                        _id: s.vendor_service._id,
                        final_price: s.vendor_service.final_price,
                        status: s.vendor_service.status,
                        service: s.vendor_service.service
                    }
                    : null
            }))
        }));


        res.status(200).json({
            success: true,
            count: simplifiedOrders.length,
            orders: simplifiedOrders
        });


    } catch (error) {
        console.error("Error fetching vendor order history:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch vendor order history",
            error: error.message
        });
    }
};

// const getVendorPendingOrders = async (req, res) => {
//     try {
//         const vendorId = req.user.id; // vendor's id from auth middleware

//         // Find orderDetails where the vendor_service belongs to this vendor and provider_status is pending
//         const orderDetails = await OrderDetail.find({ provider_status: "pending" })
//             .populate({
//                 path: "vendor_service",
//                 match: { vendor: vendorId }, // filter only this vendor's services
//                 select: "vendor" // select fields you want
//             })
//             .populate({
//                 path: "order", // populate parent order
//                 select: "user event_address event_date status" // select fields you want
//             });



//         res.status(200).json({
//             success: true,
//             count: orderDetails.length,
//             orderDetails: orderDetails
//         });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ success: false, message: "Server Error" });
//     }
// }



const getVendorPendingOrders = async (req, res) => {
    try {
        const vendorId = req.user.id; // vendor's id from auth middleware

        // Fetch orderDetails with populated vendor_service, service, and order.user
        const orderDetails = await OrderDetail.find({ provider_status: "pending" })
            .populate({
                path: "vendor_service",
                match: { vendor: vendorId },
                select: "price service", // fields from VendorService
                populate: {
                    path: "service",
                    select: "service_name" // get service_name from Service schema
                }
            })
            .populate({
                path: "order",
                select: "user event_address event_date status",
                populate: [
                    {
                        path: "user",
                        model: "User",
                        select: "full_name email phone_number"
                    },
                    {
                        path: "event_address",
                        model: "Address",
                        select: "line1 line2 city state pincode" // adjust based on your schema
                    }
                ]
            });


        // Filter out orderDetails where vendor_service didn't match
        const filteredDetails = orderDetails.filter(od => od.vendor_service);

        // Group services by order
        const grouped = {};
        filteredDetails.forEach(od => {
            const orderId = od.order._id.toString();

            if (!grouped[orderId]) {
                grouped[orderId] = {
                    order_id: od.order._id,
                    user: od.order.user,
                    event_address: od.order.event_address,
                    event_date: od.order.event_date,
                    status: od.order.status,
                    services: []
                };
            }

            grouped[orderId].services.push({
                orderDetailId: od._id,
                service_id: od.vendor_service._id,
                service_name: od.vendor_service.service.service_name, // populated Service
                quantity: od.quantity,
                price: od.price,
                provider_status: od.provider_status,
                scheduled_from: od.scheduled_from,
                scheduled_to: od.scheduled_to
            });
        });

        res.status(200).json({
            success: true,
            count: Object.keys(grouped).length,
            orders: Object.values(grouped)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
module.exports = {
    getOrderHistory,
    getVendorOrderHistory,
    getVendorPendingOrders,
    createOrder,
    updateProviderStatus
};

