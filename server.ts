import "dotenv/config";
import express from "express";
import http from "http";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const MODEL_NAME = "gemini-3.8-flash";

const db = new Database("chat.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    role TEXT, -- 'user' or 'model'
    content TEXT,
    grounding_metadata TEXT,
    images TEXT,
    user_analysis TEXT,
    emergence_analysis TEXT,
    follow_up_questions TEXT,
    intent_alignment TEXT,
    council_debate TEXT,
    deep_research TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );
  CREATE TABLE IF NOT EXISTS user_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    key TEXT,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    title TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    title TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    emoji TEXT DEFAULT '📁',
    color TEXT DEFAULT 'amber',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

try {
  db.exec("ALTER TABLE messages ADD COLUMN images TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE messages ADD COLUMN emergence_analysis TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE messages ADD COLUMN user_analysis TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE messages ADD COLUMN follow_up_questions TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE messages ADD COLUMN intent_alignment TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE messages ADD COLUMN council_debate TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE messages ADD COLUMN deep_research TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE sessions ADD COLUMN is_pinned INTEGER DEFAULT 0;");
} catch (e) {}
try {
  db.exec("ALTER TABLE sessions ADD COLUMN folder_id TEXT;");
} catch (e) {}

async function startServer() {
  const app = express();
  const args = process.argv.slice(2);
  const portIndex = args.indexOf("--port");
  const argPort = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1], 10) : null;
  const PORT = argPort || (process.env.APP_PORT ? parseInt(process.env.APP_PORT, 10) : 3000);

  app.use(express.json({ limit: "25mb" }));

  const ALLOWED_MODELS = new Set([
    "gemini-4-argon",
    "gemini-3.1-pro-preview",
    "gemini-2.5-pro",
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
  ]);

  const resolveModel = (requestedModel?: string) => {
    if (requestedModel && ALLOWED_MODELS.has(requestedModel)) {
      return requestedModel;
    }
    return MODEL_NAME;
  };

  // Single-Model Quota Optimization: In-Memory Normalized Response Cache (TTL 30 mins, Max 200 entries)
  const responseCache = new Map<string, { text: string; groundingMetadata: any; timestamp: number }>();
  const CACHE_TTL_MS = 30 * 60 * 1000;
  const makeCacheKey = (model: string, prompt: string, sys?: string, search?: boolean) =>
    `${model}::${Boolean(search)}::${(sys || "").slice(0, 120)}::${(prompt || "").trim().toLowerCase().replace(/\s+/g, " ")}`;

  // Server-side Gemini API Routes
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { messages, systemInstruction, temperature, useGoogleSearch, stream, model } = req.body;
      const targetModel = resolveModel(model);
      const contents = (messages || []).map((m: any) => {
        const parts: any[] = [{ text: m.content || "" }];
        if (m.images && Array.isArray(m.images)) {
          for (const imgBase64 of m.images) {
            const match = imgBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
            if (match) {
              parts.push({
                inlineData: {
                  mimeType: match[1],
                  data: match[2],
                },
              });
            }
          }
        }
        return {
          role: m.role,
          parts,
        };
      });

      const tools: any[] = [];
      if (useGoogleSearch) {
        tools.push({ googleSearch: {} });
      }

      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const lastMessage = contents.pop();
        if (!lastMessage) {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          return res.end();
        }

        const runStreamWithModel = async (modelToUse: string) => {
          const chatWithHistory = ai.chats.create({
            model: modelToUse,
            config: {
              systemInstruction,
              temperature: typeof temperature === "number" ? temperature : 0.7,
              tools: tools.length > 0 ? tools : undefined,
            },
            history: contents,
          });

          return await chatWithHistory.sendMessageStream({
            message: lastMessage.parts,
          });
        };

        let result;
        try {
          result = await runStreamWithModel(targetModel);
        } catch (primaryErr: any) {
          if (targetModel !== MODEL_NAME) {
            console.warn(`Model ${targetModel} failed, falling back to ${MODEL_NAME}:`, primaryErr?.message);
            result = await runStreamWithModel(MODEL_NAME);
          } else {
            throw primaryErr;
          }
        }

        for await (const chunk of result) {
          const resp = chunk as GenerateContentResponse;
          const text = resp.text || "";
          const groundingMetadata = resp.candidates?.[0]?.groundingMetadata || null;
          res.write(`data: ${JSON.stringify({ text, groundingMetadata })}\n\n`);
        }

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      } else {
        const generateNonStream = async (modelToUse: string) =>
          await ai.models.generateContent({
            model: modelToUse,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `System Instruction: ${systemInstruction || ""}\n\nContext:\n${(messages || [])
                      .map((m: any) => `${m.role}: ${m.content}`)
                      .join("\n")}`,
                  },
                ],
              },
            ],
            config: {
              temperature: typeof temperature === "number" ? temperature : 0.7,
              tools: tools.length > 0 ? tools : undefined,
            },
          });

        let response;
        try {
          response = await generateNonStream(targetModel);
        } catch (primaryErr: any) {
          if (targetModel !== MODEL_NAME) {
            response = await generateNonStream(MODEL_NAME);
          } else {
            throw primaryErr;
          }
        }
        res.json({ text: response.text || "" });
      }
    } catch (error: any) {
      console.error("Gemini chat error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error?.message || "Failed to generate Gemini response" });
      } else {
        res.write(`data: ${JSON.stringify({ error: error?.message || "Stream error" })}\n\n`);
        res.end();
      }
    }
  });

  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { prompt, temperature, useGoogleSearch, systemInstruction, model } = req.body;
      const targetModel = resolveModel(model);
      const cacheKey = makeCacheKey(targetModel, prompt, systemInstruction, useGoogleSearch);
      const cached = responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return res.json({
          text: cached.text,
          groundingMetadata: cached.groundingMetadata,
          cached: true,
        });
      }

      const tools: any[] = [];
      if (useGoogleSearch) {
        tools.push({ googleSearch: {} });
      }
      const runGen = async (modelToUse: string) =>
        await ai.models.generateContent({
          model: modelToUse,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            systemInstruction: systemInstruction || undefined,
            temperature: typeof temperature === "number" ? temperature : 0.2,
            tools: tools.length > 0 ? tools : undefined,
          },
        });

      let response;
      try {
        response = await runGen(targetModel);
      } catch (primaryErr: any) {
        if (targetModel !== MODEL_NAME) {
          response = await runGen(MODEL_NAME);
        } else {
          throw primaryErr;
        }
      }
      const resultText = response.text || "";
      const resultGrounding = response.candidates?.[0]?.groundingMetadata || null;
      if (resultText) {
        if (responseCache.size >= 200) {
          const oldestKey = responseCache.keys().next().value;
          if (oldestKey) responseCache.delete(oldestKey);
        }
        responseCache.set(cacheKey, {
          text: resultText,
          groundingMetadata: resultGrounding,
          timestamp: Date.now(),
        });
      }
      res.json({
        text: resultText,
        groundingMetadata: resultGrounding,
      });
    } catch (error: any) {
      console.error("Gemini generate error:", error);
      res.status(500).json({ error: error?.message || "Failed to generate content" });
    }
  });

  // API Routes
  
  // Folder Endpoints
  app.get("/api/folders", (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.json([]);
    const folders = db.prepare("SELECT * FROM folders WHERE user_id = ? ORDER BY created_at ASC").all(userId);
    res.json(folders);
  });

  app.post("/api/folders", (req, res) => {
    const { id, userId, name, emoji, color } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Folder name is required" });
    const folderId = id || ("fld_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6));
    db.prepare("INSERT INTO folders (id, user_id, name, emoji, color) VALUES (?, ?, ?, ?, ?)").run(
      folderId,
      userId || "anonymous",
      name.trim(),
      emoji || "📁",
      color || "amber"
    );
    res.json({ success: true, folder: { id: folderId, user_id: userId, name: name.trim(), emoji: emoji || "📁", color: color || "amber" } });
  });

  app.put("/api/folders/:id", (req, res) => {
    const { id } = req.params;
    const { name, emoji, color } = req.body;
    if (name !== undefined) {
      db.prepare("UPDATE folders SET name = ? WHERE id = ?").run(name.trim(), id);
    }
    if (emoji !== undefined) {
      db.prepare("UPDATE folders SET emoji = ? WHERE id = ?").run(emoji, id);
    }
    if (color !== undefined) {
      db.prepare("UPDATE folders SET color = ? WHERE id = ?").run(color, id);
    }
    res.json({ success: true });
  });

  app.delete("/api/folders/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("UPDATE sessions SET folder_id = NULL WHERE folder_id = ?").run(id);
    db.prepare("DELETE FROM folders WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Smart Folder Auto-Categorization with Gemini
  app.post("/api/gemini/auto-categorize", async (req, res) => {
    try {
      const { sessionName, sampleText, folders } = req.body;
      if (!folders || !folders.length) {
        return res.json({ folderId: null, reason: "Chưa có thư mục nào để phân loại." });
      }
      const folderList = folders.map((f: any) => `- ID: "${f.id}" | Tên: "${f.name}" | Icon: "${f.emoji}"`).join("\n");
      const prompt = `Bạn là hệ thống tự động phân loại hội thoại thông minh của Atelier Studio.
Dựa vào tiêu đề và nội dung ngắn của phiên hội thoại dưới đây, hãy xác định thư mục (folder) phù hợp nhất trong danh sách đã có.

Tiêu đề phiên chat: "${sessionName || "Hội thoại"}"
Nội dung trích đoạn: "${(sampleText || "").slice(0, 500)}"

Danh sách thư mục hiện có:
${folderList}

Yêu cầu:
1. Nếu phiên chat rõ ràng thuộc về một trong các thư mục trên, hãy trả về ID của thư mục đó.
2. Nếu không khớp với bất kỳ thư mục nào hoặc nội dung quá sơ sài, hãy trả về null.
3. Trả về ĐÚNG 1 JSON format (không markdown, không code block):
{"folderId": "id_hoặc_null", "reason": "lý do ngắn gọn dưới 12 từ"}`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.1 }
      });

      let raw = response.text || "";
      raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(raw);
      res.json(parsed);
    } catch (e: any) {
      res.json({ folderId: null, reason: "Không thể tự động phân loại" });
    }
  });

  // Get all sessions - pinned first, then by created_at DESC
  app.get("/api/sessions", (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.json([]);
    const sessions = db.prepare("SELECT * FROM sessions WHERE user_id = ? ORDER BY is_pinned DESC, created_at DESC").all(userId);
    res.json(sessions);
  });

  // Create a new session
  app.post("/api/sessions", (req, res) => {
    const { id, name, userId, folder_id } = req.body;
    db.prepare("INSERT INTO sessions (id, user_id, name, is_pinned, folder_id) VALUES (?, ?, ?, 0, ?)").run(
      id,
      userId || "anonymous",
      name || "New Chat",
      folder_id || null
    );
    res.json({ success: true });
  });

  // Fork / Branch a session up to a specific message index
  app.post("/api/sessions/fork", (req, res) => {
    const { sourceSessionId, newSessionId, name, userId, upToIndex } = req.body;
    if (!sourceSessionId || !newSessionId || !userId) {
      return res.status(400).json({ error: "Missing parameters" });
    }
    db.prepare("INSERT INTO sessions (id, user_id, name, is_pinned) VALUES (?, ?, ?, 0)").run(
      newSessionId,
      userId,
      name || "Branched Chat"
    );

    const existingMsgs = db
      .prepare("SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC, id ASC")
      .all(sourceSessionId) as any[];
    const sliced = typeof upToIndex === "number" ? existingMsgs.slice(0, upToIndex + 1) : existingMsgs;

    const insertStmt = db.prepare(
      "INSERT INTO messages (session_id, role, content, grounding_metadata, images, emergence_analysis, user_analysis, follow_up_questions, intent_alignment, council_debate, deep_research) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    for (const m of sliced) {
      insertStmt.run(
        newSessionId,
        m.role,
        m.content,
        m.grounding_metadata,
        m.images,
        m.emergence_analysis,
        m.user_analysis,
        m.follow_up_questions,
        m.intent_alignment,
        m.council_debate,
        m.deep_research
      );
    }
    res.json({ success: true, id: newSessionId });
  });

  // Toggle/Update session pin, name, or folder_id
  const updateSessionHandler = (req: any, res: any) => {
    const { id } = req.params;
    const { is_pinned, name, folder_id } = req.body;
    if (is_pinned !== undefined) {
      db.prepare("UPDATE sessions SET is_pinned = ? WHERE id = ?").run(is_pinned ? 1 : 0, id);
    }
    if (name !== undefined) {
      db.prepare("UPDATE sessions SET name = ? WHERE id = ?").run(name, id);
    }
    if (folder_id !== undefined) {
      db.prepare("UPDATE sessions SET folder_id = ? WHERE id = ?").run(folder_id || null, id);
    }
    res.json({ success: true });
  };
  app.patch("/api/sessions/:id", updateSessionHandler);
  app.put("/api/sessions/:id", updateSessionHandler);

  // Delete a session
  app.delete("/api/sessions/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM messages WHERE session_id = ?").run(id);
    db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Get messages for a session
  app.get("/api/messages/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const messages = db.prepare("SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC, id ASC").all(sessionId);
    const formatted = messages.map((m: any) => ({
      ...m,
      groundingMetadata: m.grounding_metadata ? JSON.parse(m.grounding_metadata) : null,
      images: m.images ? JSON.parse(m.images) : undefined,
      emergenceAnalysis: m.emergence_analysis ? JSON.parse(m.emergence_analysis) : undefined,
      userAnalysis: m.user_analysis ? JSON.parse(m.user_analysis) : undefined,
      followUpQuestions: m.follow_up_questions ? JSON.parse(m.follow_up_questions) : undefined,
      intentAlignment: m.intent_alignment ? JSON.parse(m.intent_alignment) : undefined,
      councilDebate: m.council_debate ? JSON.parse(m.council_debate) : undefined,
      deepResearch: m.deep_research ? JSON.parse(m.deep_research) : undefined,
    }));
    res.json(formatted);
  });

  // Save a message
  app.post("/api/messages", (req, res) => {
    const { sessionId, session_id, role, content, groundingMetadata, images, emergenceAnalysis, userAnalysis, followUpQuestions, intentAlignment, councilDebate, deepResearch } = req.body;
    const resolvedSessionId = sessionId || session_id;
    const gm = groundingMetadata ? JSON.stringify(groundingMetadata) : null;
    const imgs = images ? JSON.stringify(images) : null;
    const emg = emergenceAnalysis ? JSON.stringify(emergenceAnalysis) : null;
    const ua = userAnalysis ? JSON.stringify(userAnalysis) : null;
    const fu = followUpQuestions ? JSON.stringify(followUpQuestions) : null;
    const ia = intentAlignment ? JSON.stringify(intentAlignment) : null;
    const cd = councilDebate ? JSON.stringify(councilDebate) : null;
    const dr = deepResearch ? JSON.stringify(deepResearch) : null;
    const result = db.prepare(
      "INSERT INTO messages (session_id, role, content, grounding_metadata, images, emergence_analysis, user_analysis, follow_up_questions, intent_alignment, council_debate, deep_research) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(resolvedSessionId, role, content, gm, imgs, emg, ua, fu, ia, cd, dr);
    res.json({ success: true, id: result.lastInsertRowid });
  });

  // Update a message
  app.put("/api/messages/:id", (req, res) => {
    const { id } = req.params;
    const { content, emergenceAnalysis, userAnalysis, followUpQuestions, intentAlignment, councilDebate, deepResearch } = req.body;
    if (content !== undefined) {
      db.prepare("UPDATE messages SET content = ? WHERE id = ?").run(content, id);
    }
    if (emergenceAnalysis !== undefined) {
      db.prepare("UPDATE messages SET emergence_analysis = ? WHERE id = ?").run(JSON.stringify(emergenceAnalysis), id);
    }
    if (userAnalysis !== undefined) {
      db.prepare("UPDATE messages SET user_analysis = ? WHERE id = ?").run(JSON.stringify(userAnalysis), id);
    }
    if (followUpQuestions !== undefined) {
      db.prepare("UPDATE messages SET follow_up_questions = ? WHERE id = ?").run(JSON.stringify(followUpQuestions), id);
    }
    if (intentAlignment !== undefined) {
      db.prepare("UPDATE messages SET intent_alignment = ? WHERE id = ?").run(JSON.stringify(intentAlignment), id);
    }
    if (councilDebate !== undefined) {
      db.prepare("UPDATE messages SET council_debate = ? WHERE id = ?").run(JSON.stringify(councilDebate), id);
    }
    if (deepResearch !== undefined) {
      db.prepare("UPDATE messages SET deep_research = ? WHERE id = ?").run(JSON.stringify(deepResearch), id);
    }
    res.json({ success: true });
  });

  // Analytics Dashboard aggregation endpoint
  app.get("/api/analytics", (req, res) => {
    const { userId, sessionId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId required" });

    let query = `
      SELECT m.*, s.name as session_name 
      FROM messages m
      JOIN sessions s ON m.session_id = s.id
      WHERE s.user_id = ?
    `;
    const params: any[] = [userId];
    if (sessionId) {
      query += ` AND m.session_id = ?`;
      params.push(sessionId);
    }
    query += ` ORDER BY m.timestamp ASC`;

    const allMsgs = db.prepare(query).all(...params) as any[];

    let userCount = 0;
    let aiCount = 0;
    let emergenceCount = 0;
    const emotionCounts: Record<string, number> = {};
    const intentCounts: Record<string, number> = {};
    const complexityCounts: Record<string, number> = {};
    const timeline: any[] = [];

    allMsgs.forEach((m, idx) => {
      if (m.role === 'user') userCount++;
      if (m.role === 'model') aiCount++;

      let ua = null;
      let ea = null;
      try { if (m.user_analysis) ua = JSON.parse(m.user_analysis); } catch (_) {}
      try { if (m.emergence_analysis) ea = JSON.parse(m.emergence_analysis); } catch (_) {}

      if (ea && ea.hasEmergence) {
        emergenceCount++;
      }

      if (ua) {
        if (ua.emotion && ua.emotion !== 'Analyzing') {
          emotionCounts[ua.emotion] = (emotionCounts[ua.emotion] || 0) + 1;
        }
        if (ua.intent && ua.intent !== 'Analyzing') {
          intentCounts[ua.intent] = (intentCounts[ua.intent] || 0) + 1;
        }
        if (ua.complexity && ua.complexity !== 'Analyzing') {
          complexityCounts[ua.complexity] = (complexityCounts[ua.complexity] || 0) + 1;
        }
      }

      if (ua || ea) {
        timeline.push({
          turn: idx + 1,
          role: m.role,
          emotion: ua?.emotion || 'Tự nhiên',
          intent: ua?.intent || 'Trao đổi',
          complexity: ua?.complexity || 'Bình thường',
          hasEmergence: !!(ea && ea.hasEmergence),
          userSnippet: m.role === 'user' ? (m.content.slice(0, 60) + (m.content.length > 60 ? '...' : '')) : '',
          aiSnippet: m.role === 'model' ? (m.content.slice(0, 60) + (m.content.length > 60 ? '...' : '')) : ''
        });
      }
    });

    const totalEmotions = Object.values(emotionCounts).reduce((a, b) => a + b, 0) || 1;
    const emotions = Object.entries(emotionCounts).map(([name, count]) => {
      let color = "#3b82f6";
      const lower = name.toLowerCase();
      if (lower.includes("vui") || lower.includes("hào hứng") || lower.includes("tích cực")) color = "#10b981";
      else if (lower.includes("tò mò") || lower.includes("thắc mắc")) color = "#06b6d4";
      else if (lower.includes("căng thẳng") || lower.includes("bực") || lower.includes("thất vọng")) color = "#ef4444";
      else if (lower.includes("bối rối") || lower.includes("lo")) color = "#f59e0b";
      else if (lower.includes("bình thường") || lower.includes("tự nhiên")) color = "#8b5cf6";
      
      return {
        name,
        count,
        percentage: Math.round((count / totalEmotions) * 100),
        color
      };
    }).sort((a, b) => b.count - a.count);

    const totalIntents = Object.values(intentCounts).reduce((a, b) => a + b, 0) || 1;
    const intents = Object.entries(intentCounts).map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / totalIntents) * 100)
    })).sort((a, b) => b.count - a.count);

    const complexities = Object.entries(complexityCounts).map(([name, count]) => ({
      name,
      count
    })).sort((a, b) => b.count - a.count);

    res.json({
      totalMessages: allMsgs.length,
      userMessagesCount: userCount,
      aiMessagesCount: aiCount,
      emotions,
      intents,
      complexities,
      emergenceCount,
      emergenceRate: allMsgs.length > 0 ? Math.round((emergenceCount / allMsgs.length) * 100) : 0,
      timeline: timeline.slice(-15)
    });
  });

  // Knowledge Graph: Extract entities & relationships from chat history
  app.get("/api/knowledge-graph", (req, res) => {
    const { userId, sessionId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId required" });

    let query = `
      SELECT m.*, s.name as session_name 
      FROM messages m
      JOIN sessions s ON m.session_id = s.id
      WHERE s.user_id = ?
    `;
    const params: any[] = [userId];
    if (sessionId) {
      query += ` AND m.session_id = ?`;
      params.push(sessionId);
    }
    query += ` ORDER BY m.timestamp ASC`;

    const allMsgs = db.prepare(query).all(...params) as any[];

    // Also fetch user memory to integrate personal profile nodes
    const memories = db.prepare("SELECT * FROM user_memory WHERE user_id = ?").all(userId) as any[];

    // Entity dictionary definitions with canonical name and type
    const KNOWN_ENTITIES: { name: string; type: string; aliases: string[] }[] = [
      { name: "React", type: "technology", aliases: ["react", "react.js", "reactjs", "react 19"] },
      { name: "TypeScript", type: "technology", aliases: ["typescript", "ts"] },
      { name: "JavaScript", type: "technology", aliases: ["javascript", "js", "ecmascript"] },
      { name: "Python", type: "technology", aliases: ["python", "py"] },
      { name: "D3.js", type: "technology", aliases: ["d3", "d3.js", "d3js", "force-directed"] },
      { name: "Vite", type: "technology", aliases: ["vite", "vitejs"] },
      { name: "Tailwind CSS", type: "technology", aliases: ["tailwind", "tailwindcss"] },
      { name: "SQLite", type: "technology", aliases: ["sqlite", "sqlite3", "better-sqlite3"] },
      { name: "PostgreSQL", type: "technology", aliases: ["postgresql", "postgres"] },
      { name: "Express", type: "technology", aliases: ["express", "express.js", "expressjs"] },
      { name: "Node.js", type: "technology", aliases: ["node", "node.js", "nodejs"] },
      { name: "Mermaid", type: "technology", aliases: ["mermaid", "mermaid.js", "diagram"] },
      { name: "Docker", type: "technology", aliases: ["docker", "container"] },
      { name: "REST API", type: "technology", aliases: ["rest api", "rest", "api", "endpoints"] },
      { name: "Gemini", type: "technology", aliases: ["gemini", "gemini pro", "gemini-3.8-flash", "google gemini"] },
      { name: "LLM", type: "concept", aliases: ["llm", "large language model", "language model"] },
      { name: "RAG", type: "concept", aliases: ["rag", "retrieval augmented generation", "retrieval-augmented"] },
      { name: "Steadfast Reasoning", type: "concept", aliases: ["steadfast", "steadfast mode", "kiên định", "anti-sycophancy", "phản biện"] },
      { name: "Objective Truth", type: "concept", aliases: ["objective truth", "chân lý", "sự thật khách quan", "truth"] },
      { name: "Knowledge Graph", type: "concept", aliases: ["knowledge graph", "đồ thị tri thức", "entity graph", "graph"] },
      { name: "Context Window", type: "concept", aliases: ["context window", "context limit", "unlimited context", "giới hạn ngữ cảnh"] },
      { name: "Vector Database", type: "concept", aliases: ["vector database", "vector db", "embeddings"] },
      { name: "Force Simulation", type: "concept", aliases: ["force simulation", "physics simulation", "mô phỏng lực"] },
      { name: "Token Optimization", type: "concept", aliases: ["token", "tokens", "tối ưu token", "token limit"] },
      { name: "Grounding", type: "concept", aliases: ["grounding", "web search grounding", "tìm kiếm trực tiếp"] },
      { name: "System Architecture", type: "topic", aliases: ["architecture", "kiến trúc", "hệ thống", "system design"] },
      { name: "Data Visualization", type: "topic", aliases: ["visualization", "trực quan hóa", "biểu đồ", "chart"] },
      { name: "Cognitive Analytics", type: "topic", aliases: ["analytics", "phân tích", "cảm xúc", "ý định", "emotion"] },
      { name: "Prompt Engineering", type: "topic", aliases: ["prompt", "system instruction", "tiền đề", "persona"] },
      { name: "Hallucination", type: "problem", aliases: ["hallucination", "ảo giác", "sai lệch", "ngụy biện", "fallacy"] },
      { name: "Sycophancy", type: "problem", aliases: ["sycophancy", "a dua", "xu nịnh", "thiên kiến", "bias"] },
      { name: "Performance", type: "topic", aliases: ["hiệu năng", "performance", "latency", "tối ưu"] }
    ];

    interface NodeAccumulator {
      id: string;
      label: string;
      type: string;
      count: number;
      sessions: Set<string>;
      sessionNames: Set<string>;
      snippets: any[];
    }

    const nodeMap = new Map<string, NodeAccumulator>();
    const linkMap = new Map<string, { source: string; target: string; relation: string; weight: number; context: string }>();

    const getOrCreateNode = (name: string, type: string): NodeAccumulator => {
      let existing = nodeMap.get(name);
      if (!existing) {
        existing = {
          id: name,
          label: name,
          type: type || "concept",
          count: 0,
          sessions: new Set<string>(),
          sessionNames: new Set<string>(),
          snippets: []
        };
        nodeMap.set(name, existing);
      }
      return existing;
    };

    // Integrate user memories as personal context nodes
    memories.forEach((mem) => {
      if (mem.key && mem.value) {
        const memLabel = `${mem.key}: ${mem.value.slice(0, 30)}`;
        const node = getOrCreateNode(memLabel, "memory");
        node.count += 1;
        node.snippets.push({
          sessionId: "user_memory",
          sessionName: "User Profile Memory",
          role: "user",
          text: `Stored memory: ${mem.key} = ${mem.value}`
        });
      }
    });

    // Helper to determine relation predicate based on surrounding text
    const inferRelation = (text: string, e1: string, e2: string): string => {
      const lower = text.toLowerCase();
      if (lower.includes("sử dụng") || lower.includes("use") || lower.includes("uses") || lower.includes("dùng")) return "uses";
      if (lower.includes("xây dựng") || lower.includes("triển khai") || lower.includes("implement") || lower.includes("builds")) return "implements";
      if (lower.includes("giải quyết") || lower.includes("khắc phục") || lower.includes("solve") || lower.includes("fixes")) return "solves";
      if (lower.includes("kết hợp") || lower.includes("tích hợp") || lower.includes("integrate") || lower.includes("connect")) return "integrates_with";
      if (lower.includes("so sánh") || lower.includes("khác với") || lower.includes("vs") || lower.includes("contrast")) return "contrasts_with";
      if (lower.includes("tối ưu") || lower.includes("cải thiện") || lower.includes("optimize") || lower.includes("enhances")) return "enhances";
      if (lower.includes("bảo vệ") || lower.includes("kiểm định") || lower.includes("defends") || lower.includes("verifies")) return "verifies";
      if (lower.includes("là") || lower.includes("is a") || lower.includes("type of")) return "is_a";
      return "relates_to";
    };

    // Process all chat messages
    allMsgs.forEach((msg, idx) => {
      const content = msg.content || "";
      const lowerContent = content.toLowerCase();
      const detectedInMessage = new Set<string>();

      // 1. Check known entities
      KNOWN_ENTITIES.forEach((ke) => {
        const matched = ke.aliases.some((alias) => {
          const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
          return regex.test(content);
        });

        if (matched) {
          detectedInMessage.add(ke.name);
          const node = getOrCreateNode(ke.name, ke.type);
          node.count += 1;
          node.sessions.add(msg.session_id);
          if (msg.session_name) node.sessionNames.add(msg.session_name);

          if (node.snippets.length < 5) {
            const snippet = content.slice(0, 180).trim() + (content.length > 180 ? "..." : "");
            node.snippets.push({
              sessionId: msg.session_id,
              sessionName: msg.session_name,
              role: msg.role,
              text: snippet,
              timestamp: msg.timestamp
            });
          }
        }
      });

      // 2. Extract inline backtick identifiers `foo`
      const backtickMatches = content.match(/`([A-Za-z0-9_.-]{3,30})`/g);
      if (backtickMatches) {
        backtickMatches.forEach((bm) => {
          const raw = bm.replace(/`/g, '').trim();
          if (raw && !/^\d+$/.test(raw) && raw.length > 2 && raw.length < 25) {
            // Capitalize or keep as tool/code
            const node = getOrCreateNode(raw, "tool");
            detectedInMessage.add(raw);
            node.count += 1;
            node.sessions.add(msg.session_id);
            if (msg.session_name) node.sessionNames.add(msg.session_name);
            if (node.snippets.length < 3) {
              node.snippets.push({
                sessionId: msg.session_id,
                sessionName: msg.session_name,
                role: msg.role,
                text: content.slice(0, 150),
                timestamp: msg.timestamp
              });
            }
          }
        });
      }

      // 3. Extract topics from intent alignment
      if (msg.intent_alignment) {
        try {
          const ia = JSON.parse(msg.intent_alignment);
          if (ia && ia.detectedTopic && ia.detectedTopic.length > 2 && ia.detectedTopic !== "General" && ia.detectedTopic !== "Query") {
            const topicName = ia.detectedTopic;
            detectedInMessage.add(topicName);
            const node = getOrCreateNode(topicName, "topic");
            node.count += 1;
            node.sessions.add(msg.session_id);
            if (msg.session_name) node.sessionNames.add(msg.session_name);
          }
        } catch (_) {}
      }

      // 4. Extract emergent insights
      if (msg.emergence_analysis) {
        try {
          const ea = JSON.parse(msg.emergence_analysis);
          if (ea && ea.hasEmergence && ea.category) {
            const catName = ea.category;
            detectedInMessage.add(catName);
            const node = getOrCreateNode(catName, "insight");
            node.count += 1;
            node.sessions.add(msg.session_id);
            if (msg.session_name) node.sessionNames.add(msg.session_name);
          }
        } catch (_) {}
      }

      // 5. Connect co-occurring entities within the message
      const detectedArr = Array.from(detectedInMessage);
      for (let i = 0; i < detectedArr.length; i++) {
        for (let j = i + 1; j < detectedArr.length; j++) {
          const e1 = detectedArr[i];
          const e2 = detectedArr[j];
          const linkKey = e1 < e2 ? `${e1}:::${e2}` : `${e2}:::${e1}`;
          const rel = inferRelation(content, e1, e2);

          const existingLink = linkMap.get(linkKey);
          if (existingLink) {
            existingLink.weight += 1;
          } else {
            linkMap.set(linkKey, {
              source: e1,
              target: e2,
              relation: rel,
              weight: 1,
              context: content.slice(0, 120)
            });
          }
        }
      }
    });

    // If chat history is sparse or brand new, inject helpful seeded foundational entities
    if (nodeMap.size < 4) {
      const defaultConcepts = [
        { name: "Gemini Pro", type: "technology", relation: "powers", target: "Steadfast Reasoning" },
        { name: "Steadfast Reasoning", type: "concept", relation: "verifies", target: "Objective Truth" },
        { name: "Objective Truth", type: "concept", relation: "mitigates", target: "Hallucination" },
        { name: "Knowledge Graph", type: "concept", relation: "implemented_with", target: "D3.js" },
        { name: "D3.js", type: "technology", relation: "visualizes", target: "Data Visualization" },
        { name: "React", type: "technology", relation: "renders", target: "Knowledge Graph" }
      ];

      defaultConcepts.forEach(dc => {
        const n1 = getOrCreateNode(dc.name, dc.type);
        n1.count = Math.max(n1.count, 2);
        n1.sessions.add(sessionId ? String(sessionId) : "overview");
        n1.snippets.push({
          sessionId: sessionId ? String(sessionId) : "overview",
          sessionName: "Foundational Architecture",
          role: "model",
          text: `Entity mapped in cognitive architecture: ${dc.name}`
        });

        const n2 = getOrCreateNode(dc.target, "concept");
        n2.count = Math.max(n2.count, 1);
        n2.sessions.add(sessionId ? String(sessionId) : "overview");

        const linkKey = dc.name < dc.target ? `${dc.name}:::${dc.target}` : `${dc.target}:::${dc.name}`;
        if (!linkMap.has(linkKey)) {
          linkMap.set(linkKey, {
            source: dc.name,
            target: dc.target,
            relation: dc.relation,
            weight: 2,
            context: `Mapped connection between ${dc.name} and ${dc.target}`
          });
        }
      });
    }

    // Convert to response format
    const nodes = Array.from(nodeMap.values()).map(n => ({
      id: n.id,
      label: n.label,
      type: n.type,
      count: n.count,
      sessions: Array.from(n.sessions),
      sessionNames: Array.from(n.sessionNames),
      snippets: n.snippets.slice(0, 5)
    })).sort((a, b) => b.count - a.count);

    const validNodeIds = new Set(nodes.map(n => n.id));
    const links = Array.from(linkMap.values()).filter(l => 
      validNodeIds.has(l.source) && validNodeIds.has(l.target)
    );

    // Compute category counts
    const categoryCounts: Record<string, number> = {};
    nodes.forEach(n => {
      categoryCounts[n.type] = (categoryCounts[n.type] || 0) + 1;
    });
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "concept";

    const totalPossibleLinks = nodes.length > 1 ? (nodes.length * (nodes.length - 1)) / 2 : 1;
    const density = Math.round((links.length / totalPossibleLinks) * 100) / 100;

    res.json({
      nodes,
      links,
      summary: {
        totalEntities: nodes.length,
        totalRelationships: links.length,
        topCategory,
        density
      }
    });
  });

  // Simple RAG: Search history
  app.get("/api/search", (req, res) => {
    const { q, userId } = req.query;
    if (!q || !userId) return res.json([]);
    const results = db.prepare(`
      SELECT m.*, s.name as session_name 
      FROM messages m 
      JOIN sessions s ON m.session_id = s.id 
      WHERE s.user_id = ? AND m.content LIKE ? 
      LIMIT 10
    `).all(userId, `%${q}%`);
    res.json(results);
  });

  // User Memory Endpoints
  app.get("/api/memory", (req, res) => {
    const { userId } = req.query;
    const memory = db.prepare("SELECT * FROM user_memory WHERE user_id = ?").all(userId);
    res.json(memory);
  });

  app.post("/api/memory", (req, res) => {
    const { userId, key, value } = req.body;
    const existing = db.prepare("SELECT id FROM user_memory WHERE user_id = ? AND key = ?").get(userId, key) as any;
    if (existing) {
      db.prepare("UPDATE user_memory SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(value, existing.id);
    } else {
      db.prepare("INSERT INTO user_memory (user_id, key, value) VALUES (?, ?, ?)").run(userId, key, value);
    }
    res.json({ success: true });
  });

  app.delete("/api/memory/:id", (req, res) => {
    db.prepare("DELETE FROM user_memory WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Documents Endpoints
  app.get("/api/documents", (req, res) => {
    const { userId } = req.query;
    const docs = db.prepare("SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC").all(userId);
    res.json(docs);
  });

  app.post("/api/documents", (req, res) => {
    const { userId, title, content } = req.body;
    db.prepare("INSERT INTO documents (user_id, title, content) VALUES (?, ?, ?)").run(userId, title, content);
    res.json({ success: true });
  });

  app.delete("/api/documents/:id", (req, res) => {
    db.prepare("DELETE FROM documents WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Notes Endpoints
  app.get("/api/notes", (req, res) => {
    const { userId } = req.query;
    const notes = db.prepare("SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC").all(userId);
    res.json(notes);
  });

  app.post("/api/notes", (req, res) => {
    const { userId, title, content } = req.body;
    db.prepare("INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)").run(userId, title, content);
    res.json({ success: true });
  });

  app.delete("/api/notes/:id", (req, res) => {
    db.prepare("DELETE FROM notes WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // arXiv Atom XML Proxy (Required by Science Skill since export.arxiv.org lacks CORS headers)
  app.get("/api/arxiv", async (req, res) => {
    try {
      const q = String(req.query.q || "cat:q-bio.BM");
      const maxResults = Math.min(Number(req.query.max_results) || 8, 20);
      const url = `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(q)}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).json({ error: `arXiv API returned ${response.status}` });
      }
      const xmlText = await response.text();
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.send(xmlText);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch arXiv" });
    }
  });

  // Live Google Search Grounding Endpoint (explicitly using gemini-3.8-flash + googleSearch tool)
  app.post("/api/gemini/search-grounding", async (req, res) => {
    try {
      const { query, context, domain } = req.body;
      if (!query || !String(query).trim()) {
        return res.status(400).json({ error: "Query is required" });
      }

      const systemPrompt =
        domain === "bioscience"
          ? `Bạn là Chuyên gia Sinh học Phân tử, Dược lý học & Y sinh (Bioscience Research Assistant).
Hãy sử dụng Google Search Grounding để tổng hợp thông tin khoa học cập nhật nhất, thử nghiệm lâm sàng mới nhất, cơ chế tác động (MoA), đột biến gen hoặc cấu trúc protein liên quan đến truy vấn.
Trình bày rõ ràng bằng tiếng Việt chuyên ngành chuẩn xác, súc tích, có đánh dấu các phát hiện thực nghiệm vs dự đoán.`
          : `Bạn là Trợ lý Nghiên cứu AI sử dụng Google Search Grounding thời gian thực. Hãy trả lời chính xác, khách quan và dẫn chứng nguồn rõ ràng bằng tiếng Việt.`;

      const fullPrompt = context
        ? `Ngữ cảnh dữ liệu hiện tại:\n${context}\n\nTruy vấn cần đối chiếu Google Search thời gian thực:\n${query}`
        : String(query);

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: fullPrompt,
        config: {
          systemInstruction: systemPrompt,
          tools: [{ googleSearch: {} }],
          temperature: 0.3,
        },
      });

      const groundingMetadata = response.candidates?.[0]?.groundingMetadata || null;
      const chunks = groundingMetadata?.groundingChunks || [];
      const sources = chunks
        .map((chunk: any) => ({
          title: chunk.web?.title || "Nguồn Web Khoa học",
          uri: chunk.web?.uri || "",
        }))
        .filter((s: { uri: string }) => Boolean(s.uri));

      res.json({
        text: response.text || "",
        groundingMetadata,
        sources,
        webSearchQueries: groundingMetadata?.webSearchQueries || [],
        model: "gemini-3.8-flash",
      });
    } catch (error: any) {
      console.error("Search Grounding Error:", error);
      res.status(500).json({ error: error.message || "Search Grounding failed" });
    }
  });

  const server = http.createServer(app);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
