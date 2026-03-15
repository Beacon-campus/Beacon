import { GoogleGenerativeAI } from "@google/generative-ai";
import BotSession from "../models/BotSessions.js";

const DEFAULT_GEMINI_MODELS = [
    process.env.GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash"
].filter(Boolean);

const getGenAIClient = () => {
    const apiKey = String(process.env.GOOGLE_API_KEY || "").trim();

    if (!apiKey) {
        const error = new Error("Missing GOOGLE_API_KEY");
        error.code = "BOT_CONFIG_MISSING";
        throw error;
    }

    return new GoogleGenerativeAI(apiKey);
};

export const calculateDocSize = (session) => {
    const str = JSON.stringify(session);
    return Buffer.byteLength(str, 'utf8');
};

export const MAX_DOC_SIZE = 16 * 1024 * 1024; // 16 MB

export const getSessionByIdAndUser = async (sessionId, userId) => {
    return await BotSession.findOne({ _id: sessionId, userId });
};

export const generateBotResponse = async (botType, currentSummary, contextHistory, message) => {
    const genAI = getGenAIClient();
    let systemPrompt = `
      You are a ${botType === 'teacher' ? 'Research Assistant' : 'Study Buddy'}.
      
      **CRITICAL INSTRUCTION:**
      You must output your response in **JSON format** with two keys:
      1. "reply": Your actual helpful response to the user.
      2. "summary": A concise summary of the conversation so far, INCLUDING this new interaction.
      
      **Current Context:**
      - Previous Summary: "${currentSummary}"
      
      **Formatting Rules for "reply":**
      - Use Markdown (bold, bullets).
      - Keep it clear and academic.
    `;

    let lastError;

    for (const modelName of DEFAULT_GEMINI_MODELS) {
        try {
            const model = genAI.getGenerativeModel({
              model: modelName,
              systemInstruction: systemPrompt,
              generationConfig: {
                responseMimeType: "application/json"
              }
            });

            const chat = model.startChat({
                history: contextHistory
            });

            const result = await chat.sendMessage(message);
            const responseText = result.response.text();
            
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(responseText);
            } catch (e) {
                parsedResponse = {
                    reply: responseText,
                    summary: currentSummary
                };
            }

            return parsedResponse;
        } catch (error) {
            lastError = error;
            console.error(`[bot] Gemini request failed for model "${modelName}":`, error?.message || error);
        }
    }

    const wrappedError = new Error(lastError?.message || "Failed to generate bot response");
    wrappedError.code = lastError?.code || "BOT_PROVIDER_ERROR";
    wrappedError.cause = lastError;
    throw wrappedError;
};

export const saveSession = async (session) => {
    return await session.save();
};

export const createSession = async (userId, title, summary, message, reply) => {
    return await BotSession.create({
        userId,
        title,
        summary,
        messages: [
            { role: 'user', text: message },
            { role: 'bot', text: reply }
        ],
        docSizeBytes: 1000
    });
};

export const getHistoryByUserId = async (userId) => {
    return await BotSession.find({ userId })
      .select('title lastActive') 
      .sort({ lastActive: -1 })
      .limit(20);
};

export const deleteSessionByIdAndUser = async (sessionId, userId) => {
    return await BotSession.findOneAndDelete({ _id: sessionId, userId });
};

export const updateSessionTitle = async (sessionId, userId, title) => {
    return await BotSession.findOneAndUpdate(
      { _id: sessionId, userId },
      { title: title, lastActive: new Date() },
      { returnDocument: 'after' }
    );
};
