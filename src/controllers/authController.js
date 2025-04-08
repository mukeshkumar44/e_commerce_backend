const User = require('../models/user.model.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sendEmail = require('../config/nodemailer');

exports.signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000);
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        const user = new User({ name, email, password: hashedPassword, otp, otpExpires });
        await user.save();

        await sendEmail(email, `Your OTP is ${otp}`);
        res.status(200).json({ message: 'User created successfully' });

    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
}

exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        // Convert both OTPs to strings for comparison
        if (!user || String(user.otp) !== String(otp) || user.otpExpires < new Date()) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        user.otp = undefined;
        user.otpExpires = undefined;
        user.isVerified = true;
        await user.save();

        await sendEmail(email, "Congratulations, OTP verified successfully");
        res.status(200).json({ message: 'OTP verified successfully' });

    } catch (error) {
        res.status(500).json({ message: "Error verifying OTP", error: error.message });
    }
}

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        if (!user.isVerified) {
            return res.status(403).json({ message: 'Email is not verified' });
        }

        const token = jwt.sign({ id: user._id,role:user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(200).json({ token, message: 'Login successful' });

    } catch (error) {
        res.status(500).json({ message: "Error logging in", error: error.message });
    }
}