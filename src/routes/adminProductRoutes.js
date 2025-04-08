const express = require('express');
const router = express.Router();
const { 
    addProduct,
    getAllProducts,
    updateProduct,
    deleteProduct,
    changeProductStatus,
    updateProductStock,
    getProductStats
} = require('../controllers/adminProductController');
// Fix the import path to match your actual file name
const { authverifyToken, isAdmin } = require('../middlewares/auth.middleware');
const { upload, uploadToCloudinary } = require('../middlewares/upload');

// All routes are protected with admin middleware
router.use(authverifyToken, isAdmin);

// Admin product routes
// Fix the middleware order - uploadToCloudinary should come before addProduct
router.post('/addProduct', upload.array('images', 5), uploadToCloudinary, addProduct);
router.put('/updateproduct/:id', upload.array('images', 5), uploadToCloudinary, updateProduct);


// Remove this duplicate route
// router.post('/', upload.single('image'), addProduct);
router.get('/getallproducts', getAllProducts);
router.delete('/deleteproduct/:id', deleteProduct);
router.patch('/change-status/:id/status', changeProductStatus);
router.post('/update-stock', updateProductStock);
router.get('/stats', getProductStats);

// Update the upload field name to match what's being sent in the request
router.post('/', upload.single('image'), addProduct);
module.exports = router;