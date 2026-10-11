import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PDFParse } from "pdf-parse";

dotenv.config();
const app = express();
const PORT = Number(process.env.PORT || 5000);
const uploadDir = path.resolve("uploads");
const dataDir = path.resolve("data");
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "5mb" }));

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".pdf", ".txt", ".mp3", ".wav", ".m4a", ".mp4", ".ogg", ".png", ".jpg", ".jpeg"];
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Supported formats: PDF, TXT, Audio/Video (MP3, WAV, M4A, MP4), Slides (PNG, JPG)."));
  }
});

// Persistent Storage (JSON Database)
const dataFile = path.join(dataDir, "store.json");
function loadData() {
  try {
    if (fs.existsSync(dataFile)) {
      const parsed = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
      return {
        materials: Array.isArray(parsed.materials) ? parsed.materials : [],
        quizAttempts: Array.isArray(parsed.quizAttempts) ? parsed.quizAttempts : []
      };
    }
  } catch (err) {
    console.error("Failed to load store.json:", err);
  }
  return { materials: [], quizAttempts: [] };
}

const initial = loadData();
const materials = initial.materials;
const quizAttempts = initial.quizAttempts;
const quizzes = new Map();

function saveData() {
  try {
    fs.writeFileSync(dataFile, JSON.stringify({ materials, quizAttempts }, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save store.json:", err);
  }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function chunkText(text, maxChars = 850, overlap = 120) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(clean.length, start + maxChars);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}

function makeMaterial({ title, text, type, segments = [], metadata = {} }) {
  const id = crypto.randomUUID();
  let chunks = [];

  if (segments && segments.length > 0) {
    let currentChunk = "";
    let chunkStart = segments[0].start;
    let chunkEnd = segments[0].end;
    let idx = 0;

    for (const seg of segments) {
      if (currentChunk.length + (seg.text || "").length > 700) {
        chunks.push({
          id: crypto.randomUUID(),
          content: currentChunk.trim(),
          chunkIndex: idx++,
          timestamp: `${formatTime(chunkStart)} - ${formatTime(chunkEnd)}`,
          sourceType: type
        });
        currentChunk = (seg.text || "") + " ";
        chunkStart = seg.start;
        chunkEnd = seg.end;
      } else {
        currentChunk += (seg.text || "") + " ";
        chunkEnd = seg.end;
      }
    }
    if (currentChunk.trim()) {
      chunks.push({
        id: crypto.randomUUID(),
        content: currentChunk.trim(),
        chunkIndex: idx++,
        timestamp: `${formatTime(chunkStart)} - ${formatTime(chunkEnd)}`,
        sourceType: type
      });
    }
  } else {
    chunks = chunkText(text).map((content, index) => ({
      id: crypto.randomUUID(),
      content,
      chunkIndex: index,
      timestamp: null,
      sourceType: type
    }));
  }

  const material = {
    id,
    title,
    type,
    text: String(text || ""),
    wordCount: String(text || "").split(/\s+/).filter(Boolean).length,
    createdAt: new Date().toISOString(),
    chunks,
    metadata
  };
  materials.unshift(material);
  saveData();
  return material;
}

function terms(s) {
  return String(s || "").toLowerCase().match(/[a-z0-9]+/g)?.filter(t => t.length > 2) || [];
}

function retrieve(question, selectedIds = []) {
  const qTerms = [...new Set(terms(question))];
  const allowed = materials.filter(m => !selectedIds.length || selectedIds.includes(m.id));
  const candidates = [];
  for (const material of allowed) {
    for (const chunk of material.chunks) {
      const body = chunk.content.toLowerCase();
      const score = qTerms.reduce((sum, term) => sum + (body.includes(term) ? 1 : 0), 0);
      if (score > 0) {
        candidates.push({
          ...chunk,
          title: material.title,
          materialId: material.id,
          type: material.type,
          score
        });
      }
    }
  }
  return candidates.sort((a, b) => b.score - a.score).slice(0, 4);
}

async function callAI(messages, temperature = 0.2) {
  const key = process.env.AI_API_KEY;
  const base = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL;
  if (!key || !model) return null;
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature })
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`AI provider returned ${response.status}: ${detail.slice(0, 300)}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || null;
}

// Multimodal: Groq Whisper for Lecture Audio
async function transcribeAudio(filePath, filename) {
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error("AI API Key not configured.");
  const buffer = fs.readFileSync(filePath);
  const blob = new Blob([buffer]);
  const form = new FormData();
  form.append("file", blob, filename);
  form.append("model", "whisper-large-v3-turbo");
  form.append("response_format", "verbose_json");

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Whisper transcription failed: ${detail.slice(0, 300)}`);
  }
  return await response.json();
}

