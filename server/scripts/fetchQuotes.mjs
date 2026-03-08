import mongoose from "mongoose";

async function run() {
  const mongoUri = process.env.MONGO_URI || "";
  if (!mongoUri) {
    throw new Error("Missing required env var: MONGO_URI");
  }

  await mongoose.connect(mongoUri);

  const docs = await mongoose.connection.db
    .collection("quotes")
    .aggregate([{ $sample: { size: 7 } }])
    .toArray();

  const quotes = docs.map((doc) => ({
    text: String(doc.Quote || doc.text || "").trim(),
    author: String(doc.Author || doc.author || "Unknown").trim() || "Unknown",
  }));

  console.log(JSON.stringify(quotes, null, 2));
}

run()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Failed to fetch quotes:", error);
    try {
      await mongoose.connection.close();
    } catch {
      // ignore close errors
    }
    process.exit(1);
  });
