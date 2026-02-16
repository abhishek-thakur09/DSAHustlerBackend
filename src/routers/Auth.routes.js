const express = require("express");
const { Readable } = require("stream");
const cloudinary = require("../utils/cloudinary.js");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { authLimiter } = require("../utils/rate.js");
const authmiddleware = require("../middleware/authentication");
require("dotenv").config();
const upload = require("../middleware/upload.js");

const router = express.Router();

router.post("/signin", async (req, res) => {
  try {
    const {
      profileImage,
      name,
      lastName,
      email,
      password,
      role,
      likedInProfile,
      GithubProfile,
    } = req.body;

    const searchUser = await User.findOne({ email });

    if (searchUser) {
      return res.status(400).json("email is already taken");
    }

    await User.create({
      profileImage,
      name,
      lastName,
      email,
      password,
      likedInProfile,
      GithubProfile,
      role,
    });
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
  authmiddleware, // get logged-in user
  upload.single("profileImage"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "profileImage is required",
        });
      }

      // cloudinary values
      const newImageUrl = req.file.path;
      const newPublicId = req.file.filename;

      // logged-in user id
      const user = await User.findById(req.user.id);

      console.log(user);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      // delete old image
      if (user.profileImagePublicId) {
        await cloudinary.uploader.destroy(user.profileImagePublicId);
      }

      // update new image
      user.profileImage = newImageUrl;
      user.profileImagePublicId = newPublicId;

      await user.save();

      res.json({
        success: true,
        message: "Profile image updated",
        user,
      });

    } catch (err) {
      console.log(err);
      res.status(500).json({
        message: err.message,
      });
    }
  }
);

router.patch("/update", authmiddleware, async (req, res) => {
  try {
    const allowedUpdates = ["name", "lastName", "likedInProfile", "GithubProfile"];

    const updates = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(user);

    res.json({
      message: "Profile updated successfully",
      user,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});


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
