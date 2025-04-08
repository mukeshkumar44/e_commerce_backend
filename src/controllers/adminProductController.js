const Product = require('../models/product.model');
const Category = require('../models/category.model');
const fs = require('fs');
const path = require('path');
// Add a new product (admin only)
exports.addProduct = async (req, res) => {
    try {
        const { name, description, price, discountedPrice, category, stock, featured } = req.body;
        
        // Check if category exists
        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
            return res.status(400).json({ message: 'Category not found' });
        }
        
        // Handle image upload - modified to work with single file upload
        let images = [];
        if (req.file) {
            // If using single file upload
            images.push(`/uploads/products/${req.file.filename}`);
        } else if (req.cloudinaryUrls && req.cloudinaryUrls.length > 0) {
            // If using cloudinary
            images = req.cloudinaryUrls.map(img => img.url);
        }
    
        const product = new Product({
            name,
            description,
            price,
            discountedPrice: discountedPrice || price,
            category,
            stock,
            images,
            featured: featured || false
        });
        
        await product.save();
        res.status(201).json({ 
            success: true,
            message: 'Product added successfully', 
            product 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error adding product', 
            error: error.message 
        });
    }
};

// Get all products for admin (including inactive)
exports.getAllProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Build filter object
        const filter = {};
        
        if (req.query.category) {
            filter.category = req.query.category;
        }
        
        if (req.query.featured !== undefined) {
            filter.featured = req.query.featured === 'true';
        }
        
        if (req.query.isActive !== undefined) {
            filter.isActive = req.query.isActive === 'true';
        }
        
        if (req.query.minPrice || req.query.maxPrice) {
            filter.price = {};
            if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice);
            if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice);
        }
        
        // Search functionality
        if (req.query.search) {
            filter.$text = { $search: req.query.search };
        }
        
        // Sort options
        let sort = {};
        if (req.query.sort) {
            if (req.query.sort === 'price-asc') sort.price = 1;
            else if (req.query.sort === 'price-desc') sort.price = -1;
            else if (req.query.sort === 'newest') sort.createdAt = -1;
            else if (req.query.sort === 'oldest') sort.createdAt = 1;
            else if (req.query.sort === 'name-asc') sort.name = 1;
            else if (req.query.sort === 'name-desc') sort.name = -1;
            else if (req.query.sort === 'stock-asc') sort.stock = 1;
            else if (req.query.sort === 'stock-desc') sort.stock = -1;
        } else {
            sort.createdAt = -1; // Default sort by newest
        }
        
        const products = await Product.find(filter)
            .populate('category', 'name')
            .sort(sort)
            .skip(skip)
            .limit(limit);
            
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);
        
        res.status(200).json({
            success: true,
            products,
            pagination: {
                currentPage: page,
                totalPages,
                totalProducts,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error fetching products', 
            error: error.message 
        });
    }
};

// Update a product (admin only)
exports.updateProduct = async (req, res) => {
    try {
        const { name, description, price, discountedPrice, category, stock, featured, isActive } = req.body;
        
        // Check if product exists
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ 
                success: false,
                message: 'Product not found' 
            });
        }
        
        // Check if category exists if provided
        if (category) {
            const categoryExists = await Category.findById(category);
            if (!categoryExists) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Category not found' 
                });
            }
        }
        
        // Handle image uploads
        let images = product.images;
        if (req.files && req.files.length > 0) {
            // Delete old images if requested
            if (req.body.replaceImages === 'true') {
                // Remove old image files
                product.images.forEach(img => {
                    const imagePath = path.join(__dirname, '../../', img);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                });
                images = req.files.map(file => `/uploads/products/${file.filename}`);
            } else {
                // Add new images to existing ones
                const newImages = req.files.map(file => `/uploads/products/${file.filename}`);
                images = [...images, ...newImages];
            }
        }
        
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            {
                name: name || product.name,
                description: description || product.description,
                price: price || product.price,
                discountedPrice: discountedPrice || product.discountedPrice,
                category: category || product.category,
                stock: stock !== undefined ? stock : product.stock,
                images,
                featured: featured !== undefined ? featured : product.featured,
                isActive: isActive !== undefined ? isActive : product.isActive
            },
            { new: true }
        );
        
        res.status(200).json({ 
            success: true,
            message: 'Product updated successfully', 
            product: updatedProduct 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error updating product', 
            error: error.message 
        });
    }
};

// Delete a product (admin only)
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ 
                success: false,
                message: 'Product not found' 
            });
        }
        
        // Remove image files
        product.images.forEach(img => {
            const imagePath = path.join(__dirname, '../../', img);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        });
        
        await Product.findByIdAndDelete(req.params.id);
        res.status(200).json({ 
            success: true,
            message: 'Product deleted successfully' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error deleting product', 
            error: error.message 
        });
    }
};

// Change product status (active/inactive)
exports.changeProductStatus = async (req, res) => {
    try {
        const { isActive } = req.body;
        
        if (isActive === undefined) {
            return res.status(400).json({
                success: false,
                message: 'isActive field is required'
            });
        }
        
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ 
                success: false,
                message: 'Product not found' 
            });
        }
        
        product.isActive = isActive;
        await product.save();
        
        res.status(200).json({
            success: true,
            message: `Product ${isActive ? 'activated' : 'deactivated'} successfully`,
            product
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error changing product status', 
            error: error.message 
        });
    }
};

// Bulk update product stock
exports.updateProductStock = async (req, res) => {
    try {
        const { products } = req.body;
        
        if (!products || !Array.isArray(products)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid products data'
            });
        }
        
        const updates = [];
        
        for (const item of products) {
            if (!item.id || item.stock === undefined) {
                continue;
            }
            
            const product = await Product.findById(item.id);
            if (!product) {
                continue;
            }
            
            product.stock = item.stock;
            await product.save();
            
            updates.push({
                id: product._id,
                name: product.name,
                stock: product.stock
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Product stock updated successfully',
            updates
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error updating product stock', 
            error: error.message 
        });
    }
};

// Get product statistics for admin dashboard
exports.getProductStats = async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const activeProducts = await Product.countDocuments({ isActive: true });
        const featuredProducts = await Product.countDocuments({ featured: true });
        const lowStockProducts = await Product.countDocuments({ stock: { $lt: 10 }, isActive: true });
        
        // Get products by category
        const productsByCategory = await Product.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $unwind: '$category'
            },
            {
                $project: {
                    _id: 0,
                    category: '$category.name',
                    count: 1
                }
            }
        ]);
        
        res.status(200).json({
            success: true,
            stats: {
                totalProducts,
                activeProducts,
                inactiveProducts: totalProducts - activeProducts,
                featuredProducts,
                lowStockProducts,
                productsByCategory
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error fetching product statistics', 
            error: error.message 
        });
    }
};