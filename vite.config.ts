import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api/resend': {
          target: 'https://api.resend.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/resend/, ''),
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('lucide-react')) return 'vendor-lucide';
              if (id.includes('@supabase')) return 'vendor-supabase';
              if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
              if (id.includes('@google/genai')) return 'vendor-genai';
              if (id.includes('motion')) return 'vendor-motion';
              if (id.includes('@radix-ui')) return 'vendor-radix';
              if (id.includes('pdfjs-dist')) return 'vendor-pdf';
              return 'vendor-libs';
            }
            if (
              id.includes('/src/features/payroll/') || id.includes('\\src\\features\\payroll\\') ||
              id.includes('/src/features/people/') || id.includes('\\src\\features\\people\\')
            ) {
              return 'module-workforce-payroll';
            }
            if (id.includes('/src/features/attendance/') || id.includes('\\src\\features\\attendance\\')) {
              return 'module-attendance';
            }
            if (id.includes('/src/features/leave/') || id.includes('\\src\\features\\leave\\')) {
              return 'module-leave';
            }
            if (id.includes('/src/features/lms/') || id.includes('\\src\\features\\lms\\')) {
              return 'module-lms';
            }
            if (id.includes('/src/features/performance/') || id.includes('\\src\\features\\performance\\')) {
              return 'module-performance';
            }
            if (id.includes('/src/features/platform/') || id.includes('\\src\\features\\platform\\')) {
              return 'module-platform';
            }
            if (id.includes('/src/features/analytics/') || id.includes('\\src\\features\\analytics\\')) {
              return 'module-analytics';
            }
            if (id.includes('/src/features/admin/') || id.includes('\\src\\features\\admin\\')) {
              return 'module-admin';
            }
          },
        },
      },
    },
  };
});
