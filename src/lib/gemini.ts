export async function fetchMarketPrices(materialNames: string[]): Promise<Record<string, number>> {
  if (materialNames.length === 0) return {};

  try {
    const response = await fetch("/api/market-prices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ materialNames }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch from server");
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Failed to fetch market prices from server: ", err);
    return {};
  }
}
