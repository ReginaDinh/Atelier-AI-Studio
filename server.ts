import 'dotenv/config';
import express from "express";
import http from "http";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, GenerateContentResponse, ThinkingLevel } from "@google/genai";
import { createHash } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.on("uncaughtException", (err) => {
  console.error("[Server UncaughtException Guard]:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[Server UnhandledRejection Guard]:", reason);
});

let cachedAiClient: GoogleGenAI | null = null;
let cachedApiKey: string = "";

function getAiClient(): GoogleGenAI {
  const rawKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim().replace(/^["']|["']$/g, "");
  if (cachedAiClient && cachedApiKey === rawKey) {
    return cachedAiClient;
  }
  cachedApiKey = rawKey;
  cachedAiClient = new GoogleGenAI({
    apiKey: rawKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
  return cachedAiClient;
}

function formatGeminiErrorMessage(error: any): { isAuthOrQuotaError: boolean; message: string } {
  const raw = String(error?.message || error || "");
  if (
    raw.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") ||
    raw.includes("API key not valid") ||
    raw.includes("API_KEY_INVALID") ||
    raw.includes("UNAUTHENTICATED") ||
    raw.includes('"code": 401') ||
    raw.includes('"code":401')
  ) {
    return {
      isAuthOrQuotaError: true,
      message:
        "⚠️ **Invalid or Unsupported Gemini API Key (`401 UNAUTHENTICATED`)**\n\nThe current `GEMINI_API_KEY` configured in **Settings > Secrets** is not valid for the Gemini API (`ACCESS_TOKEN_TYPE_UNSUPPORTED`). Please open **Settings > Secrets** in AI Studio and select or enter a valid Gemini API key (starting with `AIza...`).",
    };
  }
  if (raw.includes("PERMISSION_DENIED") || raw.includes('"code": 403') || raw.includes('"code":403')) {
    return {
      isAuthOrQuotaError: true,
      message:
        "⚠️ **Gemini API Permission Denied (`403 PERMISSION_DENIED`)**\n\nPlease check your `GEMINI_API_KEY` in **Settings > Secrets** and ensure it has access to the requested Gemini model.",
    };
  }
  if (raw.includes("RESOURCE_EXHAUSTED") || raw.includes('"code": 429') || raw.includes('"code":429')) {
    return {
      isAuthOrQuotaError: true,
      message:
        "⚠️ **Gemini API Quota Reached (`429 RESOURCE_EXHAUSTED`)**\n\nRate limit or quota reached for the current API key. Please wait a moment and try again, or check your key in **Settings > Secrets**.",
    };
  }
  return {
    isAuthOrQuotaError: false,
    message: raw || "Failed to generate Gemini response",
  };
}

const MODEL_NAME = "gemini-3.8-flash";

const db = new Database("chat.db");

// High-Throughput SQLite Engine Tuning (WAL + 64MB Page Cache + 256MB Memory-Mapped I/O)
try {
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("temp_store = MEMORY");
  db.pragma("cache_size = -64000");
  db.pragma("mmap_size = 268435456");
  db.pragma("foreign_keys = ON");
} catch (_) {}

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
  db.exec("ALTER TABLE messages ADD COLUMN self_evaluation TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE sessions ADD COLUMN is_pinned INTEGER DEFAULT 0;");
} catch (e) {}
try {
  db.exec("ALTER TABLE sessions ADD COLUMN folder_id TEXT;");
} catch (e) {}

// High-Performance B-Tree Indexes & SQLite FTS5 Full-Text Search Virtual Table (BM25 + Unicode61 Diacritic Removal)
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_pinned ON sessions(user_id, is_pinned DESC, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_session_time ON messages(session_id, timestamp ASC, id ASC);
    CREATE INDEX IF NOT EXISTS idx_memory_user_key ON user_memory(user_id, key);
    CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);

    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      content,
      content='messages',
      content_rowid='id',
      tokenize='unicode61 remove_diacritics 2'
    );

    CREATE TRIGGER IF NOT EXISTS messages_fts_ai AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, content) VALUES (new.id, COALESCE(new.content, ''));
    END;

    CREATE TRIGGER IF NOT EXISTS messages_fts_ad AFTER DELETE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.id, COALESCE(old.content, ''));
    END;

    CREATE TRIGGER IF NOT EXISTS messages_fts_au AFTER UPDATE OF content ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.id, COALESCE(old.content, ''));
      INSERT INTO messages_fts(rowid, content) VALUES (new.id, COALESCE(new.content, ''));
    END;
  `);
  const ftsCount = (db.prepare("SELECT COUNT(*) as c FROM messages_fts").get() as { c: number })?.c ?? 0;
  const msgCount = (db.prepare("SELECT COUNT(*) as c FROM messages").get() as { c: number })?.c ?? 0;
  if (msgCount > 0 && ftsCount === 0) {
    db.exec(`INSERT INTO messages_fts(messages_fts) VALUES('rebuild');`);
  }
} catch (ftsErr) {
  console.warn("FTS5 initialization warning:", ftsErr);
}

// Helper: Normalize Vietnamese diacritics (including đ/Đ) for hybrid semantic/fuzzy ranking
function normalizeVietnamese(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

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
    "gemini-3.1-pro",
    "gemini-2.5-pro",
    "gemini-3.8-flash",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite-preview",
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

  const resolveThinkingConfig = (model: string, effort?: string) => {
    if (!effort || effort === "auto") return undefined;
    // thinkingLevel is only supported on Gemini 3 and Gemini 4 series models
    const isGemini3Or4 = model.startsWith("gemini-3") || model.startsWith("gemini-4");
    if (!isGemini3Or4) return undefined;
    if (effort === "high") return { thinkingLevel: ThinkingLevel.HIGH };
    if (effort === "medium") return { thinkingLevel: ThinkingLevel.MEDIUM };
    if (effort === "low") return { thinkingLevel: ThinkingLevel.LOW };
    if (effort === "minimal") {
      // gemini-4-argon, gemini-3.8-flash, and pro models do not support MINIMAL, fallback to LOW
      if (model === "gemini-4-argon" || model === "gemini-3.8-flash" || model.includes("pro")) {
        return { thinkingLevel: ThinkingLevel.LOW };
      }
      return { thinkingLevel: ThinkingLevel.MINIMAL };
    }
    return undefined;
  };

  // Single-Model Quota Optimization: In-Memory Normalized Response Cache (TTL 30 mins, Max 200 entries)
  const responseCache = new Map<string, { text: string; groundingMetadata: any; timestamp: number }>();
  const CACHE_TTL_MS = 30 * 60 * 1000;
  const makeCacheKey = (model: string, prompt: string, sys?: string, search?: boolean, effort?: string) =>
    createHash("sha256")
      .update(JSON.stringify([model, effort || "auto", Boolean(search), sys || "", prompt || ""]))
      .digest("hex");

  // Real-Time FinOps & Quota Usage Telemetry
  const finopsTelemetry = {
    totalCalls: 0,
    cachedCallsSaved: 0,
    fallbackCount: 0,
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
    byModel: {} as Record<string, { calls: number; inputTokens: number; outputTokens: number }>,
    startedAt: new Date().toISOString(),
  };

  const recordFinopsUsage = (modelUsed: string, inputChars: number, outputChars: number, wasFallback = false) => {
    const inTok = Math.max(1, Math.ceil(inputChars / 4));
    const outTok = Math.max(1, Math.ceil(outputChars / 4));
    finopsTelemetry.totalCalls += 1;
    if (wasFallback) finopsTelemetry.fallbackCount += 1;
    finopsTelemetry.estimatedInputTokens += inTok;
    finopsTelemetry.estimatedOutputTokens += outTok;
    if (!finopsTelemetry.byModel[modelUsed]) {
      finopsTelemetry.byModel[modelUsed] = { calls: 0, inputTokens: 0, outputTokens: 0 };
    }
    finopsTelemetry.byModel[modelUsed].calls += 1;
    finopsTelemetry.byModel[modelUsed].inputTokens += inTok;
    finopsTelemetry.byModel[modelUsed].outputTokens += outTok;
  };

  app.get("/api/gemini/finops", (req, res) => {
    const rawKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
    const keyFormat = !rawKey
      ? "missing"
      : rawKey.startsWith("AIza")
      ? "standard_api_key"
      : "managed_token";
    res.json({
      ...finopsTelemetry,
      cacheEntriesCount: responseCache.size,
      keyStatus: rawKey ? "configured" : "missing",
      keyFormat,
    });
  });

  app.post("/api/gemini/finops/reset", (req, res) => {
    finopsTelemetry.totalCalls = 0;
    finopsTelemetry.cachedCallsSaved = 0;
    finopsTelemetry.fallbackCount = 0;
    finopsTelemetry.estimatedInputTokens = 0;
    finopsTelemetry.estimatedOutputTokens = 0;
    finopsTelemetry.byModel = {};
    finopsTelemetry.startedAt = new Date().toISOString();
    res.json({ success: true, finops: finopsTelemetry });
  });

  // Server-side Gemini API Routes
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { messages, systemInstruction, temperature, useGoogleSearch, stream, model, reasoningEffort } = req.body;
      const targetModel = resolveModel(model);
      const inputCharsEst =
        String(systemInstruction || "").length +
        (messages || []).reduce((acc: number, m: any) => acc + String(m?.content || "").length, 0);
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

        const isTemperatureDeprecatedModel = (m: string) =>
          m === "gemini-3.8-flash" || m === "gemini-4-argon";

        const runStreamWithModel = async (modelToUse: string) => {
          const aiClient = getAiClient();
          const thinkingConfig = resolveThinkingConfig(modelToUse, reasoningEffort);
          const chatWithHistory = aiClient.chats.create({
            model: modelToUse,
            config: {
              systemInstruction,
              ...(isTemperatureDeprecatedModel(modelToUse)
                ? {}
                : { temperature: typeof temperature === "number" ? temperature : 0.7 }),
              tools: tools.length > 0 ? tools : undefined,
              thinkingConfig,
            },
            history: contents,
          });

          return await chatWithHistory.sendMessageStream({
            message: lastMessage.parts,
          });
        };

        let result;
        let usedModel = targetModel;
        let wasFallback = false;
        try {
          result = await runStreamWithModel(targetModel);
        } catch (primaryErr: any) {
          if (targetModel !== MODEL_NAME) {
            usedModel = MODEL_NAME;
            wasFallback = true;
            result = await runStreamWithModel(MODEL_NAME);
          } else {
            throw primaryErr;
          }
        }

        let clientClosed = false;
        req.on("close", () => { clientClosed = true; });
        let totalStreamedChars = 0;
        for await (const chunk of result) {
          if (clientClosed) break;
          const resp = chunk as GenerateContentResponse;
          const text = resp.text || "";
          totalStreamedChars += text.length;
          const groundingMetadata = resp.candidates?.[0]?.groundingMetadata || null;
          res.write(`data: ${JSON.stringify({ text, groundingMetadata })}\n\n`);
        }

        if (clientClosed) {
          recordFinopsUsage(usedModel, inputCharsEst, totalStreamedChars, wasFallback);
        } else {
          recordFinopsUsage(usedModel, inputCharsEst, totalStreamedChars, wasFallback);
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
        }
      } else {
        const isTemperatureDeprecatedModel = (m: string) =>
          m === "gemini-3.8-flash" || m === "gemini-4-argon";

        const generateNonStream = async (modelToUse: string) => {
          const aiClient = getAiClient();
          const thinkingConfig = resolveThinkingConfig(modelToUse, reasoningEffort);
          return await aiClient.models.generateContent({
            model: modelToUse,
            contents:
              contents.length > 0
                ? contents
                : [
                    {
                      role: "user",
                      parts: [{ text: (messages || []).map((m: any) => `${m.role}: ${m.content}`).join("\n") }],
                    },
                  ],
            config: {
              systemInstruction: systemInstruction || undefined,
              ...(isTemperatureDeprecatedModel(modelToUse)
                ? {}
                : { temperature: typeof temperature === "number" ? temperature : 0.7 }),
              tools: tools.length > 0 ? tools : undefined,
              thinkingConfig,
            },
          });
        };

        let response;
        let usedModel = targetModel;
        let wasFallback = false;
        try {
          response = await generateNonStream(targetModel);
        } catch (primaryErr: any) {
          if (targetModel !== MODEL_NAME) {
            usedModel = MODEL_NAME;
            wasFallback = true;
            response = await generateNonStream(MODEL_NAME);
          } else {
            throw primaryErr;
          }
        }
        const outText = response.text || "";
        recordFinopsUsage(usedModel, inputCharsEst, outText.length, wasFallback);
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata || null;
        res.json({ text: outText, groundingMetadata });
      }
    } catch (error: any) {
      const formatted = formatGeminiErrorMessage(error);
      if (req.body?.stream) {
        if (!res.headersSent) {
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
        }
        res.write(`data: ${JSON.stringify({ text: formatted.message })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      } else if (!res.headersSent) {
        res.json({ text: formatted.message, error: formatted.message });
      } else {
        res.write(`data: ${JSON.stringify({ text: formatted.message, done: true })}\n\n`);
        res.end();
      }
    }
  });

  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { prompt, temperature, useGoogleSearch, systemInstruction, model, reasoningEffort, jsonMode } = req.body;
      const targetModel = resolveModel(model);
      const cacheKey = makeCacheKey(
        targetModel,
        `${jsonMode ? "[JSON]" : ""}${prompt}`,
        systemInstruction,
        useGoogleSearch,
        reasoningEffort
      );
      const cached = responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        finopsTelemetry.cachedCallsSaved += 1;
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
      const isTemperatureDeprecatedModel = (m: string) =>
        m === "gemini-3.8-flash" || m === "gemini-4-argon";

      const runGen = async (modelToUse: string) => {
        const aiClient = getAiClient();
        const thinkingConfig = resolveThinkingConfig(modelToUse, reasoningEffort);
        return await aiClient.models.generateContent({
          model: modelToUse,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            systemInstruction: systemInstruction || undefined,
            ...(isTemperatureDeprecatedModel(modelToUse)
              ? {}
              : { temperature: typeof temperature === "number" ? temperature : 0.2 }),
            ...(jsonMode && !useGoogleSearch ? { responseMimeType: "application/json" } : {}),
            tools: tools.length > 0 ? tools : undefined,
            thinkingConfig,
          },
        });
      };

      let response;
      let usedModel = targetModel;
      let wasFallback = false;
      try {
        response = await runGen(targetModel);
      } catch (primaryErr: any) {
        if (targetModel !== MODEL_NAME) {
          usedModel = MODEL_NAME;
          wasFallback = true;
          response = await runGen(MODEL_NAME);
        } else {
          throw primaryErr;
        }
      }
      const resultText = response.text || "";
      const inputCharsEst = String(prompt || "").length + String(systemInstruction || "").length;
      recordFinopsUsage(usedModel, inputCharsEst, resultText.length, wasFallback);
      const resultGrounding = response.candidates?.[0]?.groundingMetadata || null;
      if (resultText) {
        if (responseCache.size >= 250) {
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
      const formatted = formatGeminiErrorMessage(error);
      res.json({ text: "", error: formatted.message, authError: formatted.isAuthOrQuotaError });
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

  // Multi-Step Topic Clustering & Categorization with Gemini
  app.post("/api/gemini/cluster-categorize", async (req, res) => {
    try {
      const { sessions, folders, model } = req.body;
      if (!folders || !folders.length) {
        return res.json({ clusters: [], assignments: [], totalCategorized: 0, reason: "No folders available for classification" });
      }
      if (!sessions || !sessions.length) {
        return res.json({ clusters: [], assignments: [], totalCategorized: 0, reason: "No sessions provided" });
      }

      // Populate rich message history snippets from SQLite if missing
      const enrichedSessions = sessions.map((s: any) => {
        let snippet = s.messagesPreview || s.sampleText || "";
        if (!snippet && s.id) {
          try {
            const dbMsgs = db.prepare(
              "SELECT role, content FROM messages WHERE session_id = ? ORDER BY timestamp ASC LIMIT 8"
            ).all(s.id) as Array<{ role: string; content: string }>;
            if (dbMsgs && dbMsgs.length > 0) {
              snippet = dbMsgs.map(m => `[${m.role}]: ${m.content.slice(0, 220)}`).join("\n");
            }
          } catch (_) {}
        }
        return {
          id: s.id,
          name: s.name || "Untitled Chat",
          historySnippet: (snippet || "").slice(0, 900)
        };
      });

      const targetModel = resolveModel(model || "gemini-3.8-flash");
      const folderCatalog = folders.map((f: any) => `- Folder ID: "${f.id}" | Name: "${f.name}" | Emoji: "${f.emoji}"${f.description ? ` | Scope: "${f.description}"` : ""}`).join("\n");

      const sessionCatalog = enrichedSessions.map((s: any, idx: number) => 
        `### Session [${idx + 1}] ID: "${s.id}"\nTitle: "${s.name}"\nMessage History Snippet:\n"""\n${s.historySnippet || "(No messages yet - title only)"}\n"""`
      ).join("\n\n");

      const prompt = `You are an expert cognitive classifier and conversational taxonomist for Atelier Studio.
Execute a strict MULTI-STEP CLASSIFICATION STRATEGY to organize uncategorized conversations:

========================================
STEP 1: ANALYZE MESSAGE HISTORY FOR TOPIC CLUSTERS
========================================
- Deeply inspect the actual message histories, developer intents, code fragments, technical domain, or academic/creative goals across all sessions.
- Do NOT simply rely on conversation titles or literal folder names. Look into the substantive topics discussed.
- Group the sessions into coherent Topic Clusters based on genuine semantic affinity and shared problem space (e.g., "Full-Stack React & UI Component Architecture", "Database Modeling & Query Optimization", "Academic Research & Literature Analysis", "Creative Writing & Multi-Lingual Translation", "DevOps & System Tooling").
- Every session must belong to exactly one cluster.

========================================
STEP 2: ASSIGN CATEGORIES BASED ON TOPIC CLUSTERS
========================================
- For each discovered Topic Cluster, evaluate the available folders:
${folderCatalog}
- Map the cluster (and its member sessions) to the best-fitting folder based on semantic alignment between the cluster's core domain/themes and the folder's domain scope and purpose.
- Do NOT do simple substring keyword matching. Match based on thematic concept (e.g. A cluster about "Drizzle ORM & PostgreSQL indexes" matches a folder named "Backend & Architecture" or "Code & Dev", even if the word "Backend" never appears in the chat).
- If a cluster or session does not genuinely fit any existing folder, assign null for folderId (do not force incorrect mappings).

========================================
AVAILABLE FOLDERS:
========================================
${folderCatalog}

========================================
SESSIONS TO CLASSIFY:
========================================
${sessionCatalog}

Return STRICT JSON ONLY matching this exact schema (no markdown formatting, no code blocks):
{
  "clusters": [
    {
      "clusterId": "cluster_1",
      "topic": "Concise semantic topic title",
      "summary": "1-2 sentence description of shared themes and message content",
      "coreThemes": ["theme1", "theme2", "theme3"],
      "sessionIds": ["session_id_1"],
      "suggestedFolderId": "folder_id_or_null",
      "folderMatchConfidence": 0.85
    }
  ],
  "assignments": [
    {
      "sessionId": "session_id",
      "folderId": "target_folder_id_or_null",
      "clusterId": "cluster_id",
      "clusterTopic": "Cluster topic title",
      "confidence": 0.9,
      "reason": "Clear explanation grounded in message history topic cluster"
    }
  ]
}`;

      const aiClient = getAiClient();
      let response;
      let usedModel = targetModel;
      try {
        response = await aiClient.models.generateContent({
          model: targetModel,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json",
          },
        });
      } catch {
        usedModel = MODEL_NAME;
        response = await aiClient.models.generateContent({
          model: MODEL_NAME,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
      }

      let raw = response.text || "";
      recordFinopsUsage(usedModel, prompt.length, raw.length, usedModel !== targetModel);
      raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(raw);
      const validFolderIds = new Set(folders.map((f: any) => f.id));
      const sanitizedAssignments = (parsed.assignments || []).map((a: any) => ({
        ...a,
        folderId: a.folderId && validFolderIds.has(a.folderId) ? a.folderId : null
      }));
      const totalCategorized = sanitizedAssignments.filter((a: any) => !!a.folderId).length;

      res.json({
        clusters: parsed.clusters || [],
        assignments: sanitizedAssignments,
        totalCategorized,
        modelUsed: usedModel
      });
    } catch (e: any) {
      console.error("Cluster categorize error:", e);
      res.json({ clusters: [], assignments: [], totalCategorized: 0, reason: e.message || "Failed to cluster and categorize" });
    }
  });

  // Smart Folder Auto-Categorization with Gemini (supports dynamic Lite/Flash model tier)
  app.post("/api/gemini/auto-categorize", async (req, res) => {
    try {
      const { sessionName, sampleText, folders, model } = req.body;
      if (!folders || !folders.length) {
        return res.json({ folderId: null, reason: "Chưa có thư mục nào để phân loại." });
      }
      const targetModel = resolveModel(model || "gemini-3.1-flash-lite-preview");
      const folderList = folders.map((f: any) => `- ID: "${f.id}" | Tên: "${f.name}" | Icon: "${f.emoji}"`).join("\n");
      const prompt = `Bạn là hệ thống tự động phân loại hội thoại thông minh của Atelier Studio.
Sử dụng chiến lược phân loại 2 bước:
Bước 1: Phân tích lịch sử tin nhắn để xác định chủ đề cốt lõi và lĩnh vực thảo luận (topic cluster / domain).
Bước 2: Gán vào thư mục phù hợp dựa trên chủ đề cốt lõi đó thay vì chỉ so khớp tên thư mục đơn thuần.

Tiêu đề phiên chat: "${sessionName || "Hội thoại"}"
Nội dung trích đoạn: "${(sampleText || "").slice(0, 700)}"

Danh sách thư mục hiện có:
${folderList}

Yêu cầu:
1. Nếu phiên chat thuộc về một trong các thư mục trên dựa theo chủ đề sâu, hãy trả về ID của thư mục đó.
2. Nếu không khớp với bất kỳ thư mục nào hoặc nội dung quá sơ sài, hãy trả về null.
3. Trả về ĐÚNG 1 JSON format (không markdown, không code block):
{"folderId": "id_hoặc_null", "clusterTopic": "chủ đề phát hiện", "reason": "lý do ngắn gọn dưới 15 từ"}`;

      const aiClient = getAiClient();
      let response;
      let usedModel = targetModel;
      try {
        response = await aiClient.models.generateContent({
          model: targetModel,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json",
          },
        });
      } catch {
        usedModel = MODEL_NAME;
        response = await aiClient.models.generateContent({
          model: MODEL_NAME,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
      }

      let raw = response.text || "";
      recordFinopsUsage(usedModel, prompt.length, raw.length, usedModel !== targetModel);
      raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(raw);
      res.json({ ...parsed, modelUsed: usedModel });
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
    const sourceSession = db.prepare("SELECT folder_id FROM sessions WHERE id = ?").get(sourceSessionId) as any;
    db.prepare("INSERT INTO sessions (id, user_id, name, is_pinned, folder_id) VALUES (?, ?, ?, 0, ?)").run(
      newSessionId,
      userId,
      name || "Branched Chat",
      sourceSession?.folder_id || null
    );

    const existingMsgs = db
      .prepare("SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC, id ASC")
      .all(sourceSessionId) as any[];
    const sliced = typeof upToIndex === "number" ? existingMsgs.slice(0, upToIndex + 1) : existingMsgs;

    const insertStmt = db.prepare(
      "INSERT INTO messages (session_id, role, content, grounding_metadata, images, emergence_analysis, user_analysis, follow_up_questions, intent_alignment, council_debate, deep_research, self_evaluation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
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
        m.deep_research,
        m.self_evaluation || null
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

  const safeJsonParse = (raw: any, fallback: any = undefined) => {
    if (!raw || typeof raw !== "string") return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  };

  const formatMessagesRows = (messages: any[]) =>
    messages.map((m: any) => ({
      ...m,
      groundingMetadata: safeJsonParse(m.grounding_metadata, null),
      images: safeJsonParse(m.images, undefined),
      emergenceAnalysis: safeJsonParse(m.emergence_analysis, undefined),
      userAnalysis: safeJsonParse(m.user_analysis, undefined),
      followUpQuestions: safeJsonParse(m.follow_up_questions, undefined),
      intentAlignment: safeJsonParse(m.intent_alignment, undefined),
      councilDebate: safeJsonParse(m.council_debate, undefined),
      deepResearch: safeJsonParse(m.deep_research, undefined),
      selfEvaluation: safeJsonParse(m.self_evaluation, undefined),
    }));

  // Get messages via query parameter (?sessionId=...)
  app.get("/api/messages", (req, res) => {
    try {
      const sessionId = String(req.query.sessionId || "");
      if (!sessionId) return res.json([]);
      const messages = db.prepare("SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC, id ASC").all(sessionId);
      res.json(formatMessagesRows(messages));
    } catch (err) {
      console.error("GET /api/messages error:", err);
      res.json([]);
    }
  });

  // Get messages for a session
  app.get("/api/messages/:sessionId", (req, res) => {
    try {
      const { sessionId } = req.params;
      if (!sessionId) return res.json([]);
      const messages = db.prepare("SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC, id ASC").all(sessionId);
      res.json(formatMessagesRows(messages));
    } catch (err) {
      console.error("GET /api/messages/:sessionId error:", err);
      res.json([]);
    }
  });

  // Save a message
  app.post("/api/messages", (req, res) => {
    const { sessionId, session_id, role, content, groundingMetadata, images, emergenceAnalysis, userAnalysis, followUpQuestions, intentAlignment, councilDebate, deepResearch, selfEvaluation } = req.body;
    const resolvedSessionId = sessionId || session_id;
    const gm = groundingMetadata ? JSON.stringify(groundingMetadata) : null;
    const imgs = images ? JSON.stringify(images) : null;
    const emg = emergenceAnalysis ? JSON.stringify(emergenceAnalysis) : null;
    const ua = userAnalysis ? JSON.stringify(userAnalysis) : null;
    const fu = followUpQuestions ? JSON.stringify(followUpQuestions) : null;
    const ia = intentAlignment ? JSON.stringify(intentAlignment) : null;
    const cd = councilDebate ? JSON.stringify(councilDebate) : null;
    const dr = deepResearch ? JSON.stringify(deepResearch) : null;
    const se = selfEvaluation ? JSON.stringify(selfEvaluation) : null;
    const result = db.prepare(
      "INSERT INTO messages (session_id, role, content, grounding_metadata, images, emergence_analysis, user_analysis, follow_up_questions, intent_alignment, council_debate, deep_research, self_evaluation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(resolvedSessionId, role, content, gm, imgs, emg, ua, fu, ia, cd, dr, se);
    res.json({ success: true, id: result.lastInsertRowid });
  });

  // Update a message
  app.put("/api/messages/:id", (req, res) => {
    const { id } = req.params;
    const { content, emergenceAnalysis, userAnalysis, followUpQuestions, intentAlignment, councilDebate, deepResearch, selfEvaluation } = req.body;
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
    if (selfEvaluation !== undefined) {
      db.prepare("UPDATE messages SET self_evaluation = ? WHERE id = ?").run(JSON.stringify(selfEvaluation), id);
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

    // Pre-compile combined regex per entity outside the message loop for O(N) single-pass speed
    const COMPILED_ENTITIES = KNOWN_ENTITIES.map((ke) => {
      const escapedAliases = ke.aliases.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      return {
        ...ke,
        regex: new RegExp(`\\b(?:${escapedAliases.join("|")})\\b`, "i"),
      };
    });

    // Process all chat messages
    allMsgs.forEach((msg) => {
      const content = msg.content || "";
      const detectedInMessage = new Set<string>();

      // 1. Check pre-compiled known entities
      for (const ke of COMPILED_ENTITIES) {
        if (ke.regex.test(content)) {
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
      }

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

  // Hybrid Semantic + Full-Text Search (SQLite FTS5 BM25 + Vietnamese Diacritic-Normalized RRF)
  app.get("/api/search", (req, res) => {
    const rawQuery = String(req.query.q || "").trim();
    const userId = String(req.query.userId || "").trim();
    if (!rawQuery || !userId) return res.json([]);

    const scoredMap = new Map<
      number,
      {
        row: any;
        rrfScore: number;
        matchedSnippet: string;
        matchType: "fts5_bm25" | "exact_phrase" | "fuzzy_token";
      }
    >();

    // Helper: Build contextual snippet around matched query or token
    const buildContextualSnippet = (content: string, queryStr: string): string => {
      const clean = (content || "").replace(/\s+/g, " ").trim();
      if (clean.length <= 160) return clean;
      const normContent = normalizeVietnamese(clean);
      const normQ = normalizeVietnamese(queryStr);
      let idx = normContent.indexOf(normQ);
      if (idx === -1) {
        const firstToken = normQ.split(/\s+/).find((t) => t.length >= 2);
        if (firstToken) idx = normContent.indexOf(firstToken);
      }
      if (idx === -1) return clean.slice(0, 150) + "...";
      const start = Math.max(0, idx - 48);
      const end = Math.min(clean.length, idx + 112);
      return (start > 0 ? "..." : "") + clean.slice(start, end) + (end < clean.length ? "..." : "");
    };

    // 1. Primary Retrieval: SQLite FTS5 BM25 Ranking with Prefix Token Expansion
    try {
      const ftsTokens = rawQuery
        .replace(/[^\p{L}\p{N}\s_-]/gu, " ")
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2);

      if (ftsTokens.length > 0) {
        const ftsMatchExpr = ftsTokens.map((t) => `"${t.replace(/"/g, "")}"*`).join(" OR ");
        const ftsRows = db
          .prepare(
            `
            SELECT m.*, s.name as session_name,
                   bm25(messages_fts) as bm25_raw,
                   snippet(messages_fts, 0, '«', '»', '...', 22) as fts_snippet
            FROM messages_fts
            JOIN messages m ON m.id = messages_fts.rowid
            JOIN sessions s ON m.session_id = s.id
            WHERE s.user_id = ? AND messages_fts MATCH ?
            ORDER BY bm25(messages_fts) ASC
            LIMIT 20
          `
          )
          .all(userId, ftsMatchExpr) as any[];

        ftsRows.forEach((r, rankIdx) => {
          // Reciprocal Rank Fusion (RRF k=60) + BM25 magnitude bonus
          const rrf = 1 / (20 + rankIdx + 1) + Math.min(0.05, Math.abs(Number(r.bm25_raw || 0)) * 0.008);
          scoredMap.set(r.id, {
            row: r,
            rrfScore: rrf,
            matchedSnippet: r.fts_snippet || buildContextualSnippet(r.content, rawQuery),
            matchType: "fts5_bm25",
          });
        });
      }
    } catch (ftsQueryErr) {
      // Fallback gracefully if query contains special syntax
    }

    // 2. Secondary Retrieval & Re-ranking: Exact Phrase + Vietnamese Bi-gram Proximity + Token & Title Scoring
    const normQuery = normalizeVietnamese(rawQuery);
    const queryTokens = normQuery.split(/\s+/).filter((t) => t.length >= 2);
    const queryBigrams: string[] = [];
    for (let i = 0; i < queryTokens.length - 1; i++) {
      queryBigrams.push(`${queryTokens[i]} ${queryTokens[i + 1]}`);
    }

    const candidateRows = db
      .prepare(
        `
        SELECT m.*, s.name as session_name
        FROM messages m
        JOIN sessions s ON m.session_id = s.id
        WHERE s.user_id = ?
        ORDER BY m.timestamp DESC, m.id DESC
        LIMIT 250
      `
      )
      .all(userId) as any[];

    candidateRows.forEach((r, idx) => {
      const normContent = normalizeVietnamese(r.content || "");
      const normTitle = normalizeVietnamese(r.session_name || "");

      let lexicalBoost = 0;
      const isExactPhrase =
        normContent.includes(normQuery) ||
        (r.content || "").toLowerCase().includes(rawQuery.toLowerCase());
      const isTitleMatch = normTitle.includes(normQuery);

      if (isExactPhrase) lexicalBoost += 0.08;
      if (isTitleMatch) lexicalBoost += 0.05;

      if (queryBigrams.length > 0) {
        let matchedBigrams = 0;
        for (const bg of queryBigrams) {
          if (normContent.includes(bg) || normTitle.includes(bg)) {
            matchedBigrams++;
          }
        }
        if (matchedBigrams > 0) {
          lexicalBoost += (matchedBigrams / queryBigrams.length) * 0.045;
        }
      }

      if (queryTokens.length > 0) {
        let matchedTokens = 0;
        for (const tk of queryTokens) {
          if (normContent.includes(tk) || normTitle.includes(tk)) {
            matchedTokens++;
          }
        }
        const coverage = matchedTokens / queryTokens.length;
        if (coverage >= 0.5) {
          lexicalBoost += coverage * 0.035;
        }
      }

      if (lexicalBoost > 0) {
        const existing = scoredMap.get(r.id);
        const recencyBonus = Math.max(0, (250 - idx) / 250) * 0.008;
        if (existing) {
          existing.rrfScore += lexicalBoost + recencyBonus;
          if (isExactPhrase) existing.matchType = "exact_phrase";
        } else {
          scoredMap.set(r.id, {
            row: r,
            rrfScore: lexicalBoost + recencyBonus,
            matchedSnippet: buildContextualSnippet(r.content, rawQuery),
            matchType: isExactPhrase ? "exact_phrase" : "fuzzy_token",
          });
        }
      }
    });

    const rankedResults = Array.from(scoredMap.values())
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .slice(0, 12)
      .map((entry, idx) => {
        const relevanceScore = Math.min(99, Math.max(68, Math.round(72 + entry.rrfScore * 240 - idx * 1.5)));
        return {
          ...entry.row,
          matched_snippet: entry.matchedSnippet,
          match_type: entry.matchType,
          relevance_score: relevanceScore,
        };
      });

    res.json(rankedResults);
  });

  // Two-Way Cloud Sync Engine: Atomic Hydration & Reconciliation (Firestore <-> SQLite)
  app.post("/api/cloud-sync/hydrate", (req, res) => {
    try {
      const { userId, cloudSessions, cloudMessages, cloudMemories } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required" });

      let hydratedSessions = 0;
      let hydratedMessages = 0;
      let hydratedMemories = 0;

      const runHydrationTx = db.transaction(() => {
        // 1. Hydrate Sessions from Firestore into SQLite
        if (Array.isArray(cloudSessions)) {
          const checkSessionStmt = db.prepare("SELECT id, name, is_pinned, folder_id FROM sessions WHERE id = ?");
          const insertSessionStmt = db.prepare(
            "INSERT INTO sessions (id, user_id, name, is_pinned, folder_id) VALUES (?, ?, ?, ?, ?)"
          );
          const updateSessionStmt = db.prepare(
            "UPDATE sessions SET name = ?, is_pinned = ?, folder_id = COALESCE(?, folder_id) WHERE id = ?"
          );

          for (const cs of cloudSessions) {
            if (!cs || !cs.id) continue;
            const existing = checkSessionStmt.get(cs.id) as any;
            if (!existing) {
              insertSessionStmt.run(
                cs.id,
                userId,
                cs.name || "Cloud Chat",
                cs.isPinned ? 1 : 0,
                cs.folderId || null
              );
              hydratedSessions++;
            } else if (cs.name && existing.name !== cs.name && /^Chat \d+$/i.test(existing.name)) {
              updateSessionStmt.run(cs.name, cs.isPinned ? 1 : existing.is_pinned, cs.folderId || null, cs.id);
            }
          }
        }

        // 2. Hydrate Messages from Firestore into SQLite (Deduplicating by session_id + role + content prefix)
        if (Array.isArray(cloudMessages)) {
          const checkMsgsStmt = db.prepare("SELECT role, content FROM messages WHERE session_id = ?");
          const insertMsgStmt = db.prepare(
            "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)"
          );

          const existingBySession = new Map<string, Set<string>>();
          for (const cm of cloudMessages) {
            if (!cm || !cm.sessionId || !cm.content) continue;
            let sessionSet = existingBySession.get(cm.sessionId);
            if (!sessionSet) {
              const rows = checkMsgsStmt.all(cm.sessionId) as any[];
              sessionSet = new Set(rows.map((r) => `${r.role}::${String(r.content || "").slice(0, 160)}`));
              existingBySession.set(cm.sessionId, sessionSet);
            }
            const sig = `${cm.role}::${String(cm.content).slice(0, 160)}`;
            if (!sessionSet.has(sig)) {
              insertMsgStmt.run(cm.sessionId, cm.role === "user" ? "user" : "model", cm.content);
              sessionSet.add(sig);
              hydratedMessages++;
            }
          }
        }

        // 3. Hydrate User Memories from Firestore into SQLite
        if (Array.isArray(cloudMemories)) {
          const checkMemStmt = db.prepare("SELECT id, value FROM user_memory WHERE user_id = ? AND key = ?");
          const insertMemStmt = db.prepare("INSERT INTO user_memory (user_id, key, value) VALUES (?, ?, ?)");
          const updateMemStmt = db.prepare(
            "UPDATE user_memory SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          );

          for (const mem of cloudMemories) {
            if (!mem || !mem.key || !mem.value) continue;
            const existing = checkMemStmt.get(userId, mem.key) as any;
            if (!existing) {
              insertMemStmt.run(userId, mem.key, mem.value);
              hydratedMemories++;
            } else if (existing.value !== mem.value && String(mem.value).length > String(existing.value).length) {
              updateMemStmt.run(mem.value, existing.id);
            }
          }
        }
      });

      runHydrationTx();

      // Return local snapshot so client can also push any local-only sessions/memories up to Firestore
      const localSessions = db
        .prepare("SELECT * FROM sessions WHERE user_id = ? ORDER BY is_pinned DESC, created_at DESC")
        .all(userId) as any[];
      const localMemories = db
        .prepare("SELECT * FROM user_memory WHERE user_id = ?")
        .all(userId) as any[];

      res.json({
        success: true,
        hydratedSessions,
        hydratedMessages,
        hydratedMemories,
        localSessions,
        localMemories,
      });
    } catch (error: any) {
      console.error("Cloud hydration error:", error);
      res.status(500).json({ error: error?.message || "Failed to hydrate cloud data" });
    }
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

      const aiClient = getAiClient();
      const response = await aiClient.models.generateContent({
        model: "gemini-3.8-flash",
        contents: fullPrompt,
        config: {
          systemInstruction: systemPrompt,
          tools: [{ googleSearch: {} }],
        },
      });

      const groundingMetadata = response.candidates?.[0]?.groundingMetadata || null;
      const chunks = groundingMetadata?.groundingChunks || [];
      const sources = chunks
        .map((chunk: any) => ({
          title: chunk.web?.title || "Scientific Web Source",
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
      const formatted = formatGeminiErrorMessage(error);
      res.json({
        text: formatted.message,
        groundingMetadata: null,
        sources: [],
        webSearchQueries: [],
        error: formatted.message,
      });
    }
  });

  // Ensure unmatched /api/* routes or unhandled errors on /api/* always return JSON, never HTML
  app.use("/api", (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
  });

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith("/api")) {
      console.error("Unhandled API Error:", err);
      return res.status(500).json({ error: err?.message || "Internal server error" });
    }
    next(err);
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
