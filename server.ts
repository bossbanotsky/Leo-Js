import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini Setup
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  // API Routes
  app.post("/api/market-prices", async (req, res) => {
    const { materialNames } = req.body;
    if (!materialNames || !Array.isArray(materialNames) || materialNames.length === 0) {
      return res.status(400).json({ error: "Invalid material names" });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are a scrap and junk shop market price generator. I will provide a list of material names. Generate realistic CURRENT market prices (in Philippine Peso, PHP / ₱) for each material per kilogram (or piece). Return the result strictly as a JSON object where the key is the exact material name provided and the value is the numeric price.

Material names:
${materialNames.map(n => `- ${n}`).join("\n")}
`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: materialNames.reduce((acc, name) => {
              acc[name] = { type: Type.NUMBER };
              return acc;
            }, {} as any),
            required: materialNames
          }
        }
      } as any); // Cast because of possible SDK version discrepancies

      const text = response.text || "{}";
      res.json(JSON.parse(text));
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to fetch market prices" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
