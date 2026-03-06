import Sketch from "../models/Sketch.js";

export const getSketchByUser = async (uid) => {
  return await Sketch.findOne({ userId: uid });
};

export const saveSketchService = async (uid, elements, appState) => {
  return await Sketch.findOneAndUpdate(
    { userId: uid },
    { $set: { elements, appState } },
    { new: true, upsert: true }
  );
};
