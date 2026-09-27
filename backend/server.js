import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import aiRoutes from "./routes/ai.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith("/api")) {
      console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use("/api/ai", aiRoutes);

// General health check
app.get("/api/health", (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY");
  res.json({
    status: "online",
    service: "AquaSentinel Backend API",
    version: "1.0.0",
    geminiLive: hasKey,
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash"
  });
});

// Root welcome
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head><title>AquaSentinel API Server</title></head>
      <body style="font-family: sans-serif; padding: 40px; background: #0b132b; color: #e0fbfc;">
        <h2>🐟 AquaSentinel Water Quality & Fish-Culture Assistant API</h2>
        <p>The backend is active and listening on port <b>${PORT}</b>.</p>
        <ul>
          <li>POST <code>/api/ai/fish-advice</code> - Generate structured AI pond recommendations</li>
          <li>POST <code>/api/ai/chat</code> - Interactive farmer Q&A with Gemini</li>
          <li>GET <code>/api/ai/history</code> - Previous recommendation logs</li>
          <li>GET <code>/api/ai/species-profiles</code> - Fish species water-quality envelopes</li>
          <li>GET <code>/api/health</code> - Service and Gemini API connection status</li>
        </ul>
      </body>
    </html>
  `);
});

// Start Server
app.listen(PORT, () => {
  console.log("=================================================");
  console.log(`🌊 AquaSentinel Server running on http://localhost:${PORT}`);
  console.log(`🤖 Gemini Model: ${process.env.GEMINI_MODEL || "gemini-3.8-flash"}`);
  console.log(`🔑 Gemini Key Configured: ${process.env.GEMINI_API_KEY ? "YES (Live AI Active)" : "NO (Running in Local Aquaculture Rule Mode)"}`);
  console.log("=================================================");
});
