import mongoose from "mongoose";

const sketchSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // Firebase UID
      required: true,
      unique: true, // One sketch per user
      index: true,
    },
    // We store the drawing elements as a raw Array
    elements: {
      type: Array, 
      default: [],
    },
    // Store view state (scroll position, zoom, etc.)
    appState: {
      type: Object,
      default: {},
    }
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Sketch", sketchSchema);