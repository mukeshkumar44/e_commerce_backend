const express = require('express');
const router = express.Router();
const { 
    createCategory, 
    getAllCategories, 
    getCategoryById, 
    updateCategory, 
    deleteCategory,
    getCategoryTree
} = require('../controllers/categoryController');
const { authverifyToken, isAdmin } = require('../middlewares/auth.middleware');
// Fix the import to destructure the upload property
const { upload } = require('../middlewares/upload');

// Public routes
router.get('/', getAllCategories);
router.get('/tree', getCategoryTree);
router.get('/:id', getCategoryById);

// Protected routes (admin only)
router.post('/createCategory', authverifyToken, isAdmin, upload.single('image'), createCategory);
router.put('/:id', authverifyToken, isAdmin, upload.single('image'), updateCategory);
router.delete('/:id', authverifyToken, isAdmin, deleteCategory);

module.exports = router;