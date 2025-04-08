const Cart = require('../models/cart.model');
const Product = require('../models/product.model');

// Get cart for current user
exports.getCart = async (req, res) => {
    try {
        const userId = req.user._id;
        
        let cart = await Cart.findOne({ user: userId })
            .populate({
                path: 'items.product',
                select: 'name price discountedPrice images'
            });
        
        if (!cart) {
            return res.status(200).json({
                success: true,
                message: 'Cart is empty',
                cart: {
                    items: [],
                    totalItems: 0,
                    totalAmount: 0,
                    discountAmount: 0,
                    finalAmount: 0
                }
            });
        }
        
        res.status(200).json({
            success: true,
            cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching cart',
            error: error.message
        });
    }
};

// Add item to cart
exports.addToCart = async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;
        
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated properly'
            });
        }
        
        const userId = req.user._id;
        
        // Validate product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        // Check if product is active
        if (!product.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Product is not available'
            });
        }
        
        // Check stock
        if (product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: `Only ${product.stock} items available in stock`
            });
        }
        
        // Get price - use discountedPrice if available, otherwise use regular price
        const price = product.discountedPrice && product.discountedPrice > 0 
            ? product.discountedPrice 
            : product.price;
            
        const totalPrice = price * quantity;
        
        // Find user's cart
        let cart = await Cart.findOne({ user: userId });
        
        if (!cart) {
            // Create new cart if it doesn't exist
            cart = new Cart({
                user: userId,
                items: [{
                    product: productId,
                    quantity,
                    price,
                    totalPrice
                }],
                totalItems: quantity,
                totalAmount: totalPrice,
                discountAmount: 0, // Ensure discountAmount is initialized
                finalAmount: totalPrice // Initialize finalAmount
            });
        } else {
            // Check if product already in cart
            const existingItemIndex = cart.items.findIndex(
                item => item.product.toString() === productId
            );
            
            if (existingItemIndex > -1) {
                // Update quantity if product already in cart
                const existingItem = cart.items[existingItemIndex];
                const newQuantity = existingItem.quantity + quantity;
                
                // Check stock for updated quantity
                if (product.stock < newQuantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Cannot add ${quantity} more. Only ${product.stock} items available in stock`
                    });
                }
                
                existingItem.quantity = newQuantity;
                existingItem.totalPrice = existingItem.price * newQuantity;
                cart.items[existingItemIndex] = existingItem;
            } else {
                // Add new item to cart
                cart.items.push({
                    product: productId,
                    quantity,
                    price,
                    totalPrice
                });
            }
            
            // Ensure discountAmount is a number
            if (typeof cart.discountAmount !== 'number' || isNaN(cart.discountAmount)) {
                cart.discountAmount = 0;
            }
            
            // Recalculate cart totals
            cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
            cart.totalAmount = cart.items.reduce((total, item) => total + item.totalPrice, 0);
            cart.finalAmount = cart.totalAmount - cart.discountAmount;
            
            // Ensure finalAmount is not NaN
            if (isNaN(cart.finalAmount)) {
                cart.finalAmount = cart.totalAmount;
            }
        }
        
        await cart.save();
        
        // Populate product details for response
        await cart.populate({
            path: 'items.product',
            select: 'name price discountedPrice images'
        });
        
        res.status(200).json({
            success: true,
            message: 'Item added to cart',
            cart
        });
    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({
            success: false,
            message: 'Error adding item to cart',
            error: error.message
        });
    }
};

// Update cart item quantity
exports.updateCartItem = async (req, res) => {
    try {
        const { itemId, quantity } = req.body;
        const userId = req.user._id;
        
        // Validate quantity
        if (!quantity || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be at least 1'
            });
        }
        
        // Find user's cart
        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }
        
        // Find item in cart
        const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }
        
        // Get product to check stock
        const productId = cart.items[itemIndex].product;
        const product = await Product.findById(productId);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        // Check stock
        if (product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: `Only ${product.stock} items available in stock`
            });
        }
        
        // Update quantity and total price
        cart.items[itemIndex].quantity = quantity;
        cart.items[itemIndex].totalPrice = cart.items[itemIndex].price * quantity;
        
        // Ensure discountAmount is a number
        if (typeof cart.discountAmount !== 'number' || isNaN(cart.discountAmount)) {
            cart.discountAmount = 0;
        }
        
        // Recalculate cart totals
        cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
        cart.totalAmount = cart.items.reduce((total, item) => total + item.totalPrice, 0);
        cart.finalAmount = cart.totalAmount - cart.discountAmount;
        
        // Ensure finalAmount is not NaN
        if (isNaN(cart.finalAmount)) {
            cart.finalAmount = cart.totalAmount;
        }
        
        await cart.save();
        
        // Populate product details for response
        await cart.populate({
            path: 'items.product',
            select: 'name price discountedPrice images'
        });
        
        res.status(200).json({
            success: true,
            message: 'Cart updated successfully',
            cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating cart',
            error: error.message
        });
    }
};

// Remove item from cart
exports.removeCartItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const userId = req.user._id;
        
        // Find user's cart
        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }
        
        // Find item in cart
        const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }
        
        // Remove item from cart
        cart.items.splice(itemIndex, 1);
        
        // If cart is empty, delete it
        if (cart.items.length === 0) {
            await Cart.findByIdAndDelete(cart._id);
            return res.status(200).json({
                success: true,
                message: 'Item removed and cart is now empty',
                cart: {
                    items: [],
                    totalItems: 0,
                    totalAmount: 0,
                    discountAmount: 0,
                    finalAmount: 0
                }
            });
        }
        
        // Ensure discountAmount is a number
        if (typeof cart.discountAmount !== 'number' || isNaN(cart.discountAmount)) {
            cart.discountAmount = 0;
        }
        
        // Recalculate cart totals
        cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
        cart.totalAmount = cart.items.reduce((total, item) => total + item.totalPrice, 0);
        cart.finalAmount = cart.totalAmount - cart.discountAmount;
        
        // Ensure finalAmount is not NaN
        if (isNaN(cart.finalAmount)) {
            cart.finalAmount = cart.totalAmount;
        }
        
        await cart.save();
        
        // Populate product details for response
        await cart.populate({
            path: 'items.product',
            select: 'name price discountedPrice images'
        });
        
        res.status(200).json({
            success: true,
            message: 'Item removed from cart',
            cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error removing item from cart',
            error: error.message
        });
    }
};

// Clear cart
exports.clearCart = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const result = await Cart.findOneAndDelete({ user: userId });
        
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found or already empty'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Cart cleared successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error clearing cart',
            error: error.message
        });
    }
};

