import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

/* =========================================================
   STUDYMATE FREE / PREMIUM USAGE SYSTEM
========================================================= */

const FREE_STUDY_LIMIT = 5;
const FREE_ASK_LIMIT = 10;

const PREMIUM_STUDY_LIMIT = 100;
const PREMIUM_ASK_LIMIT = 200;

/*
  First-stage Premium system.

  Add Firebase user IDs here through the
  STUDYMATE_PREMIUM_USERS environment variable.

  Example:
  STUDYMATE_PREMIUM_USERS=uid1,uid2,uid3

  Payment integration can replace this later.
*/
const premiumUsers = new Set(
  String(process.env.STUDYMATE_PREMIUM_USERS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
);

const usageStore = new Map();

function getUsageDate() {
  const now = new Date();

  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getUsage(userId) {
  const today = getUsageDate();
  const premium = premiumUsers.has(userId);

  let usage = usageStore.get(userId);

  if (!usage || usage.date !== today) {
    usage = {
      date: today,
      study: 0,
      ask: 0,
    };

    usageStore.set(userId, usage);
  }

  return {
    userId,
    plan: premium ? "premium" : "free",
    isPremium: premium,
    study: {
      used: usage.study,
      limit: premium
        ? PREMIUM_STUDY_LIMIT
        : FREE_STUDY_LIMIT,
      remaining: Math.max(
        0,
        (premium
          ? PREMIUM_STUDY_LIMIT
          : FREE_STUDY_LIMIT) - usage.study
      ),
    },
    ask: {
      used: usage.ask,
      limit: premium
        ? PREMIUM_ASK_LIMIT
        : FREE_ASK_LIMIT,
      remaining: Math.max(
        0,
        (premium
          ? PREMIUM_ASK_LIMIT
          : FREE_ASK_LIMIT) - usage.ask
      ),
    },
  };
}

function consumeUsage(userId, type) {
  if (!userId || typeof userId !== "string") {
    return {
      allowed: false,
      error: "A valid StudyMate account is required.",
    };
  }

  const today = getUsageDate();
  const premium = premiumUsers.has(userId);

  let usage = usageStore.get(userId);

  if (!usage || usage.date !== today) {
    usage = {
      date: today,
      study: 0,
      ask: 0,
    };

    usageStore.set(userId, usage);
  }

  const limit =
    type === "study"
      ? premium
        ? PREMIUM_STUDY_LIMIT
        : FREE_STUDY_LIMIT
      : premium
        ? PREMIUM_ASK_LIMIT
        : FREE_ASK_LIMIT;

  if (usage[type] >= limit) {
    return {
      allowed: false,
      premium,
      usage: getUsage(userId),
    };
  }

  usage[type] += 1;

  return {
    allowed: true,
    premium,
    usage: getUsage(userId),
  };
}


app.use(cors());
app.use(express.json({ limit: "5mb" }));

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is missing from .env");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL =
  process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

function cleanText(text) {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    .replace(/\u0000/g, "")
    .replace(/\r/g, "")
    .trim();
}

function limitMaterial(text) {
  const cleaned = cleanText(text);

  const MAX_CHARACTERS = 120000;

  if (cleaned.length <= MAX_CHARACTERS) {
    return cleaned;
  }

  return (
    cleaned.slice(0, MAX_CHARACTERS) +
    "\n\n[StudyMate note: The material was shortened because it is very large.]"
  );
}

function parseJson(text) {
  let cleaned = cleanText(text);

  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();
  }

  return JSON.parse(cleaned);
}

function buildPrompt(action, material) {
  const source = limitMaterial(material);

  const baseRules = `
You are StudyMate, an expert academic study assistant.

Your job is to help a university student understand their own study material.

IMPORTANT RULES:
- Use ONLY the supplied study material as the main source.
- Do not invent facts that contradict the material.
- If something is unclear or missing, say so.
- Use simple, clear student-friendly English.
- Explain difficult academic ideas without unnecessarily complicated language.
- Preserve important technical terms.
- Organize the answer clearly.
- Be useful for examination preparation.

STUDY MATERIAL:
----------------
${source}
----------------
`;

  if (action === "explain") {
    return `
${baseRules}

TASK:
Explain the study material in a way that a student can actually understand.

Return JSON in exactly this structure:

{
  "title": "A useful title",
  "overview": "A short overview",
  "sections": [
    {
      "heading": "Topic heading",
      "explanation": "Clear explanation",
      "keyPoints": ["Important point 1", "Important point 2"]
    }
  ],
  "examTips": ["Tip 1", "Tip 2", "Tip 3"]
}

Give enough detail to teach the material, but don't unnecessarily repeat yourself.
`;
  }

  if (action === "summarize") {
    return `
${baseRules}

TASK:
Create high-quality revision notes from the material.

Return JSON in exactly this structure:

{
  "title": "Revision Notes",
  "summary": "A concise but useful summary",
  "keyPoints": [
    "Important point",
    "Important point"
  ],
  "importantTerms": [
    {
      "term": "Term",
      "meaning": "Simple meaning"
    }
  ],
  "examTips": [
    "Useful exam tip"
  ]
}

Focus on information that is likely to matter when revising.
`;
  }

  if (action === "questions") {
    return `
${baseRules}

TASK:
Generate 10 university-level practice questions from the material.

Mix:
- multiple choice questions
- short-answer questions

Return JSON in exactly this structure:

{
  "title": "Practice Questions",
  "questions": [
    {
      "type": "mcq",
      "question": "Question",
      "options": ["A", "B", "C", "D"],
      "answer": "Correct option",
      "explanation": "Why this answer is correct"
    },
    {
      "type": "short",
      "question": "Question",
      "answer": "Expected answer",
      "explanation": "Explanation"
    }
  ]
}

Make questions directly relevant to the supplied material.
`;
  }

  if (action === "flashcards") {
    return `
${baseRules}

TASK:
Create 12 useful study flashcards.

Return JSON in exactly this structure:

{
  "title": "Study Flashcards",
  "cards": [
    {
      "front": "Question or term",
      "back": "Clear answer"
    }
  ]
}

Keep each card concise and focused on one concept.
`;
  }

  if (action === "quiz") {
    return `
${baseRules}

TASK:
Create a 10-question multiple-choice quiz.

Return JSON in exactly this structure:

{
  "title": "StudyMate Quiz",
  "questions": [
    {
      "question": "Question",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explanation": "Explanation of the correct answer"
    }
  ]
}

The "answer" value MUST be the zero-based index of the correct option.
`;
  }

  throw new Error("Unsupported study action.");
}

async function askGemini(prompt) {
  let response;
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          temperature: 0.4,
        },
      });

      break;
    } catch (error) {
      lastError = error;

      const status =
        error?.status ||
        error?.code ||
        error?.error?.code;

      console.log(
        `Gemini attempt ${attempt}/3 failed:`,
        status || error.message
      );

      if (attempt < 3) {
        const delay = attempt * 3000;

        console.log(
          `Retrying in ${delay / 1000} seconds...`
        );

        await new Promise((resolve) =>
          setTimeout(resolve, delay)
        );
      }
    }
  }

  if (!response) {
    throw lastError ||
      new Error("Gemini request failed after 3 attempts.");
  }

  const text = response.text;

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}


