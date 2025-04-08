const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const Product = require('../models/product.model');
// Add these functions to your existing orderController.js file

const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Razorpay order
exports.createRazorpayOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        // Find the order
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Check if order belongs to user
        if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this order'
            });
        }
        
        // Check if order is already paid
        if (order.isPaid) {
            return res.status(400).json({
                success: false,
                message: 'Order is already paid'
            });
        }
        
        // Create Razorpay order
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(order.totalPrice * 100), // Razorpay expects amount in paise
            currency: 'INR',
            receipt: order._id.toString(),
            payment_capture: 1 // Auto-capture payment
        });
        
        res.status(200).json({
            success: true,
            order: {
                id: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                orderId: order._id
            },
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Razorpay order creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating Razorpay order',
            error: error.message
        });
    }
};

// Verify Razorpay payment
exports.verifyRazorpayPayment = async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature,
            orderId
        } = req.body;
        
        // Verify signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');
        
        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }
        
        // Find the order
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Update payment details
        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentMethod = 'ONLINE';
        order.paymentResult = {
            id: razorpay_payment_id,
            status: 'completed',
            update_time: Date.now(),
            email_address: req.user.email
        };
        
        // Save updated order
        const updatedOrder = await order.save();
        
        res.status(200).json({
            success: true,
            message: 'Payment verified successfully',
            order: updatedOrder
        });
    } catch (error) {
        console.error('Razorpay payment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying payment',
            error: error.message
        });
    }
};

// Create new order
exports.createOrder = async (req, res) => {
    try {
        const { 
            shippingAddress, 
            paymentMethod = 'COD',
            shippingPrice = 0,
            taxPrice = 0,
            notes
        } = req.body;
        
        const userId = req.user._id;
        
        // Get cart items
        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty. Cannot create order.'
            });
        }
        
        // Create order items from cart items
        const orderItems = cart.items.map(item => {
            return {
                product: item.product._id,
                name: item.product.name,
                quantity: item.quantity,
                price: item.price,
                image: item.product.images && item.product.images.length > 0 ? item.product.images[0] : '',
                totalPrice: item.totalPrice
            };
        });
        
        // Calculate prices
        const itemsPrice = cart.totalAmount;
        const discountPrice = cart.discountAmount || 0;
        const totalPrice = itemsPrice + shippingPrice + taxPrice - discountPrice;
        
        // Create order
        const order = new Order({
            user: userId,
            orderItems,
            shippingAddress,
            paymentMethod,
            itemsPrice,
            shippingPrice,
            taxPrice,
            discountPrice,
            totalPrice,
            couponApplied: cart.couponApplied || null,
            notes
        });
        
        // If payment method is COD, set isPaid to false
        if (paymentMethod === 'COD') {
            order.isPaid = false;
        }
        
        // Save order
        const createdOrder = await order.save();
        
        // Update product stock
        for (const item of cart.items) {
            const product = await Product.findById(item.product);
            if (product) {
                product.stock -= item.quantity;
                if (product.stock < 0) product.stock = 0;
                await product.save();
            }
        }
        
        // Clear cart after order is created
        await Cart.findByIdAndDelete(cart._id);
        
        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            order: createdOrder
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating order',
            error: error.message
        });
    }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
    try {
        const orderId = req.params.id;
        
        const order = await Order.findById(orderId)
            .populate('user', 'name email')
            .populate('couponApplied');
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Check if the order belongs to the logged-in user or if the user is an admin
        if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this order'
            });
        }
        
        res.status(200).json({
            success: true,
            order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching order',
            error: error.message
        });
    }
};

// Get logged in user's orders
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching orders',
            error: error.message
        });
    }
};

// Get all orders - Admin only
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        
        // Calculate total amount of all orders
        const totalAmount = orders.reduce((sum, order) => sum + order.totalPrice, 0);
        
        res.status(200).json({
            success: true,
            count: orders.length,
            totalAmount,
            orders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching orders',
            error: error.message
        });
    }
};

