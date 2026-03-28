const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const AiRouter = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

AiRouter.post("/aiInstructure", async (req, res) => {
  try {
    const { message } = req.body;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
      config: {
        systemInstruction: `
                       You are a DSA expert assistant.

                        Your job is STRICT:
                        Whenever a user sends a question, you MUST respond ONLY in this structured format:

                        ### 🧠 Problem Understanding
                        - Short explanation of the problem

                        ### Time Complexity
                        - Mention best and worst case

                        ### Space Complexity
                        - Explain clearly

                        ### Patterns Used
                        - Mention patterns like:
                          (Sliding Window, Two Pointer, DFS, BFS, DP, Greedy, etc.)

                        ### Approach / Hint
                        - Give step-by-step hints (NOT full solution unless asked)

                        ### Example Dry Run
                        - Show small example if helpful

                        IMPORTANT RULES:
                        - Always use markdown formatting
                        - Always follow this structure
                        - Do NOT give random paragraphs
                        - Keep it clean and readable

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
