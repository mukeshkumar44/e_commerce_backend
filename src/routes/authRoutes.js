const express = require('express');
const{signup,verifyOtp,login} = require('../controllers/authController');
const { loginLimiter } = require('../middlewares/rateLimiter.middleware');
const router = express.Router();
router.post('/signup', signup);
router.post('/verify-otp', verifyOtp);
router.post('/login', login,loginLimiter);
module.exports = router;