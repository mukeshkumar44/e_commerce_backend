const mogoose = require('mongoose');
const dotenv = require('dotenv');
 dotenv.config();
 const express = require('express');


 const connectDB = async () => {
        try {
            const conn = await mogoose.connect(process.env.MONGO_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
         
            });
            console.log("MongoDB connected");
        } catch (error) {
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
    };
    module.exports = connectDB;
