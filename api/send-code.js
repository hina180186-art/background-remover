const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Missing email or code' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: config.SMTP_FROM || `"Aura Elite+" <onboarding@resend.dev>`,
      to: email,
      subject: 'Your Aura Elite+ Verification Code',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0a0b;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#0f0f11;border-top:1px solid #c9a84c;border-left:1px solid #1c1c22;border-right:1px solid #1c1c22;border-bottom:1px solid #1c1c22;">
          <tr>
            <td style="padding:32px 40px 24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:34px;height:34px;background:#141418;border:1px solid #7a6130;text-align:center;vertical-align:middle;">
                    <span style="font-size:16px;color:#c9a84c;font-weight:300;">A</span>
                  </td>
                  <td style="padding-left:10px;">
                    <span style="font-size:18px;color:#f0ead6;letter-spacing:4px;font-weight:300;">AURA <span style="color:#c9a84c;">ELITE+</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:#1c1c22;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 8px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#555048;">Neural Verification Protocol</p>
              <h1 style="margin:0 0 20px;font-size:22px;font-weight:300;color:#f0ead6;letter-spacing:2px;">Verify Your Identity</h1>
              <p style="margin:0 0 28px;font-size:12px;font-weight:300;letter-spacing:1.5px;color:#8a8070;line-height:2;">
                Enter the code below to complete your authentication. This code expires in <span style="color:#c9a84c;">10 minutes</span>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#141418;border:1px solid #2a2820;border-top:1px solid rgba(201,168,76,0.3);padding:28px;text-align:center;">
                    <span style="font-size:40px;letter-spacing:16px;color:#e8c96a;font-weight:300;font-family:'Courier New',monospace;">${code}</span>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:11px;font-weight:300;letter-spacing:1.5px;color:#555048;line-height:2;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:#1c1c22;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;">
              <p style="margin:0;font-size:10px;letter-spacing:2px;color:#2a2820;text-transform:uppercase;">
                © Aura Elite+ · Quantum Edge v2.5 · Do not reply to this email
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
      text: `Your Aura Elite+ verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, ignore this email.`,
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({ error: `SMTP Crash: ${err.message}` });
  }
};
