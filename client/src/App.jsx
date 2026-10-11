import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap, LayoutDashboard, UploadCloud, MessageCircle, ClipboardCheck,
  ChartNoAxesCombined, Search, Bell, Settings, FileText, File, BookOpen,
  Sparkles, Send, Plus, Trash2, CheckCircle2, Clock3, Flame, Target,
  Menu, X, ChevronRight, BrainCircuit, LoaderCircle, AlertCircle, RefreshCw,
  Headphones, Image as ImageIcon, Video
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const nav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "upload", label: "Upload Materials", icon: UploadCloud },
  { id: "tutor", label: "AI Tutor", icon: MessageCircle },
  { id: "quiz", label: "Generate Quiz", icon: ClipboardCheck },
  { id: "progress", label: "My Progress", icon: ChartNoAxesCombined }
];

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function App() {
  const [page, setPage] = useState("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [progress, setProgress] = useState({ quizzesTaken: 0, averageScore: 0, totalCorrect: 0, totalQuestions: 0, topics: [], weakTopics: [], recentAttempts: [] });
  const [health, setHealth] = useState({ aiConfigured: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const refresh = async () => {
    try {
      const [m, p, h] = await Promise.all([
        request("/api/materials"), request("/api/progress"), request("/api/health")
      ]);
      setMaterials(m); setProgress(p); setHealth(h);
    } catch (e) {
      setError(`Backend connection issue: ${e.message}. Start the server on port 5000.`);
    }
  };

  useEffect(() => { refresh(); }, []);
  const active = nav.find(n => n.id === page) || nav[0];

  const go = (id) => { setPage(id); setMobileNav(false); setError(""); };

  return (
    <div className="app-shell">
      {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Close menu" />}
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon"><GraduationCap size={25} /></div>
          <div><strong>StudyPilot AI</strong><span>Multimodal Study Companion</span></div>
          <button className="icon-btn mobile-close" onClick={() => setMobileNav(false)}><X size={18}/></button>
        </div>
        <div className="nav-label">LEARNING SPACE</div>
        <nav>
          {nav.map(item => {
            const Icon = item.icon;
            return <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => go(item.id)}>
              <Icon size={18}/><span>{item.label}</span>{page === item.id && <ChevronRight className="nav-chevron" size={15}/>}
            </button>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="avatar">U</div>
          <div className="user-label"><strong>Utkarsh</strong><span>Student workspace</span></div>
          <button className="icon-btn" title="Settings"><Settings size={17}/></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)}><Menu size={21}/></button>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{active.label}</strong></div>
          <div className="top-actions">
            <div className="searchbox"><Search size={16}/><input placeholder="Search notes, lectures, slides..." onChange={e => window.dispatchEvent(new CustomEvent("material-search", { detail: e.target.value }))}/></div>
            <button className="icon-btn notification" title="Notifications"><Bell size={18}/></button>
            <div className="avatar small">U</div>
          </div>
        </header>

        <div className="content">
          {error && <div className="alert error"><AlertCircle size={17}/><span>{error}</span><button className="text-btn" onClick={() => { setError(""); refresh(); }}>Retry</button></div>}
          {toast && <div className="alert success"><CheckCircle2 size={17}/>{toast}<button className="alert-close" onClick={() => setToast("")}><X size={15}/></button></div>}
          {page === "dashboard" && <Dashboard materials={materials} progress={progress} go={go} health={health}/>}
          {page === "upload" && <UploadPage materials={materials} refresh={refresh} setToast={setToast} setError={setError} loading={loading} setLoading={setLoading}/>}
          {page === "tutor" && <TutorPage materials={materials} health={health}/>}
          {page === "quiz" && <QuizPage materials={materials} progress={progress} refresh={refresh} setError={setError} setToast={setToast}/>}
          {page === "progress" && <ProgressPage progress={progress} refresh={refresh} go={go}/>}
          <footer>StudyPilot AI <span>•</span> Multimodal AI Hackathon 2026 (Track D) <span>•</span> Grounded Citations Across Audio, Slides & Text.</footer>
        </div>
      </main>
    </div>
  );
}

function PageHeading({ eyebrow, title, subtitle, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}

function StatCard({ icon: Icon, label, value, detail, tone = "purple" }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={21}/></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>;
}

function Dashboard({ materials, progress, go, health }) {
  return <>
    <PageHeading eyebrow="MULTIMODAL LEARNING SPACE" title="Welcome back, Utkarsh! 👋" subtitle="Unify your lecture audios, slides, and textbooks into one intelligent AI tutor."
      action={<button className="btn btn-primary" onClick={() => go("upload")}><UploadCloud size={17}/> Upload materials</button>}/>
    {!health.aiConfigured && <div className="alert warning"><AlertCircle size={17}/><span><strong>Demo mode:</strong> AI API isn't configured. Configure Groq in <code>server/.env</code> for live multimodal intelligence.</span></div>}
    <div className="stats-grid">
      <StatCard icon={FileText} label="Study materials" value={materials.length} detail="Audio, slides & PDFs" tone="blue"/>
      <StatCard icon={ClipboardCheck} label="Quizzes taken" value={progress.quizzesTaken} detail="Adaptive attempts" tone="pink"/>
      <StatCard icon={ChartNoAxesCombined} label="Average score" value={`${progress.averageScore || 0}%`} detail={progress.totalQuestions ? `${progress.totalCorrect}/${progress.totalQuestions} correct` : "Start your first quiz"} tone="green"/>
      <StatCard icon={Flame} label="Focus topics" value={progress.weakTopics.length} detail="Topics to revisit" tone="orange"/>
    </div>
    <div className="dashboard-grid">
      <section className="panel materials-panel">
        <div className="panel-heading"><div><h2>Your Knowledge Base</h2><p>Audio lectures, slides, and textbooks</p></div><button className="text-btn" onClick={() => go("upload")}>Manage all <ChevronRight size={15}/></button></div>
        {materials.length ? <div className="material-list">{materials.slice(0, 4).map(m => <MaterialRow key={m.id} material={m} onChat={() => go("tutor")}/>)}</div> :
          <EmptyState icon={BookOpen} title="Knowledge base is empty" text="Upload lecture audios, slide diagrams, or textbooks to begin." action={<button className="btn btn-primary" onClick={() => go("upload")}><Plus size={16}/> Add material</button>}/>}
      </section>
      <section className="panel welcome-panel">
        <div className="welcome-art"><div className="art-orbit"/><BookOpen size={44}/><Sparkles size={20} className="art-spark"/></div>
        <div className="welcome-copy"><span className="eyebrow">TRACK D AI STUDY COMPANION</span><h2>Personalized. Adaptive. Multimodal.</h2><p>Ground answers directly in lecture timestamps, slide screenshots, and book notes with adaptive diagnostics.</p>
          <button className="btn btn-light" onClick={() => go("tutor")}>Ask AI Tutor <ChevronRight size={16}/></button></div>
      </section>
      <section className="panel quick-panel">
        <div className="panel-heading"><div><h2>Quick actions</h2><p>Pick up where you left off</p></div></div>
        <div className="quick-grid">
          <QuickAction icon={UploadCloud} title="Upload Materials" text="Audio, slides, or PDFs" onClick={() => go("upload")} tone="purple"/>
          <QuickAction icon={MessageCircle} title="Ask Multimodal Tutor" text="Cited with audio timestamps" onClick={() => go("tutor")} tone="blue"/>
          <QuickAction icon={Target} title="Adaptive Quiz" text="Focus on weak topics" onClick={() => go("quiz")} tone="orange"/>
          <QuickAction icon={ChartNoAxesCombined} title="View Progress" text="Track mastery & weaknesses" onClick={() => go("progress")} tone="green"/>
        </div>
      </section>
    </div>
  </>;
}

function QuickAction({ icon: Icon, title, text, onClick, tone }) {
  return <button className="quick-action" onClick={onClick}><span className={`quick-icon ${tone}`}><Icon size={19}/></span><strong>{title}</strong><small>{text}</small></button>;
}

function MaterialRow({ material, onChat, onDelete }) {
  const isAudio = material.type === "audio" || material.type === "mp3" || material.type === "wav" || material.type === "m4a";
  const isSlide = material.type === "slide" || material.type === "png" || material.type === "jpg";
  const isPdf = material.type === "pdf";

  const iconClass = isAudio ? "audio" : isSlide ? "slide" : isPdf ? "pdf" : "txt";
  const IconComp = isAudio ? Headphones : isSlide ? ImageIcon : isPdf ? FileText : File;

  return <div className="material-row">
    <div className={`file-icon ${iconClass}`}><IconComp size={19}/></div>
    <div className="material-info">
      <strong>{material.title}</strong>
      <span>{material.wordCount?.toLocaleString() || 0} words <span className="dot">•</span> {isAudio ? "LECTURE AUDIO" : isSlide ? "SLIDE DIAGRAM" : isPdf ? "TEXTBOOK PDF" : "TRANSCRIPT"}</span>
    </div>
    {onChat && <button className="small-outline" onClick={onChat}><MessageCircle size={14}/> Ask</button>}
    {onDelete && <button className="icon-btn" onClick={onDelete} title="Delete material"><Trash2 size={16}/></button>}
  </div>;
}

function EmptyState({ icon: Icon, title, text, action }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={25}/></div><h3>{title}</h3><p>{text}</p>{action}</div>;
}

function UploadPage({ materials, refresh, setToast, setError, loading, setLoading }) {
  const [file, setFile] = useState(null);
  const [transcriptTitle, setTranscriptTitle] = useState("");
  const [transcriptText, setTranscriptText] = useState("");
  const [tab, setTab] = useState("file");
  const [uploadResult, setUploadResult] = useState("");

  async function uploadFile(e) {
    e.preventDefault();
    if (!file) return setError("Choose a file first.");
    setLoading(true); setError(""); setUploadResult("");
    try {
      const form = new FormData(); form.append("file", file);
      const data = await request("/api/materials/upload", { method: "POST", body: form });
      setUploadResult(`${data.material.title} processed successfully.`);
      setToast("Multimodal study material added to knowledge base.");
      setFile(null);
      await refresh();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function addTranscript(e) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const data = await request("/api/materials/transcript", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: transcriptTitle || "Lecture transcript", text: transcriptText }) });
      setToast(data.message); setTranscriptTitle(""); setTranscriptText(""); await refresh();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function deleteMaterial(id) {
    if (!window.confirm("Delete this material from your knowledge base?")) return;
    try {
      await request(`/api/materials/${id}`, { method: "DELETE" });
      setToast("Material deleted.");
      await refresh();
    } catch (err) { setError(err.message); }
  }

  return <>
    <PageHeading eyebrow="BUILD MULTIMODAL KNOWLEDGE BASE" title="Upload study materials" subtitle="Upload textbook PDFs, recorded lecture audios, or slide screenshots."/>
    <div className="two-column">
      <section className="panel upload-panel">
        <div className="tabs">
          <button className={tab === "file" ? "tab active" : "tab"} onClick={() => { setTab("file"); setFile(null); }}><FileText size={16}/> Textbook / PDF</button>
          <button className={tab === "audio" ? "tab active" : "tab"} onClick={() => { setTab("audio"); setFile(null); }}><Headphones size={16}/> Lecture Audio</button>
          <button className={tab === "slide" ? "tab active" : "tab"} onClick={() => { setTab("slide"); setFile(null); }}><ImageIcon size={16}/> Slides / Diagrams</button>
          <button className={tab === "transcript" ? "tab active" : "tab"} onClick={() => { setTab("transcript"); setFile(null); }}><BookOpen size={16}/> Paste Notes</button>
        </div>

        {tab === "file" && <form onSubmit={uploadFile}>
          <label className="dropzone">
            <input type="file" accept=".pdf,.txt,application/pdf,text/plain" onChange={e => setFile(e.target.files?.[0] || null)}/>
            <div className="upload-cloud"><FileText size={28}/></div>
            <strong>{file ? file.name : "Choose a Textbook or PDF"}</strong>
            <span>PDF or TXT • Up to 25 MB</span>
            <small>Text is extracted, chunked, and indexed for rapid semantic retrieval.</small>
          </label>
          <button className="btn btn-primary full" disabled={!file || loading}>{loading ? <LoaderCircle className="spin" size={17}/> : <UploadCloud size={17}/>} {loading ? "Processing Document..." : "Upload and process"}</button>
          {uploadResult && <div className="inline-success"><CheckCircle2 size={16}/>{uploadResult}</div>}
        </form>}

        {tab === "audio" && <form onSubmit={uploadFile}>
          <label className="dropzone">
            <input type="file" accept=".mp3,.wav,.m4a,.mp4,.ogg,audio/*" onChange={e => setFile(e.target.files?.[0] || null)}/>
            <div className="upload-cloud" style={{background: "#f4ecf7", color: "#8e44ad"}}><Headphones size={28}/></div>
            <strong>{file ? file.name : "Upload Recorded Lecture Audio"}</strong>
            <span>MP3, WAV, M4A, MP4 • Whisper AI Transcription</span>
            <small>Transcribes speech with exact timestamps so citations link directly to audio moments!</small>
          </label>
          <button className="btn btn-primary full" style={{background: "#8e44ad"}} disabled={!file || loading}>{loading ? <LoaderCircle className="spin" size={17}/> : <Sparkles size={17}/>} {loading ? "Transcribing Audio via Whisper..." : "Transcribe & Index Lecture"}</button>
          {uploadResult && <div className="inline-success"><CheckCircle2 size={16}/>{uploadResult}</div>}
        </form>}

        {tab === "slide" && <form onSubmit={uploadFile}>
          <label className="dropzone">
            <input type="file" accept=".png,.jpg,.jpeg,image/*" onChange={e => setFile(e.target.files?.[0] || null)}/>
            <div className="upload-cloud" style={{background: "#fbeee6", color: "#d35400"}}><ImageIcon size={28}/></div>
            <strong>{file ? file.name : "Upload Lecture Slide or Diagram"}</strong>
            <span>PNG, JPG • Multimodal Vision AI</span>
            <small>Vision AI extracts slide bullet points, formulas, and visual diagrams into the knowledge base.</small>
          </label>
          <button className="btn btn-primary full" style={{background: "#d35400"}} disabled={!file || loading}>{loading ? <LoaderCircle className="spin" size={17}/> : <Sparkles size={17}/>} {loading ? "Analyzing Slide with Vision AI..." : "Extract Slide & Diagrams"}</button>
          {uploadResult && <div className="inline-success"><CheckCircle2 size={16}/>{uploadResult}</div>}
        </form>}

        {tab === "transcript" && <form onSubmit={addTranscript} className="transcript-form">
          <label>Material title<input value={transcriptTitle} onChange={e => setTranscriptTitle(e.target.value)} placeholder="e.g. Physics Chapter 3 or Web Transcript"/></label>
          <label>Content / Notes<textarea rows="9" value={transcriptText} onChange={e => setTranscriptText(e.target.value)} placeholder="Paste study notes or transcript text here..." required/></label>
          <button className="btn btn-primary full" disabled={!transcriptText.trim() || loading}>{loading ? "Adding..." : "Add to Knowledge Base"}</button>
        </form>}
      </section>

      <section className="panel tips-panel">
        <div className="tips-title"><Sparkles size={19}/><h2>Multimodal AI Capabilities</h2></div>
        <div className="tip"><CheckCircle2 size={17}/><span><strong>Lecture Audio:</strong> Transcribed with exact timestamps using Groq Whisper.</span></div>
        <div className="tip"><CheckCircle2 size={17}/><span><strong>Slides & Diagrams:</strong> Analyzed via Multimodal Vision AI for diagrams and charts.</span></div>
        <div className="tip"><CheckCircle2 size={17}/><span><strong>Textbooks:</strong> Indexed into searchable study chunks.</span></div>
        <div className="tip"><CheckCircle2 size={17}/><span><strong>Unified Retrieval:</strong> Tutor answers synthesize all three modalities together!</span></div>
        <div className="notice-card"><CheckCircle2 size={17}/><span>Persistent Database: All uploaded materials & quiz records are automatically saved to disk!</span></div>
      </section>
    </div>

    <section className="panel list-panel">
      <div className="panel-heading"><div><h2>Knowledge Base Materials</h2><p>{materials.length} multimodal sources available</p></div></div>
      {materials.length ? materials.map(m => <MaterialRow key={m.id} material={m} onDelete={() => deleteMaterial(m.id)}/>) : <EmptyState icon={FileText} title="Your library is empty" text="Upload audio, slides, or documents above."/>}
    </section>
  </>;
}

function TutorPage({ materials, health }) {
  const [selected, setSelected] = useState("all");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([{ role: "assistant", text: "Hi Utkarsh! Ask me anything about your uploaded lectures, slides, or textbooks. I will synthesize the answers and give you exact source citations!" }]);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  async function send(q = question) {
    if (!q.trim() || busy) return;
    const ask = q.trim(); setQuestion(""); setLocalError("");
    setMessages(prev => [...prev, { role: "user", text: ask }]); setBusy(true);
    try {
      const data = await request("/api/tutor/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: ask, materialIds: selected === "all" ? [] : [selected] }) });
      setMessages(prev => [...prev, { role: "assistant", text: data.answer, sources: data.sources, notice: data.notice, mode: data.mode }]);
    } catch (e) { setLocalError(e.message); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeading eyebrow="ASK • UNDERSTAND • GROUND" title="AI Multimodal Tutor" subtitle="Grounded questions across lecture audio, slide diagrams, and textbook passages."/>
    {!materials.length && <div className="alert warning"><AlertCircle size={17}/><span>Upload study materials first to unlock source-grounded answers.</span></div>}
    <div className="tutor-layout">
      <aside className="panel source-sidebar">
        <div className="panel-heading"><div><h2>Search scope</h2><p>Filter by source</p></div></div>
        <button className={`source-option ${selected === "all" ? "selected" : ""}`} onClick={() => setSelected("all")}><BookOpen size={17}/><span>All sources (Unified)</span></button>
        {materials.map(m => {
          const isAudio = m.type === "audio";
          const isSlide = m.type === "slide";
          const IconComp = isAudio ? Headphones : isSlide ? ImageIcon : FileText;
          return <button key={m.id} className={`source-option ${selected === m.id ? "selected" : ""}`} onClick={() => setSelected(m.id)}><IconComp size={16}/><span>{m.title}</span></button>;
        })}
      </aside>

      <section className="panel chat-panel">
        <div className="chat-head">
          <div className="ai-avatar"><BrainCircuit size={20}/></div>
          <div><h2>StudyPilot Multimodal Assistant</h2><p><span className="online-dot"/> Grounded in lecture audio timestamps & textbook text</p></div>
          <span className="beta-pill">TRACK D</span>
        </div>
        <div className="chat-messages">
          {messages.map((m, i) => <div key={i} className={`message ${m.role}`}>
            <div className="message-avatar">{m.role === "assistant" ? <Sparkles size={16}/> : "U"}</div>
            <div className="message-body">
              <div className="bubble">{m.text}</div>
              {m.sources?.length > 0 && <div className="source-citations">
                <strong><BookOpen size={14}/> Grounded Multimodal Sources</strong>
                {m.sources.map((s, j) => {
                  const isAudio = s.type === "audio";
                  const isSlide = s.type === "slide";
                  const IconComp = isAudio ? Headphones : isSlide ? ImageIcon : FileText;
                  return <div className="citation" key={j}>
                    <IconComp size={15}/>
                    <div>
                      <span>
                        {s.title}
                        {s.timestamp && <span className="citation-badge audio" style={{marginLeft: 6}}>⏱ {s.timestamp}</span>}
                        {isSlide && <span className="citation-badge slide" style={{marginLeft: 6}}>🖼 Slide</span>}
                        {!isAudio && !isSlide && <span className="citation-badge pdf" style={{marginLeft: 6}}>📄 Chunk {s.chunk}</span>}
                      </span>
                      <small>{s.excerpt}</small>
                    </div>
                  </div>;
                })}
              </div>}
              {m.notice && <div className="message-notice"><AlertCircle size={14}/>{m.notice}</div>}
            </div>
          </div>)}
          {busy && <div className="message assistant"><div className="message-avatar"><Sparkles size={16}/></div><div className="bubble typing"><LoaderCircle className="spin" size={16}/> Searching audio, slides, and notes...</div></div>}
        </div>
        {localError && <div className="inline-error">{localError}</div>}
        <div className="suggestions">{["Explain the key lecture concept", "What formulas or diagrams were shown?", "What should I revise for the exam?"].map(q => <button key={q} onClick={() => send(q)} disabled={busy}>{q}</button>)}</div>
        <form className="chat-input" onSubmit={e => { e.preventDefault(); send(); }}>
          <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask about lecture recordings, slides, or textbook notes..." disabled={busy}/>
          <button className="send-btn" disabled={!question.trim() || busy} aria-label="Send question"><Send size={17}/></button>
        </form>
        <p className="chat-disclaimer">Verified against uploaded lecture timestamps and study excerpts.</p>
      </section>
    </div>
  </>;
}

function QuizPage({ materials, progress, refresh, setError, setToast }) {
  const [materialId, setMaterialId] = useState("");
  const [count, setCount] = useState(5);
  const [adaptive, setAdaptive] = useState(progress?.weakTopics?.length > 0);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!materialId && materials.length) setMaterialId(materials[0].id); }, [materials, materialId]);

  async function generate(e) {
    e?.preventDefault(); setError(""); setResult(null); setBusy(true);
    try {
      const weakTopics = (progress?.weakTopics || []).map(t => t.topic);
      const data = await request("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId, count, adaptive, weakTopics })
      });
      setQuiz(data); setAnswers({}); if (data.notice) setToast(data.notice);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function submit() {
    setBusy(true); setError("");
    try {
      const data = await request("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: quiz.quizId, answers: Object.entries(answers).map(([questionId, selectedIndex]) => ({ questionId, selectedIndex })) })
      });
      setResult(data); await refresh();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (!materials.length) return <><PageHeading eyebrow="PRACTICE & RETAIN" title="Generate a quiz" subtitle="Add study material before generating an assessment."/><div className="panel"><EmptyState icon={ClipboardCheck} title="No study material available" text="Upload a PDF, lecture audio, or slide first, then return here." /></div></>;

  return <>
    <PageHeading eyebrow="ADAPTIVE PRACTICE & MASTERY" title="Knowledge Assessment" subtitle="Generate adaptive diagnostic quizzes tailored to your strengths and weak areas."/>
    <div className="quiz-layout">
      <section className="panel quiz-settings">
        <div className="section-icon orange"><ClipboardCheck size={21}/></div>
        <h2>Quiz Settings</h2>
        <p>Choose your source and assessment mode.</p>
        <form onSubmit={generate}>
          <label>Study Material
            <select value={materialId} onChange={e => setMaterialId(e.target.value)}>
              {materials.map(m => <option value={m.id} key={m.id}>{m.title}</option>)}
            </select>
          </label>
          <label>Questions Count
            <select value={count} onChange={e => setCount(Number(e.target.value))}>
              {[3,5,8,10].map(n => <option key={n} value={n}>{n} questions</option>)}
            </select>
          </label>

          <label style={{display: "flex", flexDirection: "row", alignItems: "center", gap: 10, cursor: "pointer", background: "#f8f9fe", padding: 10, borderRadius: 8, border: "1px solid #e7ebf4"}}>
            <input type="checkbox" checked={adaptive} onChange={e => setAdaptive(e.target.checked)} style={{width: 18, height: 18, accentColor: "#5c4df0"}}/>
            <div>
              <strong style={{fontSize: 12, display: "block"}}>Adaptive Weak-Topic Mode</strong>
              <small style={{fontSize: 10, color: "#75819a"}}>Target questions on past weak topics: {progress?.weakTopics?.length ? progress.weakTopics.map(t => t.topic).join(", ") : "None detected yet"}</small>
            </div>
          </label>

          <div className="setting-info"><Clock3 size={15}/> Est. {count * 1.5 | 0} minutes</div>
          <button className="btn btn-primary full" disabled={!materialId || busy}>{busy ? <LoaderCircle className="spin" size={16}/> : <Sparkles size={16}/>} {adaptive ? "Generate Adaptive Quiz" : "Generate Standard Quiz"}</button>
        </form>
      </section>

      <section className="panel quiz-content">
        {!quiz && !result && <EmptyState icon={BrainCircuit} title="Ready for adaptive practice?" text="Generate a quiz to test your comprehension. The engine dynamically learns your weak spots and adapts future tests." action={<div className="quiz-preview-points"><span><CheckCircle2 size={15}/> Adaptive diagnostics</span><span><CheckCircle2 size={15}/> Weak-topic remediation</span></div>}/>}
        {quiz && !result && <>
          <div className="quiz-topline">
            <div style={{display: "flex", gap: 8, alignItems: "center"}}>
              <span className="eyebrow">{quiz.mode === "ai" ? "AI GENERATED" : "DEMO MODE"}</span>
              {quiz.adaptive && <span className="adaptive-badge"><Target size={12}/> ADAPTIVE MODE</span>}
            </div>
            <span>{quiz.questions.length} questions</span>
          </div>
          {quiz.notice && <div className="message-notice"><AlertCircle size={14}/>{quiz.notice}</div>}
          {quiz.questions.map((q, i) => <div className="question-card" key={q.id}>
            <div className="question-number">QUESTION {i + 1} • <span style={{color: "#495057"}}>{q.topic}</span></div>
            <h3>{q.question}</h3>
            <div className="options">{q.options.map((opt, j) => <label key={j} className={`option ${answers[q.id] === j ? "chosen" : ""}`}><input type="radio" name={q.id} checked={answers[q.id] === j} onChange={() => setAnswers(prev => ({ ...prev, [q.id]: j }))}/><span className="option-letter">{String.fromCharCode(65 + j)}</span><span>{opt}</span></label>)}</div>
          </div>)}
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Scoring Assessment..." : "Submit answers"}</button>
        </>}
        {result && <div className="result-panel">
          <div className="result-circle">{result.score}%</div>
          <h2>{result.score >= 70 ? "Mastery Achieved!" : "Revision Recommended"}</h2>
          <p>You scored {result.correct} out of {result.total} questions correct {result.adaptive ? "(Adaptive Diagnostic)" : ""}.</p>
          <div className="result-details">{result.details.map((d, i) => <div key={d.questionId} className="result-line"><span>{d.correct ? <CheckCircle2 className="good" size={17}/> : <AlertCircle className="bad" size={17}/>} Question {i + 1} ({d.topic})</span><small>{d.correct ? "Mastered" : "Review needed"}{d.explanation ? ` • ${d.explanation}` : ""}</small></div>)}</div>
          <button className="btn btn-primary" onClick={() => { setQuiz(null); setResult(null); setAnswers({}); }}>Generate Another Assessment</button>
        </div>}
      </section>
    </div>
  </>;
}

function ProgressPage({ progress, refresh, go }) {
  useEffect(() => { refresh(); }, []);
  return <>
    <PageHeading eyebrow="ADAPTIVE MASTERY TRACKER" title="My Learning Progress" subtitle="Detailed breakdown of topic mastery, weak areas, and diagnostic history." action={<button className="btn btn-secondary" onClick={refresh}><RefreshCw size={16}/> Refresh</button>}/>
    <div className="stats-grid">
      <StatCard icon={ChartNoAxesCombined} label="Average score" value={`${progress.averageScore || 0}%`} detail="Across all attempts" tone="purple"/>
      <StatCard icon={ClipboardCheck} label="Quizzes completed" value={progress.quizzesTaken} detail="Saved persistently" tone="blue"/>
      <StatCard icon={CheckCircle2} label="Correct answers" value={progress.totalCorrect} detail={`Out of ${progress.totalQuestions}`} tone="green"/>
      <StatCard icon={Target} label="Weak topics" value={progress.weakTopics.length} detail="Below 70% accuracy" tone="orange"/>
    </div>
    <div className="dashboard-grid progress-grid">
      <section className="panel">
        <div className="panel-heading"><div><h2>Topic Performance Breakdown</h2><p>Accuracy measured per topic</p></div></div>
        {progress.topics.length ? <div className="topic-list">{progress.topics.map(t => <div className="topic-row" key={t.topic}><div className="topic-head"><span>{t.topic}</span><strong>{t.accuracy}%</strong></div><div className="progress-track"><div className={`progress-fill ${t.accuracy < 70 ? "low" : ""}`} style={{ width: `${t.accuracy}%` }}/></div></div>)}</div> : <EmptyState icon={ChartNoAxesCombined} title="No assessment data yet" text="Complete a quiz to measure topic mastery."/>}
      </section>
      <section className="panel weak-panel">
        <div className="panel-heading"><div><h2>Weak Topics (Action Plan)</h2><p>Identified for adaptive revision</p></div><Target size={19} className="muted-icon"/></div>
        {progress.weakTopics.length ? <>
          {progress.weakTopics.map(t => <div className="weak-topic" key={t.topic}><div className="weak-icon"><Target size={17}/></div><div><strong>{t.topic}</strong><span>{t.accuracy}% accuracy • {t.total} attempts</span></div><span className="focus-tag">Priority</span></div>)}
          <button className="btn btn-primary full" style={{marginTop: 15}} onClick={() => go("quiz")}><Target size={16}/> Launch Adaptive Quiz for Weak Topics</button>
        </> : <EmptyState icon={CheckCircle2} title="No weak topics identified" text="Great job! Keep practicing quizzes to track learning trends."/>}
      </section>
    </div>
    <section className="panel list-panel">
      <div className="panel-heading"><div><h2>Recent Diagnostic Assessments</h2><p>History of quiz attempts</p></div></div>
      {progress.recentAttempts.length ? progress.recentAttempts.map(a => <div className="attempt-row" key={a.id}><div className="attempt-icon"><ClipboardCheck size={17}/></div><div className="attempt-info"><strong>{a.adaptive ? "Adaptive Diagnostic Quiz" : "Standard Practice Quiz"}</strong><span>{new Date(a.date).toLocaleString()}</span></div><strong className={a.score >= 70 ? "score-good" : "score-low"}>{a.score}%</strong><small>{a.correct}/{a.total} correct</small></div>) : <EmptyState icon={Clock3} title="No attempts yet" text="Completed assessments will appear here."/>}
    </section>
  </>;
}

export default App;
