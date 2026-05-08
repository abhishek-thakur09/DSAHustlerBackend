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
      required: true
    },
    functionSignature: {
      type: String,
      required: true,
    },
    starterCode: {
      cpp: String,
      python: String,
      javascript: String,

    },
    driverCode: {
     type: {
        cpp: String,
      python: String,
      javascript: String,
     }
    },
    testCases: {
      type: [testCaseSchema],
      required: true,
    },
    timeLimit: {
      type: Number,
      default: 2,
    },
    memoryLimit: {
      type: Number,
      default: 256,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Problem", problemSchema);
