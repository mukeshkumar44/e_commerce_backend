const express = require('express');
const router = express.Router();
const { 
    createOrder,
    getOrderById,
    getMyOrders,
    getAllOrders,
    updateOrderStatus,
    updateOrderToPaid,
    cancelOrder,
    addTrackingNumber,
    createRazorpayOrder,
    verifyRazorpayPayment
} = require('../controllers/orderController');
const { authverifyToken, isAdmin } = require('../middlewares/auth.middleware');

// All order routes require authentication
router.use(authverifyToken);

// User routes
router.post('/create', createOrder);
router.get('/myorders', getMyOrders);
router.get('/:id', getOrderById);
router.put('/:id/cancel', cancelOrder);
router.put('/:id/pay', updateOrderToPaid);

// Razorpay routes
router.post('/:orderId/razorpay', createRazorpayOrder);
router.post('/verify-payment', verifyRazorpayPayment);

// Admin routes
router.get('/', isAdmin, getAllOrders);
router.put('/:id/status', isAdmin, updateOrderStatus);
router.put('/:id/tracking', isAdmin, addTrackingNumber);

module.exports = router;