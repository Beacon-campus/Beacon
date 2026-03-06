import { getSketchByUser, saveSketchService } from "../services/sketches.service.js";

export const getSketch = async (req, res) => {
  try {
    const { uid } = req.user;
    const sketch = await getSketchByUser(uid);

    if (!sketch) {
      return res.json({ elements: [], appState: {} });
    }

    res.json(sketch);
  } catch (err) {
    console.error("❌ SKETCH LOAD ERROR:", err);
    res.status(500).json({ error: "Failed to load sketch" });
  }
};

export const saveSketch = async (req, res) => {
  try {
    const { uid } = req.user;
    const { elements, appState } = req.body;

    const payloadSize = JSON.stringify(req.body).length;
    if (payloadSize > 1024 * 1024) {
      return res.status(413).json({ error: "Canvas too large to save" });
    }

    const updatedSketch = await saveSketchService(uid, elements, appState);

    res.json({ success: true, updatedAt: updatedSketch.updatedAt });
  } catch (err) {
    console.error("❌ SKETCH SAVE ERROR:", err);
    res.status(500).json({ error: "Failed to save sketch" });
  }
};
