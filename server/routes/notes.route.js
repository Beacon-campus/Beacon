import express from "express";
import verifyFirebaseToken from "../middleware/auth.js";
import { getNotes, createNote, updateNote, deleteNote } from "../controllers/notes.controller.js";

const router = express.Router();

router.use(verifyFirebaseToken);

router.get("/", getNotes);
router.post("/", createNote);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);

export default router;
