const express = require("express");
const { chatWithAI } = require("../middleware/AiHelper");

const router = express.Router();

router.post("/chat", chatWithAI);

module.exports = router;