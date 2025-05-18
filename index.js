import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import ImageKit from "imagekit";
import mongoose from "mongoose";
import Chat from "./models/chat.js";
import UserChats from "./models/userChats.js";
import { requireAuth } from "@clerk/express"; // Import yang benar
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT || 3000;
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.log(err);
  }
};

const imagekit = new ImageKit({
  urlEndpoint: process.env.IMAGE_KIT_ENDPOINT,
  publicKey: process.env.IMAGE_KIT_PUBLIC_KEY,
  privateKey: process.env.IMAGE_KIT_PRIVATE_KEY,
});

// Endpoint untuk upload (ImageKit Authentication)
app.get("/api/upload", (req, res) => {
  const result = imagekit.getAuthenticationParameters();
  res.json(result); // Mengirimkan data dalam format JSON
});

// Endpoint untuk membuat chat
app.post("/api/chats", requireAuth(), async (req, res) => {
  const userId = req.auth.userId;
  const { text } = req.body;

  try {
    const newChat = new Chat({
      userId,
      history: [{ role: "user", parts: [{ text }] }],
    });

    const savedChat = await newChat.save();

    const userChats = await UserChats.find({ userId });

    if (!userChats.length) {
      const newUserChats = new UserChats({
        userId,
        chats: [
          {
            _id: savedChat._id,
            title: text.substring(0, 40),
          },
        ],
      });

      await newUserChats.save();
    } else {
      await UserChats.updateOne(
        { userId },
        {
          $push: {
            chats: {
              _id: savedChat._id,
              title: text.substring(0, 40),
            },
          },
        }
      );
    }

    res.status(201).json({ chatId: savedChat._id }); // Mengirimkan respons JSON
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error creating chat!" }); // Mengirimkan respons JSON jika terjadi error
  }
});

// Endpoint untuk mendapatkan daftar chat user
app.get("/api/userchats", requireAuth(), async (req, res) => {
  const userId = req.auth.userId;
  try {
    const userChats = await UserChats.find({ userId });
    res.set('Cache-Control', 'no-store');  // Pastikan tidak ada cache
    res.status(200).send(userChats[0]?.chats || []);
  } catch (err) {
    res.status(500).send("Error fetching userchats!");
  }
});


// Endpoint untuk mendapatkan chat tertentu
app.get("/api/chats/:id", requireAuth(), async (req, res) => {
  const userId = req.auth.userId;

  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId });
    res.status(200).json(chat); // Mengirimkan respons JSON
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error fetching chat!" }); // Mengirimkan respons JSON jika terjadi error
  }
});

// Endpoint untuk mengupdate chat
app.put("/api/chats/:id", requireAuth(), async (req, res) => {
  const userId = req.auth.userId;
  const { question, answer, img } = req.body;

  const newItems = [
    ...(question
      ? [{ role: "user", parts: [{ text: question }], ...(img && { img }) }]
      : []),
    { role: "model", parts: [{ text: answer }] },
  ];

  try {
    const updatedChat = await Chat.updateOne(
      { _id: req.params.id, userId },
      {
        $push: {
          history: {
            $each: newItems,
          },
        },
      }
    );
    res.status(200).json(updatedChat); // Mengirimkan respons JSON
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error adding conversation!" }); // Mengirimkan respons JSON jika terjadi error
  }
});

// Error handler untuk unathenticated routes
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(401).json({ error: "Unauthenticated!" }); // Mengirimkan respons JSON jika tidak terautentikasi
});

// Endpoint utama untuk memeriksa apakah server berjalan
app.get("/", (req, res) => {
  res.json({ message: "Backend is running" });  // Menggunakan res.json() untuk respons JSON
});

app.listen(port, () => {
  connect();
  console.log(`Server running on ${port}`);
});