// Multimodal: Vision for Slide Images & Diagrams
async function analyzeSlideImage(filePath, filename) {
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error("AI API Key not configured.");
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString("base64");
  const ext = path.extname(filename).toLowerCase().replace(".", "") || "jpeg";
  const mime = ext === "png" ? "image/png" : "image/jpeg";

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model: "qwen/qwen3.8-27b",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "You are an educational assistant analyzing study material. Transcribe all text, formulas, bullet points, and concisely describe diagrams/charts shown in this lecture slide so a student can study and search it." },
            { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } }
          ]
        }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Slide analysis failed: ${detail.slice(0, 300)}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function fallbackAnswer(question, sources) {
  if (!sources.length) {
    return "I couldn't find relevant information in your uploaded materials. Try uploading a relevant PDF, lecture audio, or slide, or ask a more specific question.";
  }
  const summary = sources.map(s => `• ${s.content}`).join("\n\n");
  return `Demo mode: Potentially relevant passages for “${question}”:\n\n${summary}`;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(process.env.AI_API_KEY && process.env.AI_MODEL) });
});

app.get("/api/materials", (_req, res) => {
  res.json(materials.map(({ id, title, type, wordCount, createdAt, chunks }) => ({
    id, title, type, wordCount, createdAt, chunkCount: chunks.length
  })));
});

app.delete("/api/materials/:id", (req, res) => {
  const { id } = req.params;
  const index = materials.findIndex(m => m.id === id);
  if (index === -1) return res.status(404).json({ error: "Material not found." });
  materials.splice(index, 1);
  saveData();
  res.json({ message: "Material deleted successfully." });
});

