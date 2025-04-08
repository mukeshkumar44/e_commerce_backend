const express = require('express');
const cors = require('cors');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Import routes (uncomment these when you implement them)
const authRoutes = require('./routes/authRoutes');
// const productRoutes = require('./routes/productRoutes');
// Add this line with your other route imports
const cartRoutes = require('./routes/cartRoutes');

// Add this line with your other route uses
app.use('/api/cart', cartRoutes);
// const orderRoutes = require('./routes/orderRoutes');
// Use routes
app.use('/api/auth', authRoutes);
// app.use('/api/products', productRoutes);
// Add this line with your other route imports
const orderRoutes = require('./routes/orderRoutes');

// Add this line with your other route uses
app.use('/api/orders', orderRoutes);
// Add this line with your other route imports
const categoryRoutes = require('./routes/categoryRoutes');
const adminProductRoutes = require('./routes/adminProductRoutes');

// Add this line with your other route uses
app.use('/api/categories', categoryRoutes);
app.use('/api/admin/products', adminProductRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

module.exports = app;