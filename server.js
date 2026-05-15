/**
 * server.js — AI Background Remover Backend
 * Uses qwen-image-edit-max via DashScope with base64 images in messages format.
 * API: POST /api/v1/services/aigc/image-generation/generation
 */

const express = require("express");
const multer = require("multer");
const axios = require("axios");
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

  try {
    const imageBase64 = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype;
    // Build data URI for inline base64 image
    const dataUri = `data:${mimeType};base64,${imageBase64}`;

    /**
     * DashScope qwen-image-edit API
     * Endpoint: https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation
     * Model: qwen-image-edit-max
     * Input: messages array — image data URI + editing text instruction
     */
    const payload = {
      model: "qwen-image-edit-max",
      input: {
        messages: [
          {
            role: "user",
            content: [
              { image: dataUri },
              { text: "Remove the background from this image and make it fully transparent." },
            ],
          },
        ],
      },
      parameters: {
        n: 1,
      },
    };

    console.log("Calling DashScope API...");
    const response = await axios.post(
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation",
      payload,
      {
        headers: {
          Authorization: `Bearer ${config.DASHSCOPE_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 120000,
      }
    );

    const data = response.data;
    console.log("Qwen API response:", JSON.stringify(data, null, 2));

    // Extract result URL from output.results[]
    const results = data?.output?.results;
    if (!results || results.length === 0) {
      return res.status(500).json({ error: "No result returned from Qwen API.", raw: data });
    }

    const resultUrl = results[0]?.url;
    if (!resultUrl) {
      return res.status(500).json({ error: "Qwen returned no image URL.", raw: data });
    }

    // Fetch result image and proxy it as base64 to avoid CORS issues
    const imgResponse = await axios.get(resultUrl, { responseType: "arraybuffer" });
    const resultBase64 = Buffer.from(imgResponse.data).toString("base64");
    const resultMime = imgResponse.headers["content-type"] || "image/png";

    return res.json({
      success: true,
      image: `data:${resultMime};base64,${resultBase64}`,
    });

  } catch (err) {
    const apiErr = err?.response?.data;
    console.error("Qwen API error:", JSON.stringify(apiErr ?? err.message, null, 2));
    const msg =
      apiErr?.message ||
      apiErr?.error?.message ||
      err.message;
    return res.status(500).json({ error: `Background removal failed: ${msg}` });
  }
});

// ─── Global error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err) return res.status(400).json({ error: err.message });
  next();
});

// ─── Start server ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  AI Background Remover running at http://localhost:${PORT}`);
  console.log(`🔑  API Key: ${config.DASHSCOPE_API_KEY !== "YOUR_DASHSCOPE_API_KEY_HERE" ? "✅ Set" : "❌ Not set — edit config.js"}\n`);
});
