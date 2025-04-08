const express = require('express');
const router = express.Router();
const { 
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
   
} = require('../controllers/cartController');
const { authverifyToken } = require('../middlewares/auth.middleware');

// All cart routes require authentication
router.use(authverifyToken);

// Cart routes
router.get('/getCart', getCart);
router.post('/add', addToCart);
router.put('/update', updateCartItem);
router.delete('/remove/:itemId', removeCartItem);
router.delete('/clear', clearCart);


module.exports = router;