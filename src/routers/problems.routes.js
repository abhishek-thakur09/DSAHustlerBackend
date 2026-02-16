const express = require("express");
const Problem = require("../models/problems");
const authmiddleware = require("../middleware/authentication");
const client  = require("../utils/radis");

const router = express.Router();

router.post("/problem", authmiddleware, async (req, res) => {
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

// for getting all the problems

router.get("/problems", async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);

    // if no pagination → return all problems
    if (!page || !limit) {
      const problems = await Problem.find();
      return res.json({ total: problems.length, problems });
    }

    const skip = (page - 1) * limit;

    const problems = await Problem.find().skip(skip).limit(limit);
    const total = await Problem.countDocuments();

    res.json({
      total,
      problems,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });

  } catch (err) {
    res.status(500).json({ message: "Failed to fetch" });
  }
});


// get the single problem!

router.get("/singleProblem/:id", authmiddleware, async (req, res) => {
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

router.get("/problem/tag/:tag", authmiddleware, async (req, res) => {
  try {

    const {tag} = req.params;

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
    res.status(500).send({ message: "Server is failed!",error });
  }
});

// get problems by their difficulty level

router.get("/difficultylevel/:levels", authmiddleware, async (req, res) => {
  try {
    const { level } = req.params;
    const problem = await Problem.find(level);

    res.status(200).send(problem);
  } catch (error) {
    res.status(500).send({ message: "Your server has been failed!" });
  }
});

// Delete the problem

router.delete("/delete-problem/:id", authmiddleware, async (req, res) => {
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
});

// update the problem
router.patch("/update-problem/:id", authmiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const updateproblem = await Problem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );

    res.send(updateproblem);

    res.status(200).send("user updated successfullyy!");
  } catch (err) {
    res.status(500).send({ message: "Server has been failed", err });
  }
});

module.exports = router;
