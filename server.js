/**
 * server.js — AI Background Remover Backend
 * Uses Remove.bg API for reliable background removal.
 */

const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const path = require("path");
const config = require("./config");

const app = express();
const PORT = config.PORT;

// ─── Multer: in-memory storage ──────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only JPEG, PNG, and WebP images are allowed."));
  },
});

// ─── Static assets ───────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ─── Serve index.html ────────────────────────────────────────────
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ─── POST /remove-bg ─────────────────────────────────────────────
app.post("/remove-bg", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file uploaded." });
  }

  if (config.REMOVE_BG_API_KEY === "YOUR_REMOVE_BG_API_KEY_HERE") {
    return res.status(400).json({ error: "Please set your Remove.bg API Key in config.js" });
  }

  try {
    console.log("Sending image to Remove.bg...");

    const formData = new FormData();
    formData.append("image_file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    formData.append("size", "auto");

    const response = await axios.post("https://api.remove.bg/v1.0/removebg", formData, {
      headers: {
        ...formData.getHeaders(),
        "X-Api-Key": config.REMOVE_BG_API_KEY,
      },
      responseType: "arraybuffer", // Remove.bg returns the binary image immediately
      timeout: 60000,
    });

    // Convert binary result to base64 for the frontend
    const resultBase64 = Buffer.from(response.data).toString("base64");
    
    return res.json({
      success: true,
      image: `data:image/png;base64,${resultBase64}`,
    });

  } catch (err) {
    // Attempt to parse binary error response from Remove.bg
    let errorMsg = err.message;
    if (err.response && err.response.data) {
      try {
        const decodedError = JSON.parse(Buffer.from(err.response.data).toString());
        errorMsg = decodedError.errors?.[0]?.title || errorMsg;
      } catch (_) {}
    }
    
    console.error("Remove.bg Error:", errorMsg);
    return res.status(500).json({ error: `Background removal failed: ${errorMsg}` });
  }
});

// ─── Start server ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  AI Background Remover running at http://localhost:${PORT}`);
  console.log(`🔑  API: Remove.bg (${config.REMOVE_BG_API_KEY !== "YOUR_REMOVE_BG_API_KEY_HERE" ? "✅ Key Set" : "❌ Key Missing"})\n`);
});
