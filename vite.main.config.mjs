import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  // No externals needed - FFmpeg binary is copied to resources/bin via Forge hook
});
