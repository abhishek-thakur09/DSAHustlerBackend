const express = require("express");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { authLimiter } = require("../utils/rate.js");
const authmiddleware = require("../middleware/authentication");
require("dotenv").config();
const upload = require("../middleware/upload.js");

const router = express.Router();


router.post("/signin", async (req, res) => {
  try {
    const { profileImage, name, email, password, role } = req.body;

    console.log(name);

    const searchUser = await User.findOne({ email });

    if (searchUser) {
      return res.status(400).json("email is already taken");
    }

    await User.create({profileImage, name, email, password, role });
    res.status(201).json({ message: "user signIn successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (password != user.password) {
      return res.status(400).json({ message: "Password is wrong" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_KEY,
      { expiresIn: "1h" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "logged in",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "server failed" });
  }
});

router.get("/loggedinUser", authmiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (err) {
    res.status(401).json({ message: "Not authenticated" });
  }
});


// for uploading profile image
router.post(
  "/upload",
  upload.single("profileImage"),
  async (req, res) => {

    try {

      console.log("FILE:", req.file);
      console.log("BODY:", req.body);

      res.json({ ok: true });

    } catch (err) {

      console.log("🔥🔥 REAL ERROR:", err);   // <--- MOST IMPORTANT

      res.status(500).json({
        message: err.message,
      });
    }
  }
);



router.patch("/update", authmiddleware,async (req, res) => {
    try {      console.log("BODY:", req.body);

      const updates = {};

      if (req.body.name) {
        updates.name = req.body.name;
      }


      const user = await User.findByIdAndUpdate(
        req.user.id,
        updates,
        { new: true }
      );

      res.status(200).json({
        message: "Profile updated successfully",
        user,
      });

    } catch (err) {
      console.log(err);
      res.status(500).json({ message: err.message });
    }
  }
);


router.get("/stats", async (req, res) => {
  const totalUsers = await User.countDocuments();
  res.json({ totalUsers });
});

router.post("/logout", authmiddleware, (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server failed",
    });
  }
});

module.exports = router;
