const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    lastName:{
      type: String,
      trim: true,
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
      required: true,
      minlength: 6,
      trim: true,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    profileImage : {
      type: String, 
      default: "",
    },

    likedInProfile:{
      type: String,
      trim: true,
    },
     GithubProfile:{
      type: String,
      trim: true,
    }
  },
  {
    timestamps: true, 
  }
);

module.exports = mongoose.model("User", userSchema);
