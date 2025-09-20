const jwt = require("jsonwebtoken");

const authMiddleware = (...roles) => {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Expect: "Bearer TOKEN"
    if (!token) return res.status(401).json({ message: "No token provided" });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // attach decoded info to request

      if (roles.length && !roles.includes(decoded.role)) {
        // User role is not allowed
        return res.status(403).json({ message: "Access denied: insufficient permissions" });
      }

      next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};

module.exports = authMiddleware;
