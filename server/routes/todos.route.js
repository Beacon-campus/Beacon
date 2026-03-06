import express from "express";
import verifyFirebaseToken from "../middleware/auth.js";
import { getTodos, createTodo, updateTodo, deleteTodo } from "../controllers/todos.controller.js";

const router = express.Router();

router.use(verifyFirebaseToken);

router.get("/", getTodos);
router.post("/", createTodo);
router.put("/:id", updateTodo);
router.delete("/:id", deleteTodo);

export default router;