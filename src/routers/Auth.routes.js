const express = require("express");
const mongoose = require("mongoose");
const cloudinary = require("../utils/cloudinary.js");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { authLimiter } = require("../utils/rate.js");
const authmiddleware = require("../middleware/authentication");
require("dotenv").config();
const passport = require("passport");
const Submission = require("../models/Submission");
const upload = require("../middleware/upload.js");

const Authrouter = express.Router();

Authrouter.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

Authrouter.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
  }),
  (req, res) => {
    const token = jwt.sign(
      {
        userId: req.user._id,
        role: req.user.role,
      },
      process.env.JWT_KEY,
      { expiresIn: "7d" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 2 * 24 * 60 * 60 * 1000,
    });

    res.redirect("http://localhost:5173/");
  },
);

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
      path: "/",
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
  },
);

Authrouter.patch("/update", authmiddleware, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ message: "User not found" });
    }

    const loginUser = await User.findById(req.user.id);

    if (!loginUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // update fields
    const allowedFields = [
      "name",
      "lastName",
      "linkedInProfile",
      "githubProfile",
      "bio",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        loginUser[field] = req.body[field];
      }
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

Authrouter.get("/user-stats", authmiddleware, async (req, res) => {
  try {
    // 1. Validate ID
    const userId = req.user.id || req.user._id;
    if (!userId)
      return res.status(401).json({ message: "User not authenticated" });

    const stats = await Submission.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          status: "Accepted",
        },
      },
      {
        $lookup: {
          from: "problems",
          localField: "problem",
          foreignField: "_id",
          as: "problemDetails",
        },
      },
      {
        $unwind: {
          path: "$problemDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$problemDetails.difficulty",
          count: { $sum: 1 },
        },
      },
    ]);

    const result = { easy: 0, medium: 0, hard: 0, totalSolved: 0 };

    stats.forEach((item) => {
      if (item._id) {
        const difficulty = item._id.toLowerCase();
        // Check if difficulty is one of our keys
        if (difficulty in result) {
          result[difficulty] = item.count;
        }
        result.totalSolved += item.count;
      }
    });

    res.json(result);
  } catch (err) {
    console.error("Aggregation Error:", err);
    res.status(500).json({ message: err.message });
  }
});

Authrouter.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

Authrouter.get("/users", authmiddleware, async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

Authrouter.get("/user-activity", authmiddleware, async (req, res) => {
  try {
    const activity = await Submission.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user.id),
          status: "Accepted",
        },
      },

      {
        $lookup: {
          from: "problems",
          localField: "problem",
          foreignField: "_id",
          as: "problemDetails",
        },
      },

      {
        $unwind: "$problemDetails",
      },

      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },

          count: { $sum: 1 },

          problems: {
            $push: "$problemDetails.title",
          },
        },
      },

      {
        $project: {
          _id: 0,

          date: "$_id",

          count: 1,

          problems: 1,
        },
      },
    ]);

    res.json(activity);
  } catch (err) {
    res.status(500).json({
      message: err.message,
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
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});

module.exports = Authrouter;
