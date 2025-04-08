const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');

// Configure memory storage instead of disk storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

// Create multer instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max file size
    },
    fileFilter: fileFilter
});

// Middleware to upload to Cloudinary directly from memory
const uploadToCloudinary = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return next();
        }

        // Array to store Cloudinary URLs
        const cloudinaryUrls = [];

        // Upload each file to Cloudinary
        for (const file of req.files) {
            // Convert buffer to data URI
            const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
            
            const result = await cloudinary.uploader.upload(dataUri, {
                folder: 'e-commerce/products',
                resource_type: 'auto'
            });

            cloudinaryUrls.push({
                url: result.secure_url,
                public_id: result.public_id
            });
        }

        // Add Cloudinary URLs to request object
        req.cloudinaryUrls = cloudinaryUrls;
        next();
    } catch (error) {
        next(error);
    }
};

// Export both multer upload and cloudinary upload middleware
module.exports = {
    upload,
    uploadToCloudinary
};