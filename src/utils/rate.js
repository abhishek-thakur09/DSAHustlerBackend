const rateLimit = require("express-rate-limit");

const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10, // 10 submissions per minute
});

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5, //login attempts per 10 minute
});

module.exports = { submitLimiter, authLimiter };
