/**
 * server.js — AI Background Remover Backend
 * Uses Remove.bg API for reliable background removal.
 */

const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const path = require("path");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const config = require("./config");

const app = express();
const PORT = config.PORT;

// In-memory store for OTPs (For production, use Redis or DB)
const otpStore = new Map();
const JWT_SECRET = process.env.JWT_SECRET || 'aura-elite-secret-777';

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ success: false, error: 'Authorization required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, error: 'Invalid or expired session' });
    req.user = user;
    next();
  });
};

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

// ─── Middleware ──────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// ─── Authentication Engine ──────────────────────────────────────

// Mock Transporter / Real Transporter
const transporter = nodemailer.createTransport(
  process.env.SMTP_HOST 
    ? {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: process.env.SMTP_SECURE !== 'false', // Default to true (SSL)
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      }
    : {
        streamTransport: true,
        newline: 'unix',
        buffer: true
      }
);

// Route: Send OTP
app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Email required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, { otp, expires: Date.now() + 10 * 60 * 1000 }); // 10 min expiry

  const mailOptions = {
    from: '"Aura Elite+ Authenticator" <auth@aura-elite.pro>',
    to: email,
    subject: 'Your Aura Elite+ Access Code',
    text: `Your luxury access code is: ${otp}. It expires in 10 minutes.`,
    html: `
      <div style="background:#020202; color:#fff; padding:40px; font-family:'Outfit', sans-serif; text-align:center; border:1px solid #D4AF37;">
        <h2 style="color:#D4AF37; text-transform:uppercase; letter-spacing:4px;">Aura Elite+</h2>
        <p style="font-size:18px; opacity:0.8;">Your exclusive access code is:</p>
        <h1 style="font-size:48px; color:#D4AF37; margin:20px 0;">${otp}</h1>
        <p style="font-size:12px; opacity:0.4; text-transform:uppercase; letter-spacing:2px;">Expires in 10 minutes</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    if (!process.env.SMTP_HOST) {
      console.log('----------------------------------------------------');
      console.log(`🔑  OTP for ${email}: ${otp}`);
      console.log('----------------------------------------------------');
    }
    res.json({ success: true, message: 'OTP sent' });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

// Route: Verify OTP
app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const stored = otpStore.get(email);

  if (stored && stored.otp === otp && stored.expires > Date.now()) {
    otpStore.delete(email); // One-time use
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token });
  } else {
    res.status(400).json({ success: false, error: 'Invalid or expired code' });
  }
});

// ─── Serve index.html ────────────────────────────────────────────
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ─── POST /remove-bg ─────────────────────────────────────────────
app.get('/api/auth/check', authenticateToken, (req, res) => {
  res.json({ success: true, email: req.user.email });
});

app.post("/remove-bg", authenticateToken, upload.single("image"), async (req, res) => {
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

// ─── Start Server (Condition for local dev)
if (process.env.NODE_ENV !== 'production') {
  const PORT = config.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀  AI Background Remover running at http://localhost:${PORT}`);
    console.log(`🔑  API: Remove.bg (${(process.env.REMOVE_BG_API_KEY || config.REMOVE_BG_API_KEY) !== "YOUR_REMOVE_BG_API_KEY_HERE" ? '✅ Key Set' : '❌ Key Missing'})`);
  });
}

// Export for Vercel
module.exports = app;
