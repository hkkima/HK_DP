import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// GitHub Pages: /HK_DP/ (리포 이름과 일치) · 로컬 dev: /
const base = process.env.DEPLOY_TARGET === 'ghpages' ? '/HK_DP/' : '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: { port: 5390 },
  resolve: {
    alias: {
      // 공유 패키지는 HK_Hub 모노레포를 git 서브모듈(vendor/hk-hub)로 참조.
      // Actions는 checkout 시 submodules: true 필요. STEP 1(단계적 흡수)의 브리지.
      '@hk/shared': fileURLToPath(new URL('./vendor/hk-hub/packages/shared/src/index.js', import.meta.url)),
    },
  },
});
