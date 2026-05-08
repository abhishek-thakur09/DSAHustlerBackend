const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },
    status: { 
      type: String, 
      enum: ["Accepted", "Rejected"], 
      required: true 
    },
    source_code: { 
      type: String, 
      required: true 
    },
    language_id: { 
      type: Number, 
      required: true 
    },
    runtime: { 
      type: String 
    },
    memory: { 
      type: Number 
    },
  },
  { timestamps: true },
);
submissionSchema.index({ user: 1, problem: 1, status: 1 });

module.exports = mongoose.models.Submission || mongoose.model("Submission", submissionSchema);
