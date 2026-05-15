// config.js — API Key Configuration
// ⚠️  Never commit this file with real keys. Add it to .gitignore.
module.exports = {
  // Alibaba Cloud / DashScope Qwen API key
  // Get yours at: https://dashscope.aliyuncs.com/
  DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY || "sk-87590cc94e0a493ca837fa7d91481df6",

  // Server settings
  PORT: process.env.PORT || 3000,

  // Qwen image-edit endpoint
  QWEN_API_URL: "https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis",

  // Max upload size in MB
  MAX_FILE_SIZE_MB: 10,
};
