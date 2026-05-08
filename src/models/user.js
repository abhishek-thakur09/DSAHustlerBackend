const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
    trim: true,
  },

  lastName: {
    type: String,
    trim: true,
    default: "",
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  password: {
    type: String,
    minlength: 6,
    default: null, // null for Google/GitHub users
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },

  profileImage: {
    type: String,
    default: "",
  },

  linkedInProfile: {
    type: String,
    trim: true,
    default: "",
  },

  githubProfile: {
    type: String,
    trim: true,
    default: "",
  },

  bio:{
    type: String,
    trim: true,
    default: "",
  },

  provider: {
    type: String,
    enum: ["local", "google", "github"],
    default: "local",
  },

  providerId: {
    type: String,
    default: "",
  },

  isVerified: {
    type: Boolean,
    default: false,
  }

},
{
  timestamps: true
});

module.exports = mongoose.model("User", userSchema);