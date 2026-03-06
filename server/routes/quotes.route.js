import express from "express";
import { getRandomQuote } from "../controllers/quotes.controller.js";

const router = express.Router();

router.get("/random", getRandomQuote);

export default router;
