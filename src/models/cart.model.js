const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity cannot be less than 1'],
        default: 1
    },
    price: {
        type: Number,
        required: true
    },
    totalPrice: {
        type: Number,
        required: true
    }
}, { _id: true });

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [cartItemSchema],
    totalItems: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        default: 0
    },
   
    finalAmount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Pre-save middleware to calculate totals
cartSchema.pre('save', function(next) {
    // Calculate total items
    this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
    
    // Calculate total amount
    this.totalAmount = this.items.reduce((total, item) => total + item.totalPrice, 0);
    
    // Calculate final amount after discount
    this.finalAmount = this.totalAmount - this.discountAmount;
    
    next();
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;