app.post("/api/materials/upload", upload.single("file"), async (req, res, next) => {
  let filePath;
  try {
    if (!req.file) return res.status(400).json({ error: "Choose a file to upload first." });
    filePath = req.file.path;
    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase();

    let text = "";
    let segments = [];
    let materialType = ext.slice(1);

    if (ext === ".pdf") {
      const buffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: buffer });
      try {
        const parsed = await parser.getText();
        text = parsed.text;
      } finally {
        await parser.destroy();
      }
      materialType = "pdf";
    } else if (ext === ".txt") {
      text = fs.readFileSync(filePath, "utf8");
      materialType = "txt";
    } else if ([".mp3", ".wav", ".m4a", ".mp4", ".ogg"].includes(ext)) {
      // Multimodal: Speech to text with timestamps via Groq Whisper
      const whisperResult = await transcribeAudio(filePath, originalName);
      text = whisperResult.text || "";
      segments = whisperResult.segments || [];
      materialType = "audio";
    } else if ([".png", ".jpg", ".jpeg"].includes(ext)) {
      // Multimodal: Vision OCR for slides/diagrams
      text = await analyzeSlideImage(filePath, originalName);
      materialType = "slide";
    }

    if (!text.trim()) {
      return res.status(400).json({ error: "No text could be extracted from this file." });
    }

    const material = makeMaterial({
      title: originalName,
      text,
      type: materialType,
      segments
    });

    res.status(201).json({
      message: `${materialType.toUpperCase()} processed successfully.`,
      material: { id: material.id, title: material.title, type: material.type, wordCount: material.wordCount, chunkCount: material.chunks.length }
    });
  } catch (err) {
    next(err);
  } finally {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

app.post("/api/materials/transcript", (req, res) => {
  const { title, text } = req.body || {};
  if (!title?.trim() || !text?.trim()) return res.status(400).json({ error: "Both title and text are required." });
  const material = makeMaterial({ title: title.trim(), text: text.trim(), type: "transcript" });
  res.status(201).json({ message: "Transcript added.", material: { id: material.id, title: material.title, type: material.type, wordCount: material.wordCount } });
});

app.post("/api/tutor/ask", async (req, res, next) => {
  try {
    const { question, materialIds = [] } = req.body || {};
    if (!question?.trim()) return res.status(400).json({ error: "Enter a question." });
    const sources = retrieve(question, materialIds);

    const sourceContext = sources.map((s, i) => {
      const tag = s.type === "audio"
        ? `[Source ${i + 1} (Lecture Audio): ${s.title}${s.timestamp ? ` Timestamp ${s.timestamp}` : ""}]`
        : s.type === "slide"
        ? `[Source ${i + 1} (Slide / Diagram): ${s.title}]`
        : `[Source ${i + 1} (Textbook / Notes): ${s.title}, Chunk ${s.chunkIndex + 1}]`;
      return `${tag}\n${s.content}`;
    }).join("\n\n");

    const system = "You are StudyPilot AI, a personalized multimodal study companion. Answer using only the provided study excerpts. Explicitly cite whether information comes from the lecture audio (with timestamps), textbook notes, or slides. If excerpts do not contain the answer, say so clearly. Be encouraging and concise.";
    let answer = await callAI([
      { role: "system", content: system },
      { role: "user", content: `Question: ${question}\n\nRetrieved study excerpts:\n${sourceContext || "(No relevant excerpts found.)"}\n\nAnswer the question. Cite the sources cleanly.` }
    ]);

    const mode = answer ? "ai" : "demo";
    if (!answer) answer = fallbackAnswer(question, sources);

    res.json({
      answer,
      mode,
      sources: sources.map(s => ({
        title: s.title,
        type: s.type,
        chunk: s.chunkIndex + 1,
        timestamp: s.timestamp || null,
        excerpt: s.content.slice(0, 240),
        materialId: s.materialId
      })),
      notice: mode === "demo" ? "Demo fallback: configure an AI API to generate natural-language explanations." : null
    });
  } catch (err) { next(err); }
});

function fallbackQuiz(material, count) {
  const chunks = (material?.chunks || []).filter(c => c.content.length > 80);
  const result = [];
  for (let i = 0; i < Math.min(count, Math.max(1, chunks.length)); i++) {
    const source = chunks[i % chunks.length] || { content: "Sample study material." };
    const phrase = source.content.split(/[.!?]/).find(s => s.trim().length > 25)?.trim() || source.content.slice(0, 100);
    result.push({
      id: crypto.randomUUID(),
      question: `Which statement is directly supported by the study material?`,
      options: [phrase.slice(0, 150), "The material contains no relevant information.", "This concept is unrelated to the uploaded material.", "None of these statements is supported."],
      correctIndex: 0,
      topic: material?.title || "General Concept",
      explanation: "Demo question generated from extracted passages."
    });
  }
  return result;
}

app.post("/api/quiz/generate", async (req, res, next) => {
  try {
    const { materialId, count = 5, adaptive = false, weakTopics = [] } = req.body || {};
    const material = materials.find(m => m.id === materialId);

    const n = Math.max(1, Math.min(10, Number(count) || 5));

    let context = "";
    if (material) {
      context = material.chunks.slice(0, 12).map(c => c.content).join("\n\n").slice(0, 9000);
    } else if (materials.length > 0) {
      context = materials.slice(0, 3).flatMap(m => m.chunks.slice(0, 4)).map(c => c.content).join("\n\n").slice(0, 9000);
    }

    if (!context.trim()) {
      return res.status(400).json({ error: "Upload study materials first before generating a quiz." });
    }

    const adaptiveInstructions = adaptive && weakTopics.length
      ? `ADAPTIVE ASSESSMENT MODE: The student has struggled with these weak topics: [${weakTopics.join(", ")}]. You MUST focus question topics on these specific weak areas. Craft diagnostic multiple choice questions to help them master these concepts. In the explanation, provide step-by-step guidance.`
      : "Create multiple-choice study questions from the provided study text.";

    let questions = null;
    const raw = await callAI([
      { role: "system", content: `${adaptiveInstructions} Return ONLY valid JSON array. Each item must have: question (string), options (array of exactly 4 strings), correctIndex (integer 0-3), topic (string), explanation (string). Do not hallucinate outside facts.` },
      { role: "user", content: `Create ${n} questions from this study material:\n${context}` }
    ], 0.3);

    if (raw) {
      try {
        const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length) {
          questions = parsed.slice(0, n).filter(q => typeof q.question === "string" && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex <= 3)
            .map(q => ({ id: crypto.randomUUID(), ...q, topic: q.topic || (material ? material.title : "Adaptive Review"), explanation: q.explanation || "" }));
        }
      } catch { /* Fallback */ }
    }

    const mode = questions?.length ? "ai" : "demo";
    if (!questions?.length) questions = fallbackQuiz(material || materials[0], n);
    const quizId = crypto.randomUUID();
    quizzes.set(quizId, { materialId: material?.id || "adaptive", questions, adaptive });

    res.json({
      quizId,
      mode,
      adaptive,
      material: material ? material.title : "Adaptive Weak-Topic Review",
      questions: questions.map(({ correctIndex, ...q }) => q),
      notice: mode === "demo" ? "Demo questions are placeholders derived from extracted text." : null
    });
  } catch (err) { next(err); }
});

