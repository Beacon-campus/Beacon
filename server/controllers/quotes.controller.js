import { getRandomQuoteFromDB } from "../services/quotes.service.js";

export const getRandomQuote = async (req, res) => {
  try {
    const quote = await getRandomQuoteFromDB();
    if (quote) {
      res.json(quote);
    } else {
      res.status(404).json({ error: "No quotes found" });
    }
  } catch (err) {
    if (err.message === "Database not ready") {
      res.status(503).json({ error: "Database not ready" });
    } else {
      console.error("Quote fetch error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
};
