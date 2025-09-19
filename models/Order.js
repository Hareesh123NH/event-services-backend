const mongoose = require("mongoose");

const { Schema } = mongoose;
const { User, Address }=require("./User");
const VendorService=require("./Service");


// 🔹 Orders
const orderSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    event_address: { type: Schema.Types.ObjectId, ref: "Address" },
    order_date: { type: Date, default: Date.now },
    event_date: { type: Date, required: true },
    total_amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "confirmed", "completed", "cancelled"], default: "pending" },
    payment_status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" }
}, { timestamps: true });

// 🔹 Order Details
const orderDetailSchema = new Schema({
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    vendor_service: { type: Schema.Types.ObjectId, ref: "VendorService", required: true },
    quantity: { type: Number, default: 1 },
    price: { type: Number, required: true },
    provider_status: { type: String, enum: ["pending", "accepted", "declined", "completed"], default: "pending" },
    scheduled_from: Date,
    scheduled_to: Date
}, { timestamps: true });


const Order = mongoose.model("Order", orderSchema);
const OrderDetail = mongoose.model("OrderDetail", orderDetailSchema);


module.exports = {
    Order,
    OrderDetail
};


