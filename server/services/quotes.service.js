import mongoose from "mongoose";

export const getRandomQuoteFromDB = async () => {
  if (!mongoose.connection.db) {
    throw new Error("Database not ready");
  }
  const randomQuote = await mongoose.connection.db
    .collection("quotes")
    .aggregate([{ $sample: { size: 1 } }])
    .toArray();

  if (randomQuote.length > 0) {
    return {
      text: randomQuote[0].Quote,
      author: randomQuote[0].Author || "Unknown",
    };
  } else {
    return null;
  }
};
