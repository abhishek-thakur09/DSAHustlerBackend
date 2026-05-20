const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const AiRouter = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

AiRouter.post("/aiInstructure", async (req, res) => {
  try {
    const { type, title, difficulty, tags, description } = req.body;

    let userPrompt = "";

    if (type === "hint") {
      userPrompt = `
  Give progressive hints only.
  Do not reveal full code.
  `;
    }

    if (type === "dryrun") {
      userPrompt = `
  Explain the problem using a dry run.
  `;
    }

    if (type === "complexity") {
      userPrompt = `
  Explain optimal time and space complexity.
  `;
    }

    if (type === "pattern") {
      userPrompt = `
  Explain the DSA pattern used in this problem.
  `;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userPrompt,
      config: {
        systemInstruction: `



You are a DSA mentor.

Problem Title:
${title}

Difficulty:
${difficulty}

Tags:
${tags.join(", ")}

Problem Description:
${description}

Guide the user with hints only.
`,
      },
    });

    res.json({
      hint: response.text,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "AI error" });
  }
});

module.exports = AiRouter;
