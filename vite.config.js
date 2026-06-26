import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages: /HK_DP/ (리포 이름과 일치) · 로컬 dev: /
const base = process.env.DEPLOY_TARGET === 'ghpages' ? '/HK_DP/' : '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: { port: 5390 },
});
