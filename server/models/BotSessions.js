import mongoose from 'mongoose';

const botSessionSchema = new mongoose.Schema({
  userId: {
    type: String, 
    required: true,
    index: true 
  },
  title: { type: String, default: "New Chat" },
  
  // ✅ NEW: Rolling Summary of the conversation
  summary: { 
    type: String, 
    default: "" 
  },

  messages: [{
    role: { type: String, required: true }, 
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  
  isSaved: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now },

  // ✅ NEW: Track approximate size (in bytes) to prevent crashes
  docSizeBytes: { type: Number, default: 0 } 

}, { timestamps: true });

// TTL Index: Expires 7 days after 'lastActive' updates
// (This AUTOMATICALLY handles your request to reset the timer on activity)
botSessionSchema.index({ lastActive: 1 }, { 
  expireAfterSeconds: 604800, 
  partialFilterExpression: { isSaved: false } 
});

export default mongoose.model('BotSession', botSessionSchema);