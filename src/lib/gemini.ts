import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function fetchMarketPrices(materialNames: string[]): Promise<Record<string, number>> {
  if (materialNames.length === 0) return {};

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
          }, {} as Record<string, { type: Type.NUMBER }>),
          required: materialNames
        }
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    return data;
  } catch (err) {
    console.error("Failed to fetch market prices from Gemini: ", err);
    return {};
  }
}
