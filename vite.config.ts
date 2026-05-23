import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const siteUrl = process.env.VITE_SITE_URL || 'https://matoeconnect.vercel.app';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'html-site-url',
      transformIndexHtml(html) {
        return html.replaceAll('__SITE_URL__', siteUrl);
      },
    },
  ],
  build: {
    sourcemap: false,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
