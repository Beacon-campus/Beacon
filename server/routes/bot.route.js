import express from 'express';
import auth from '../middleware/auth.js';
import {
    chatWithBot,
    getHistory,
    getSession,
    deleteSession,
    updateTitle
} from '../controllers/bot.controller.js';

const router = express.Router();

// ==========================================
// 1. POST: CHAT & SUMMARIZE
// ==========================================
router.post('/chat', auth, chatWithBot);

// ==========================================
// 2. GET: HISTORY LIST (For Sidebar)
// ==========================================
router.get('/history', auth, getHistory);

// ==========================================
// 3. GET: SINGLE SESSION (Load Chat)
// ==========================================
router.get('/session/:id', auth, getSession);

// ==========================================
// 4. DELETE: SESSION
// ==========================================
router.delete('/session/:id', auth, deleteSession);

// ==========================================
// 5. PATCH: UPDATE CHAT TITLE
// ==========================================
router.patch('/session/:id/title', auth, updateTitle);

export default router;