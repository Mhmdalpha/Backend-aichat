import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: false, // Bisa diisi nanti
      default: "Untitled Chat", // Opsional: default jika tidak diberikan
    },
    history: [
      {
        role: {
          type: String,
          enum: ["user", "model"],
          required: true,
        },
        parts: [
          {
            text: {
              type: String,
              required: true,
            },
          },
        ],
        img: {
          type: String,
          required: false,
        },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.chat || mongoose.model("chat", chatSchema);