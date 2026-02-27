const express = require("express");
const { Readable } = require("stream");
const cloudinary = require("../utils/cloudinary.js");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { authLimiter } = require("../utils/rate.js");
const authmiddleware = require("../middleware/authentication");
require("dotenv").config();
const upload = require("../middleware/upload.js");

const Authrouter = express.Router();

Authrouter.post("/signin", async (req, res) => {
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

Authrouter.post("/login", authLimiter, async (req, res) => {
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
      { expiresIn: "7d" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
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

Authrouter.get("/loggedinUser", authmiddleware, async (req, res) => {
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
Authrouter.post(
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

Authrouter.patch("/update", authmiddleware, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ message: "User not found" });
    }

    const loginUser = await User.findById(req.user.id);

    console.log(loginUser);

    if (!loginUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // update fields
    Object.keys(req.body).forEach((key) => {
      loginUser[key] = req.body[key];
    });

    await loginUser.save();

    res.json({
      message: "Profile updated successfully",
      user: loginUser,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


Authrouter.get("/stats", async (req, res) => {
  const totalUsers = await User.countDocuments();
  res.json({ totalUsers });
});

Authrouter.post("/logout", authmiddleware, (req, res) => {
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

Authrouter.get("/users", authmiddleware, async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
});

Authrouter.delete("/user-delete/:id", authmiddleware, async (req, res) => {
  try {
    // get id from params
    const userId = req.params.id;
    console.log(userId);

    // delete user
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.status(200).json({
      message: "User deleted successfully"
    });

  } catch (err) {
    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
});

module.exports = Authrouter;
