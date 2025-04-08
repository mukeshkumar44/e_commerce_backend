const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/user.model');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
   
});
const createadmin = async () => {
    const existingUser = await User.findOne({ role:"admin" });
    if (existingUser){console.log("Admin already exists");
    return process.exit(1);
    }
    const hashedPassword = await bcrypt.hash("Ram@123", 10);
    const admin = new User({
        name: "Admin",
        email: "mdverma@gmail.com",
        password: hashedPassword,     //Ram@123
        role: "admin",
        isVerified: true
    });
    await admin.save();
    console.log("Admin created successfully");
    process.exit(1);

}
createadmin();