/* =========================================================
   USAGE
========================================================= */

app.get("/api/usage", (req, res) => {
  const userId = String(req.query.userId || "").trim();

  if (!userId) {
    return res.status(400).json({
      error: "userId is required.",
    });
  }

  return res.json(getUsage(userId));
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "StudyMate AI",
  });
});

app.post("/api/study", async (req, res) => {

  const userId = String(req.body?.userId || "").trim();

  const usageCheck = consumeUsage(
    userId,
    "study"
  );

  if (!usageCheck.allowed) {
    return res.status(
      usageCheck.usage ? 402 : 400
    ).json({
      error:
        usageCheck.usage
          ? "You have reached your daily AI study limit. Upgrade to Premium for more AI study actions."
          : usageCheck.error,
      code:
        usageCheck.usage
          ? "PREMIUM_REQUIRED"
          : "USER_REQUIRED",
      usage: usageCheck.usage || null,
    });
  }


  try {
    const { action, material } = req.body;

    const validActions = [
      "explain",
      "summarize",
      "questions",
      "flashcards",
      "quiz",
    ];

    if (!validActions.includes(action)) {
      return res.status(400).json({
        error: "Invalid study action.",
      });
    }

    if (!material || typeof material !== "string") {
      return res.status(400).json({
        error: "Study material is required.",
      });
    }

    if (material.trim().length < 20) {
      return res.status(400).json({
        error: "The study material is too short.",
      });
    }

    const prompt = buildPrompt(action, material);

    const rawText = await askGemini(prompt);

    let result;

    try {
      result = parseJson(rawText);
    } catch (parseError) {
      console.error("Gemini JSON parse error:", rawText);

      return res.status(502).json({
        error:
          "StudyMate received an invalid AI response. Please try again.",
      });
    }

    res.json({
      success: true,
      action,
      result,
    });
  } catch (error) {
    console.error("StudyMate AI error:", error);

    res.status(500).json({
      error:
        error?.message ||
        "Something went wrong while generating your study material.",
    });
  }
});

