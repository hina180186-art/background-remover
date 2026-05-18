const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) {} 
  }

  const { email, code } = body || {};
  if (!email || !code) return res.status(400).json({ error: 'Missing email or code' });

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: '"Aura Elite+" <' + process.env.SMTP_USER + '>',
      to: email,
      subject: 'Your Aura Elite+ Verification Code',
      html: '<div style="background:#0a0a0b;color:#f0ead6;font-family:sans-serif;padding:40px;max-width:480px;margin:auto;border-top:2px solid #c9a84c;"><h2 style="color:#c9a84c;letter-spacing:4px;font-weight:300;">AURA ELITE+</h2><p style="color:#8a8070;font-size:12px;letter-spacing:2px;">NEURAL VERIFICATION CODE</p><div style="background:#141418;border:1px solid #2a2820;padding:32px;text-align:center;margin:24px 0;border-top:1px solid rgba(201,168,76,0.3);"><span style="font-size:42px;letter-spacing:16px;color:#e8c96a;font-family:monospace;">' + code + '</span></div><p style="color:#555048;font-size:11px;">This code expires in 10 minutes. Do not share it.</p></div>',
      text: 'Your Aura Elite+ verification code is: ' + code + '\n\nExpires in 10 minutes.',
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Email send error:', err.message);
    return res.status(500).json({ error: 'Failed to send email: ' + err.message });
  }
};
