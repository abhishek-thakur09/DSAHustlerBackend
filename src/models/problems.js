
const mongoose = require("mongoose");


const testCaseSchema = new mongoose.Schema({
  input: {
    type: String,
    required: true,
  },
  output: {
    type: String,
    required: true,
  },
  isSample: {
    type: Boolean,
    default: false, 
  },
});

const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },

    tags: {
      type: [String],
      index: true,
    },

    constraints: {
      type: String,
    },

    functionSignature: {
      type: String,
      required: true,
      example: "function twoSum(nums, target)",
    },

    testCases: {
      type: [testCaseSchema],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Problem", problemSchema);