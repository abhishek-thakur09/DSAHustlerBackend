const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.cookies?.token;

  console.log(token);

  if (!token) {
    return res.status(401).json({
      message: "User is not authenticated",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);

    req.user = {
      id: decoded.userId,
      role: decoded.role,
    };

    console.log(req.user);

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};
