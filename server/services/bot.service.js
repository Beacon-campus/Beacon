import { GoogleGenerativeAI } from "@google/generative-ai";
import BotSession from "../models/BotSessions.js";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export const calculateDocSize = (session) => {
    const str = JSON.stringify(session);
    return Buffer.byteLength(str, 'utf8');
};

export const MAX_DOC_SIZE = 16 * 1024 * 1024; // 16 MB

export const getSessionByIdAndUser = async (sessionId, userId) => {
    return await BotSession.findOne({ _id: sessionId, userId });
};

export const generateBotResponse = async (botType, currentSummary, contextHistory, message) => {
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

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
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
