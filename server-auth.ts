import type express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

declare global {
  namespace Express {
    interface Request {
      uid?: string;
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.resolve(__dirname, "firebase-applet-config.json");

function ensureFirebaseAdminInitialized() {
  if (getApps().length === 0) {
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw) as { projectId?: string };
    initializeApp({ projectId: parsed.projectId });
  }
}

export const requireAuth: express.RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const idToken = authHeader.slice(7).trim();
    if (!idToken) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    ensureFirebaseAdminInitialized();
    const decoded = await getAuth().verifyIdToken(idToken);
    if (!decoded || !decoded.uid) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
};
