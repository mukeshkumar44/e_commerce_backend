const dotenv = require('dotenv');
// Load environment variables before importing other modules
dotenv.config();

const app = require ('./src/App.js');
const connectDB = require('./src/config/db.js');
const PORT = process.env.PORT || 5002;

connectDB();
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});