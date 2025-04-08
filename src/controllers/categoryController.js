const Category = require('../models/category.model');

// Create a new category
exports.createCategory = async (req, res) => {
    try {
        const { name, description, parentCategory } = req.body;
        
        // Check if category with the same name already exists
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ 
                success: false, 
                message: 'Category with this name already exists' 
            });
        }
        
        // Check if parent category exists if provided
        if (parentCategory) {
            const parentCategoryExists = await Category.findById(parentCategory);
            if (!parentCategoryExists) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Parent category not found' 
                });
            }
        }
        
        // Handle image upload
        let image = '';
        if (req.file) {
            image = `/uploads/categories/${req.file.filename}`;
        } else if (req.cloudinaryUrl) {
            image = req.cloudinaryUrl;
        }
        
        const category = new Category({
            name,
            description,
            image,
            parentCategory: parentCategory || null
        });
        
        await category.save();
        
        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating category',
            error: error.message
        });
    }
};

// Get all categories
exports.getAllCategories = async (req, res) => {
    try {
        const filter = {};
        
        // Filter by active status if specified
        if (req.query.isActive !== undefined) {
            filter.isActive = req.query.isActive === 'true';
        }
        
        // Filter by parent category if specified
        if (req.query.parentCategory) {
            if (req.query.parentCategory === 'null') {
                filter.parentCategory = null;
            } else {
                filter.parentCategory = req.query.parentCategory;
            }
        }
        
        // Search by name if specified
        if (req.query.search) {
            filter.$text = { $search: req.query.search };
        }
        
        const categories = await Category.find(filter)
            .populate('parentCategory', 'name');
        
        res.status(200).json({
            success: true,
            count: categories.length,
            categories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching categories',
            error: error.message
        });
    }
};

// Get category by ID
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id)
            .populate('parentCategory', 'name');
        
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        
        res.status(200).json({
            success: true,
            category
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching category',
            error: error.message
        });
    }
};

// Update category
exports.updateCategory = async (req, res) => {
    try {
        const { name, description, parentCategory, isActive } = req.body;
        
        // Check if category exists
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        
        // Check if new name already exists (if name is being updated)
        if (name && name !== category.name) {
            const existingCategory = await Category.findOne({ name });
            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Category with this name already exists'
                });
            }
        }
        
        // Check if parent category exists if provided
        if (parentCategory) {
            // Prevent category from being its own parent
            if (parentCategory === req.params.id) {
                return res.status(400).json({
                    success: false,
                    message: 'Category cannot be its own parent'
                });
            }
            
            const parentCategoryExists = await Category.findById(parentCategory);
            if (!parentCategoryExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Parent category not found'
                });
            }
        }
        
        // Handle image upload
        let image = category.image;
        if (req.file) {
            image = `/uploads/categories/${req.file.filename}`;
        } else if (req.cloudinaryUrl) {
            image = req.cloudinaryUrl;
        }
        
        const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id,
            {
                name: name || category.name,
                description: description || category.description,
                image,
                parentCategory: parentCategory === 'null' ? null : (parentCategory || category.parentCategory),
                isActive: isActive !== undefined ? isActive : category.isActive
            },
            { new: true }
        );
        
        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            category: updatedCategory
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating category',
            error: error.message
        });
    }
};

// Delete category
exports.deleteCategory = async (req, res) => {
    try {
        // Check if category exists
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        
        // Check if category has child categories
        const childCategories = await Category.find({ parentCategory: req.params.id });
        if (childCategories.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category with child categories. Please delete or reassign child categories first.'
            });
        }
        
        // Check if category is used in products
        const Product = require('../models/product.model');
        const productsWithCategory = await Product.find({ category: req.params.id });
        if (productsWithCategory.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category that is used in products. Please reassign products to another category first.'
            });
        }
        
        await Category.findByIdAndDelete(req.params.id);
        
        res.status(200).json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting category',
            error: error.message
        });
    }
};

// Get category tree (hierarchical structure)
exports.getCategoryTree = async (req, res) => {
    try {
        // Get all categories
        const allCategories = await Category.find({ isActive: true });
        
        // Function to build tree recursively
        const buildCategoryTree = (parentId = null) => {
            const categoryTree = [];
            
            allCategories.forEach(category => {
                if ((parentId === null && !category.parentCategory) || 
                    (category.parentCategory && category.parentCategory.toString() === parentId)) {
                    const children = buildCategoryTree(category._id.toString());
                    
                    const categoryNode = {
                        _id: category._id,
                        name: category.name,
                        description: category.description,
                        image: category.image
                    };
                    
                    if (children.length > 0) {
                        categoryNode.children = children;
                    }
                    
                    categoryTree.push(categoryNode);
                }
            });
            
            return categoryTree;
        };
        
        const categoryTree = buildCategoryTree();
        
        res.status(200).json({
            success: true,
            categoryTree
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching category tree',
            error: error.message
        });
    }
};