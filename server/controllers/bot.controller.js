import {
    calculateDocSize,
    MAX_DOC_SIZE,
    getSessionByIdAndUser,
    generateBotResponse,
    saveSession,
    createSession,
    getHistoryByUserId,
    deleteSessionByIdAndUser,
    updateSessionTitle
} from "../services/bot.service.js";

export const chatWithBot = async (req, res) => {
  try {
    const { message, botType, sessionId } = req.body;
    const userId = req.user.uid;

    let session = null;
    let contextHistory = [];
    let currentSummary = "";

    if (sessionId) {
        session = await getSessionByIdAndUser(sessionId, userId);
        if (session) {
            currentSummary = session.summary || "";
            contextHistory = session.messages.slice(-10).map(m => ({
                role: m.role === 'bot' ? 'model' : 'user',
                parts: [{ text: m.text }]
            }));
        }
    }

    const parsedResponse = await generateBotResponse(botType, currentSummary, contextHistory, message);
    const { reply, summary } = parsedResponse;

    if (session) {
        const newSize = calculateDocSize(session);
        
        if (newSize > MAX_DOC_SIZE) {
            return res.status(413).json({ error: "Memory Full. Please start a new chat." });
        }

        session.messages.push({ role: 'user', text: message });
        session.messages.push({ role: 'bot', text: reply });
        session.summary = summary;
        session.lastActive = new Date();
        session.docSizeBytes = newSize;
        
        await saveSession(session);
    } else {
        const title = message.split(' ').slice(0, 5).join(' ') + '...';
        session = await createSession(userId, title, summary, message, reply);
    }

    res.json({ 
        reply: reply, 
        sessionId: session._id, 
        title: session.title,
        docSize: session.docSizeBytes
    });

  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: 'Server error processing chat' });
  }
};

export const getHistory = async (req, res) => {
  try {
    const sessions = await getHistoryByUserId(req.user.uid);
    res.json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

export const getSession = async (req, res) => {
  try {
    const session = await getSessionByIdAndUser(req.params.id, req.user.uid);
    
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load session' });
  }
};

export const deleteSession = async (req, res) => {
    try {
      await deleteSessionByIdAndUser(req.params.id, req.user.uid);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete' });
    }
};

export const updateTitle = async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const session = await updateSessionTitle(req.params.id, req.user.uid, title.trim());

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({ success: true, title: session.title });
  } catch (error) {
    console.error("Update title error:", error);
    res.status(500).json({ error: "Failed to update title" });
  }
};