app.post("/api/quiz/submit", (req, res) => {
  const { quizId, answers = [] } = req.body || {};
  const quiz = quizzes.get(quizId);
  if (!quiz) return res.status(404).json({ error: "Quiz not found. Generate a new quiz." });
  const details = quiz.questions.map(q => {
    const submitted = answers.find(a => a.questionId === q.id);
    const selectedIndex = Number.isInteger(submitted?.selectedIndex) ? submitted.selectedIndex : -1;
    return { questionId: q.id, correct: selectedIndex === q.correctIndex, correctIndex: q.correctIndex, selectedIndex, topic: q.topic, explanation: q.explanation };
  });
  const correct = details.filter(d => d.correct).length;
  const attempt = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    score: Math.round((correct / quiz.questions.length) * 100),
    correct,
    total: quiz.questions.length,
    adaptive: Boolean(quiz.adaptive),
    details
  };
  quizAttempts.unshift(attempt);
  saveData();
  res.json(attempt);
});

app.get("/api/progress", (_req, res) => {
  const totalQuestions = quizAttempts.reduce((sum, a) => sum + a.total, 0);
  const totalCorrect = quizAttempts.reduce((sum, a) => sum + a.correct, 0);
  const topicStats = {};
  for (const attempt of quizAttempts) {
    for (const detail of attempt.details) {
      const topic = detail.topic || "General";
      topicStats[topic] ||= { topic, correct: 0, total: 0 };
      topicStats[topic].total++;
      if (detail.correct) topicStats[topic].correct++;
    }
  }
  const topics = Object.values(topicStats).map(t => ({ ...t, accuracy: Math.round(t.correct / t.total * 100) })).sort((a, b) => a.accuracy - b.accuracy);
  res.json({
    quizzesTaken: quizAttempts.length,
    averageScore: quizAttempts.length ? Math.round(quizAttempts.reduce((s, a) => s + a.score, 0) / quizAttempts.length) : 0,
    totalCorrect,
    totalQuestions,
    topics,
    weakTopics: topics.filter(t => t.accuracy < 70).slice(0, 5),
    recentAttempts: quizAttempts.slice(0, 5).map(({ id, date, score, correct, total, adaptive }) => ({ id, date, score, correct, total, adaptive }))
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Unexpected server error." });
});

app.listen(PORT, () => console.log(`StudyPilot API running at http://localhost:${PORT}`));
