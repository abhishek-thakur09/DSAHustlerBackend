const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const chatWithAI = async (req, res) => {
  try {
    const message = req.body?.message;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    const respons = await ai.models.generateContent({
      model: "gemini-2.0-flash",   // ✅ latest working model
      contents: message,
    });

     const prompt = `
You are a helpful CSE mentor.

You help with:
- DSA
- LLD
- HLD
- SQL
- Programming
- Coding problems

If question is not related, politely ask user to ask CSE related questions.

User Question: ${message}
`;

 const result = await model.generateContent(prompt);
 const response = result.respons.text();

    res.json({
      reply: response,
    });

  } catch (error) {
    console.log("AI ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { chatWithAI };
