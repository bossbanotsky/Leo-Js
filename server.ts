import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache for the day's prices
let priceCache: { date: string; prices: Record<string, number> } | null = null;

// Baseline prices for PH market (approximate)
const BASE_PRICES: Record<string, number> = {
  "Copper (Pure)": 380,
  "Copper (Mixed)": 350,
  "Aluminum (Can)": 55,
  "Aluminum (Hard)": 75,
  "Brass": 200,
  "Stainless Steel": 50,
  "Iron/Steel": 14,
  "Lead": 60,
  "Battery (Car)": 450, // per piece usually, but here as reference
  "Plastic (PET)": 15,
  "Plastic (Hard)": 12,
  "Cardboard": 5,
  "Paper": 3,
  "Glass Bottle": 2,
};

function getDailyPrices(materialNames: string[]) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  
  if (!priceCache || priceCache.date !== today) {
    console.log("Generating new daily prices for:", today);
    // Seed random with date to keep it consistent for the whole day
    const seed = today.split("-").join("");
    const seededRandom = (i: number) => {
      const x = Math.sin(Number(seed) + i) * 10000;
      return x - Math.floor(x);
    };

    const newPrices: Record<string, number> = {};
    // Process known and unknown materials
    materialNames.forEach((name, index) => {
      const base = BASE_PRICES[name] || 20; // Default price if unknown
      const variance = (seededRandom(index) - 0.5) * 0.1; // +/- 5% daily fluctuation
      newPrices[name] = Math.round(base * (1 + variance) * 100) / 100;
    });

    priceCache = { date: today, prices: newPrices };
  }

  // Ensure all requested names are in the response
  const result: Record<string, number> = {};
  materialNames.forEach(name => {
    if (priceCache?.prices[name]) {
      result[name] = priceCache.prices[name];
    } else {
      // If a new material was added mid-day, generate a price for it and cache it
      const base = BASE_PRICES[name] || 20;
      const variance = (Math.random() - 0.5) * 0.1;
      const price = Math.round(base * (1 + variance) * 100) / 100;
      priceCache!.prices[name] = price;
      result[name] = price;
    }
  });

  return result;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/market-prices", (req, res) => {
    const { materialNames } = req.body;
    if (!materialNames || !Array.isArray(materialNames)) {
      return res.status(400).json({ error: "Invalid material names" });
    }

    try {
      const prices = getDailyPrices(materialNames);
      res.json(prices);
    } catch (error) {
      console.error("Market Price Error:", error);
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
