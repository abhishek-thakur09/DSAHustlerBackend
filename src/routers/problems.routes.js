const express = require("express");
const Problem = require("../models/problems");
const authmiddleware = require("../middleware/authentication");
const client = require("../utils/radis");
const Submission = require("../models/Submission");
const axios = require("axios");
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
      starterCode,
      driverCode,
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
      starterCode,
      driverCode,
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
Problemrouter.get("/problems", async (req, res) => {
  try {
    // Updated cache key
    const key = "problems:all";

    // Check cache
    const cached = await client.get(key);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Fetch all problems sorted by newest first
    const problems = await Problem.find().sort({ createdAt: -1 });

    // We keep 'total' and 'problems' to maintain compatibility with your frontend hook
    const data = {
      total: problems.length,
      problems,
      totalPages: 1,
      currentPage: 1,
    };

    //Store in cache
    await client.set(key, JSON.stringify(data), { EX: 60 });

    //Send response
    res.json(data);
  } catch (err) {
    console.error("Error fetching problems:", err);
    res.status(500).json({ message: "Failed to fetch problems" });
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

//Convert code and input to Base64 (Judge0 requirement)
const encode = (str) => Buffer.from(str || "").toString("base64");

// //Wait for Judge0 to finish processing the code
async function pollForResult(token) {
  const JUDGE0_URL = `http://localhost:2358/submissions/${token}?base64_encoded=false`;
  while (true) {
    const res = await axios.get(JUDGE0_URL);
    const statusId = res.data.status.id;

    if (statusId > 2) return res.data;

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// // The main function that sends code to Judge0
async function executeCode(sourceCode, languageId, stdin = "") {
  const JUDGE0_URL = "http://localhost:2358/submissions";
  try {
    const response = await axios.post(
      `${JUDGE0_URL}/?base64_encoded=true&wait=false`,
      {
        source_code: encode(sourceCode),
        language_id: languageId,
        stdin: encode(stdin),
      },
    );

    return await pollForResult(response.data.token);
  } catch (error) {
    console.error("Judge0 API Error:", error.message);
    throw error;
  }
}

Problemrouter.post("/run", authmiddleware, async (req, res) => { // 1. Ensure authmiddleware is present
  const { source_code, language_id, problemId, testCases, isSubmit } = req.body;

  try {
    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    const langMap = { 54: "cpp", 63: "javascript", 71: "python", 62: "java" };
    const langKey = langMap[language_id];
    if (!langKey) return res.status(400).json({ error: "Unsupported language" });

    const driver = problem.driverCode[langKey];
    const finalCompilableCode = driver.replace("//USER_CODE_HERE", source_code);

    let testCasesToRun = isSubmit 
      ? problem.testCases 
      : (testCases?.length > 0 ? testCases : problem.testCases.filter(t => t.isSample));

    const testResults = [];
    let allPassed = true;

    for (const testCase of testCasesToRun) {
      const result = await executeCode(finalCompilableCode, language_id, testCase.input);
      
      const actualOutput = (result.stdout || "").trim();
      const expectedOutput = (testCase.output || "").trim();
      const isCorrect = actualOutput === expectedOutput;

      if (!isCorrect) allPassed = false;

      testResults.push({
        passed: isCorrect,
        status: result.status?.description || "Error",
        actual: actualOutput,
        expected: expectedOutput,
        time: result.time,
        memory: result.memory,
      });
    }

    const total = testCasesToRun.length;
    const passedCount = testResults.filter((t) => t.passed).length;
    const overallStatus = passedCount === total ? "Accepted" : "Rejected";

    //LOG EVERY SUBMISSION (For Stats & Heatmap)
    if (isSubmit && req.user) {
      await Submission.create({
        user: req.user.id,
        problem: problemId,
        status: overallStatus,
        source_code: source_code,
        language_id: language_id,
        runtime: Math.max(...testResults.map(r => parseFloat(r.time) || 0)).toString(),
        memory: Math.max(...testResults.map(r => parseInt(r.memory) || 0))
      });
    }

    //Return 'isSolved' flag for immediate UI update
    res.status(200).json({
      overallStatus,
      total,
      passed: passedCount,
      results: testResults,
      isSolved: overallStatus === "Accepted"
    });

  } catch (err) {
    console.error("Route Error:", err);
    return res.status(500).json({ error: "Judging failed" });
  }
});

module.exports = Problemrouter;
