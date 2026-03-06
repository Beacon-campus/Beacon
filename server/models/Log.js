import mongoose from "mongoose";

const actorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    firebaseUid: { type: String, default: "" },
    name: { type: String, default: "" },
    role: { type: String, default: "" },
    email: { type: String, default: "" },
  },
  { _id: false }
);

const logSchema = new mongoose.Schema(
  {
    eventType: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["success", "failure", "info"],
      default: "info",
      index: true,
    },
    actor: { type: actorSchema, default: {} },
    target: {
      type: {
        type: String,
        default: "",
      },
      id: {
        type: String,
        default: "",
      },
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    message: { type: String, default: "" },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

logSchema.index({ createdAt: -1 });
logSchema.index({ eventType: 1, createdAt: -1 });
logSchema.index({ "actor.userId": 1, createdAt: -1 });
logSchema.index({ category: 1, createdAt: -1 });

const Log = mongoose.model("Log", logSchema);
export default Log;
