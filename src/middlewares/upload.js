const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads/products');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

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

// Middleware to upload to Cloudinary after multer processes the file
const uploadToCloudinary = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return next();
        }

        // Array to store Cloudinary URLs
        const cloudinaryUrls = [];

        // Upload each file to Cloudinary
        for (const file of req.files) {
            const result = await cloudinary.uploader.upload(file.path, {
                folder: 'e-commerce/products',
                use_filename: true
            });

            cloudinaryUrls.push({
                url: result.secure_url,
                public_id: result.public_id
            });

            // Remove file from local storage after uploading to Cloudinary
            fs.unlinkSync(file.path);
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