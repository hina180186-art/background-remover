// config.js — API Key Configuration
module.exports = {
  // Remove.bg API Key
  // Get yours at: https://www.remove.bg/api
  REMOVE_BG_API_KEY: process.env.REMOVE_BG_API_KEY || "rDkYmShXWufbctkEWbTtinZ8",

  // Server settings
  PORT: process.env.PORT || 3000,

  // Max upload size in MB
  MAX_FILE_SIZE_MB: 10,
};
