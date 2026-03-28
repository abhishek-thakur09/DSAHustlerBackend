const express = require("express");
const Problem = require("../models/problems");
const authmiddleware = require("../middleware/authentication");
const client = require("../utils/radis");

const Problemrouter = express.Router();

Problemrouter.post("/problem", authmiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      difficulty,
      tags,
      constraints,
      functionSignature,
      testCases,
    } = req.body;

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admin can create problems",
      });
    }

    const errors = [];

    if (!title) errors.push("title");
    if (!description) errors.push("description");
    if (!difficulty) errors.push("difficulty");
    if (!Array.isArray(tags) || tags.length === 0) errors.push("tags");

    if (errors.length > 0) {
      return res.status(400).json({
        message: "Missing or invalid fields",
        errors,
      });
    }

    if (!Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({
        message: "At least one testCase is required",
      });
    }

    await Problem.create({
      title,
      description,
      difficulty,
      tags,
      constraints,
      functionSignature,
      testCases,
    });

    res.status(201).json({
      message: `${title} problem added successfully`,
    });
  } catch (err) {
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});

// for getting all the problems in limit
Problemrouter.get("/problems", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const key = `problems:${page}:${limit}`;

    // 1. check cache
    const cached = await client.get(key);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // 2. DB call
    const skip = (page - 1) * limit;

    const problems = await Problem.find()
      .sort({ createdAt: -1 }) // ⭐ important
      .skip(skip)
      .limit(limit);

    const total = await Problem.countDocuments();

    const data = {
      total,
      problems,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };

    // 3. store in cache
    await client.set(key, JSON.stringify(data), { EX: 60 });

    // 4. response
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch" });
  }
});

Problemrouter.get("/allProblems", async (req, res) => {
  try {
    const problems = await Problem.find();

    res.json({ problems });
  } catch (err) {
    res.status(404).send({ message: "problems not found" });
  }
});

// get the single problem!

Problemrouter.get("/singleProblem/:id", authmiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const problem = await Problem.findById(id);

    if (!problem) {
      return res.status(404).send({ message: "Problem not found!" });
    }

    res.status(200).json(problem);
  } catch (error) {
    res.status(500).send({ message: "server ~hash been crashed!" });
  }
});

// get problem with tags

Problemrouter.get("/problem/tag/:tag", authmiddleware, async (req, res) => {
  try {
    const { tag } = req.params;

    const problems = await Problem.find({
      tags: { $in: [tag] },
    }).select("title difficulty tags");

    if (problems.length === 0) {
      return res.status(404).json({
        message: `No problems found for tag: ${tag}`,
      });
    }

    res.status(200).send({
      count: problems.length,
      problems,
    });
  } catch (error) {
    res.status(500).send({ message: "Server is failed!", error });
  }
});

// get problems by their difficulty level

Problemrouter.get(
  "/difficultylevel/:levels",
  authmiddleware,
  async (req, res) => {
    try {
      const { level } = req.params;
      const problem = await Problem.find(level);

      res.status(200).send(problem);
    } catch (error) {
      res.status(500).send({ message: "Your server has been failed!" });
    }
  },
);

// Delete the problem

Problemrouter.delete(
  "/delete-problem/:id",
  authmiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      const problem = await Problem.findByIdAndDelete(id);

      if (!problem) {
        return res.status(404).send({ message: "Problem not found!" });
      }
      res.status(200).send({ message: "Problem deleted successfully" });
    } catch (err) {
      res.status(500).send({ message: "Server failed Try again" });
    }
  },
);

// update the problem
Problemrouter.patch("/update-problem/:id", authmiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const updateproblem = await Problem.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updateproblem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    res.status(200).send(updateproblem);
  } catch (err) {
    res.status(500).send({ message: "Server has been failed", err });
  }
});


Problemrouter.post('/submit-code', async (req, res) => {
  const rawCode = req.body.source_code; // The plain text code from the user
  const languageId = req.body.language_id;

  // Convert the plain text string to a Base64 encoded string
  const encodedCode = Buffer.from(rawCode).toString('base64');

  const judge0Payload = {
    source_code: encodedCode,
    language_id: languageId
  };

});


module.exports = Problemrouter;
