import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const DB_FILE = path.join(process.cwd(), "db.json");

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON and URL encoded forms with 50mb limit for attachments
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Route: Load Database
  app.get("/api/db", (req, res) => {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        return res.json(JSON.parse(fileContent));
      } else {
        return res.json({});
      }
    } catch (error) {
      console.error("Error reading db.json:", error);
      return res.status(500).json({ success: false, message: "Failed to read database file on server." });
    }
  });

  // API Route: Save Database
  app.post("/api/db", (req, res) => {
    try {
      const data = req.body;
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
      return res.json({ success: true, message: "Database saved successfully." });
    } catch (error) {
      console.error("Error writing db.json:", error);
      return res.status(500).json({ success: false, message: "Failed to save database file on server." });
    }
  });

  // API Route: LINE Notify Proxy (Bypasses CORS and keeps token secure)
  app.post("/api/line-notify", async (req, res) => {
    try {
      const { message, token } = req.body;
      
      // Use the user-submitted token or the server-side environment variable
      const activeToken = token || process.env.LINE_NOTIFY_TOKEN;
      
      if (!activeToken) {
        return res.status(400).json({ 
          success: false, 
          message: "ไม่พบ LINE Notify Token กรุณาเปิดใช้งานและตั้งค่าในโมดูลตั้งค่า" 
        });
      }

      if (!message) {
        return res.status(400).json({ 
          success: false, 
          message: "ไม่พบข้อความแจ้งเตือน" 
        });
      }

      // Call LINE Notify API using standard fetch
      const response = await fetch("https://notify-api.line.me/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Bearer ${activeToken}`
        },
        body: new URLSearchParams({ message })
      });

      if (response.ok) {
        const result = await response.json();
        return res.json({ success: true, data: result });
      } else {
        const errText = await response.text();
        return res.status(response.status).json({ 
          success: false, 
          message: `LINE API responded with error: ${errText}` 
        });
      }
    } catch (error) {
      console.error("LINE Notify Proxy Error:", error);
      return res.status(500).json({ 
        success: false, 
        message: (error as Error).message 
      });
    }
  });

  // Vite middleware for development or serving compiled static assets in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