// Update order status - Admin only
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderStatus } = req.body;
        const orderId = req.params.id;
        
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Update order status
        order.orderStatus = orderStatus;
        
        // If order is delivered, update isDelivered and deliveredAt
        if (orderStatus === 'DELIVERED') {
            order.isDelivered = true;
            order.deliveredAt = Date.now();
        }
        
        // If order is cancelled, restore product stock
        if (orderStatus === 'CANCELLED' && order.orderStatus !== 'CANCELLED') {
            for (const item of order.orderItems) {
                const product = await Product.findById(item.product);
                if (product) {
                    product.stock += item.quantity;
                    await product.save();
                }
            }
            
            // Add cancel reason if provided
            if (req.body.cancelReason) {
                order.cancelReason = req.body.cancelReason;
            }
        }
        
        // If order is returned, restore product stock
        if (orderStatus === 'RETURNED' && order.orderStatus !== 'RETURNED') {
            for (const item of order.orderItems) {
                const product = await Product.findById(item.product);
                if (product) {
                    product.stock += item.quantity;
                    await product.save();
                }
            }
            
            // Add return reason if provided
            if (req.body.returnReason) {
                order.returnReason = req.body.returnReason;
            }
        }
        
        // Save updated order
        const updatedOrder = await order.save();
        
        res.status(200).json({
            success: true,
            message: `Order status updated to ${orderStatus}`,
            order: updatedOrder
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating order status',
            error: error.message
        });
    }
};

// Update order to paid
exports.updateOrderToPaid = async (req, res) => {
    try {
        const { paymentResult } = req.body;
        const orderId = req.params.id;
        
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Update payment details
        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentResult = paymentResult;
        
        // If order was COD and now paid, update payment method
        if (order.paymentMethod === 'COD') {
            order.paymentMethod = 'ONLINE';
        }
        
        // Save updated order
        const updatedOrder = await order.save();
        
        res.status(200).json({
            success: true,
            message: 'Order marked as paid',
            order: updatedOrder
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating payment status',
            error: error.message
        });
    }
};

// Cancel order - User can cancel their own order
exports.cancelOrder = async (req, res) => {
    try {
        const { cancelReason } = req.body;
        const orderId = req.params.id;
        
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Check if the order belongs to the logged-in user
        if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this order'
            });
        }
        
        // Check if order can be cancelled (only PENDING or PROCESSING orders can be cancelled)
        if (!['PENDING', 'PROCESSING'].includes(order.orderStatus)) {
            return res.status(400).json({
                success: false,
                message: `Order cannot be cancelled in ${order.orderStatus} status`
            });
        }
        
        // Update order status to CANCELLED
        order.orderStatus = 'CANCELLED';
        order.cancelReason = cancelReason || 'Cancelled by user';
        
        // Restore product stock
        for (const item of order.orderItems) {
            const product = await Product.findById(item.product);
            if (product) {
                product.stock += item.quantity;
                await product.save();
            }
        }
        
        // Save updated order
        const updatedOrder = await order.save();
        
        res.status(200).json({
            success: true,
            message: 'Order cancelled successfully',
            order: updatedOrder
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error cancelling order',
            error: error.message
        });
    }
};

// Add tracking number to order - Admin only
exports.addTrackingNumber = async (req, res) => {
    try {
        const { trackingNumber } = req.body;
        const orderId = req.params.id;
        
        if (!trackingNumber) {
            return res.status(400).json({
                success: false,
                message: 'Tracking number is required'
            });
        }
        
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Update tracking number
        order.trackingNumber = trackingNumber;
        
        // If order is in PROCESSING status, update to SHIPPED
        if (order.orderStatus === 'PROCESSING') {
            order.orderStatus = 'SHIPPED';
        }
        
        // Save updated order
        const updatedOrder = await order.save();
        
        res.status(200).json({
            success: true,
            message: 'Tracking number added successfully',
            order: updatedOrder
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding tracking number',
            error: error.message
        });
    }
};