/* Application configuration */
const CONFIG = {
  API_BASE: 'http://localhost:4000/api',
  TOKEN_KEY: 'ce_token',
  USER_KEY: 'ce_user',
  PAGE_SIZE: 6,
  UPLOAD_LIMITS: {            // File upload limits
    image: { exts: ['jpg', 'jpeg', 'png', 'gif'], maxMB: 2 },
    audio: { exts: ['mp3', 'wav', 'm4a', 'ogg'], maxMB: 5 },
    video: { exts: ['mp4', 'mov', 'avi', 'mkv'], maxMB: 8 },
  },
};
