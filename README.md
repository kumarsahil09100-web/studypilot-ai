# StudyPilot AI — Multimodal Personalized Study Companion
> **Multimodal AI Hackathon 2026 — Track D: Personalized Tutoring & Adaptive Learning**  
> *Organized by KamandPrompt (Programming Club, IIT Mandi), Augli.ai, PurpleRain Tech, and LDV Labs.*

---

## 📌 Problem Statement Overview
Students today consume learning material across fragmented modalities: dense textbook PDFs, rapid lecture audios/videos, and visual presentation slides. Synthesizing these into a cohesive understanding and identifying personal learning gaps is challenging.

**StudyPilot AI** unifies **lecture recordings, textbooks, and slide diagrams** into a single source-grounded knowledge base. It delivers an AI tutor with **exact audio timestamp and slide citations**, coupled with an **adaptive assessment engine** that detects student weak topics and automatically personalizes revision quizzes.

---

## 🚀 Key Multimodal Features

### 1. Unified Multimodal Knowledge Base
* **🎧 Recorded Lecture Audio:** Upload lecture recordings (`.mp3`, `.wav`, `.m4a`, `.mp4`). Transcribed via **Groq Whisper** (`whisper-large-v3-turbo`) with high precision and segment-level timestamps.
* **🖼️ Slide Presentations & Diagrams:** Upload slide screenshots and concept diagrams (`.png`, `.jpg`). Analyzed via **Multimodal Vision AI** to capture visual formulas, charts, and bullet points.
* **📄 Textbook PDFs & Documents:** Fast text extraction and sliding-window chunk indexing for textbooks and lecture notes.
* **💾 Persistent Storage:** Built-in persistent data store (`data/store.json`) ensuring library materials and quiz histories survive restarts.

### 2. Grounded Multimodal Citations
* The AI Tutor grounds every answer directly in the uploaded sources:
  * ⏱️ **Audio Citations:** `[Lecture Audio • Timestamp 02:15 - 02:45]`
  * 🖼️ **Visual Citations:** `[Slide Diagram]`
  * 📄 **Textbook Citations:** `[Textbook • Chunk 3]`
* Students can immediately verify the AI's explanation against the primary source.

### 3. Adaptive Diagnostic Assessments
* **Weak-Topic Diagnostics:** Evaluates student test attempts and tracks topic mastery percentage.
* **Adaptive Re-Testing:** When "Adaptive Mode" is enabled, the assessment engine focuses diagnostic questions directly on areas where the student scored below 70%, offering step-by-step remedial feedback.

---

## 🛠️ Architecture & Tech Stack

```
[Student Interface]
       │
  React 18 + Vite (Tailwind / Custom CSS)
       │  (REST API)
[Node.js + Express Backend]
   ├── PDF Parser (Textbooks & Notes)
   ├── Groq Whisper API (Speech-to-Text with Timestamps)
   ├── Groq Vision AI (Diagram & Slide Concept Extraction)
   ├── Semantic Retrieval & Grounding Engine
   ├── Groq OSS LLM Engine (Tutor & Adaptive Assessment)
   └── Persistent JSON Store (data/store.json)
```

* **Frontend:** React, Vite, Lucide Icons
* **Backend:** Node.js, Express, Multer
* **AI & Multimodal Stack:**
  * Speech-to-Text: Groq Whisper (`whisper-large-v3-turbo`)
  * Vision: Groq Multimodal Vision (`qwen/qwen3.8-27b`)
  * Reasoning & Tutoring: Groq High-Performance LLM (`openai/gpt-oss-120b`)
  * Parser: `pdf-parse`

---

## 💻 Quick Start & Setup

### Prerequisites
* Node.js v18+ or v20+
* Free Groq API Key ([console.groq.com](https://console.groq.com))

### 1. Installation
Clone the repository and install dependencies:
```bash
# Install root dependencies
npm install

# Install server dependencies
npm install --prefix server

# Install client dependencies
npm install --prefix client
```

### 2. Configure Environment Variables
Inside `server/.env`:
```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173

AI_BASE_URL=https://api.groq.com/openai/v1
AI_API_KEY=gsk_your_groq_api_key_here
AI_MODEL=openai/gpt-oss-120b
```

### 3. Run the Development Server
```bash
npm run dev
```
* **Frontend:** [http://localhost:5173](http://localhost:5173)
* **Backend API:** [http://localhost:5000](http://localhost:5000)

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | System health & AI readiness check |
| `GET` | `/api/materials` | Retrieve all indexed study materials |
| `POST` | `/api/materials/upload` | Upload & process PDF, Audio (Whisper), or Slide (Vision) |
| `DELETE` | `/api/materials/:id` | Remove a material from the knowledge base |
| `POST` | `/api/tutor/ask` | Ask questions with multimodal citations |
| `POST` | `/api/quiz/generate` | Generate standard or adaptive weak-topic assessments |
| `POST` | `/api/quiz/submit` | Submit answers, calculate score, and update topic mastery |
| `GET` | `/api/progress` | Get topic mastery breakdown and weak topic list |

---

## 👥 Team
* **Track:** Track D — Personalized Tutoring & Adaptive Learning
* **Hackathon:** Multimodal AI Hackathon 2026
