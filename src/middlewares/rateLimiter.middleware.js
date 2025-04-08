// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,     // 1 minute
  max: 5,                      // max 5 requests per IP per minute
  message: {
    success: false,
    message: "Too many login attempts. Please try again after a minute.",
  },
  standardHeaders: true,      // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,       // Disable the `X-RateLimit-*` headers
});

module.exports = { loginLimiter };
