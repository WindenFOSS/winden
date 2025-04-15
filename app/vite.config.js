// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  assetsInclude: [
    '**/*.woff2',
    '**/*.woff',
    '**/*.ttf'
  ],
  chunkSizeWarningLimit: 1000,
  plugins: [react()],
  base: '/app',
  build: {
    commonjsOptions: {
      onwarn: () => {}
    },
    outDir: 'dist',
    assetsDir: 'assets',
    // Generate manifest for asset tracking
    manifest: true,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning) return;
      },
      input: path.resolve(__dirname, 'index.html'),
      output: {
        // Ensure assets use panel prefix
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          return `assets/${ext}/[name]-[hash][extname]`
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      }
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@lib': path.resolve(__dirname, './src/lib')
    }
  }
})