/*
  ASK STUDYMATE
  -------------------------------
  Allows the student to ask questions
  about the uploaded material.
*/

app.post("/api/ask", async (req, res) => {

  const userId = String(req.body?.userId || "").trim();

  const usageCheck = consumeUsage(
    userId,
    "ask"
  );

  if (!usageCheck.allowed) {
    return res.status(
      usageCheck.usage ? 402 : 400
    ).json({
      error:
        usageCheck.usage
          ? "You have reached your daily Ask StudyMate limit. Upgrade to Premium for more questions."
          : usageCheck.error,
      code:
        usageCheck.usage
          ? "PREMIUM_REQUIRED"
          : "USER_REQUIRED",
      usage: usageCheck.usage || null,
    });
  }


  try {
    const { question, material, history = [] } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({
        error: "Please enter a question.",
      });
    }

    if (!material || typeof material !== "string") {
      return res.status(400).json({
        error: "Study material is required.",
      });
    }

    if (question.trim().length < 2) {
      return res.status(400).json({
        error: "Please enter a longer question.",
      });
    }

    const source = limitMaterial(material);

    const previousConversation = Array.isArray(history)
      ? history
          .slice(-6)
          .map(
            (item) =>
              `${item.role === "user" ? "Student" : "StudyMate"}: ${item.content}`
          )
          .join("\n")
      : "";

    const prompt = `
You are StudyMate, an expert academic study assistant.

The student uploaded study material and wants to ask questions about it.

IMPORTANT RULES:
- Base your answer primarily on the supplied study material.
- Do not pretend information is in the material if it is not.
- If the answer cannot be found in the material, clearly say:
  "I couldn't find that information in your uploaded material."
- You may give a brief general explanation when useful, but clearly distinguish it from information found in the material.
- Use simple student-friendly English.
- Explain difficult concepts step by step.
- Preserve important academic terminology.
- Do not unnecessarily repeat the question.
- Make the answer useful for exams.

UPLOADED STUDY MATERIAL:
-------------------------
${source}
-------------------------

PREVIOUS CONVERSATION:
----------------------
${previousConversation || "No previous conversation."}
----------------------

CURRENT STUDENT QUESTION:
${question}

Answer the student's question clearly and directly.
`;

    const answer = await askGemini(prompt);

    res.json({
      success: true,
      answer: cleanText(answer),
    });
  } catch (error) {
    console.error("StudyMate Ask error:", error);

    res.status(500).json({
      error:
        error?.message ||
        "StudyMate could not answer your question.",
    });
  }
});

app.listen(PORT, () => {
  console.log("");
  console.log("🎓 StudyMate AI server");
  console.log(`🚀 Running on http://localhost:${PORT}`);
  console.log(`🤖 Gemini model: ${MODEL}`);
  console.log("");
});