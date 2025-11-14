import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Reduce HMR console noise
  server: {
    hmr: {
      overlay: true, // Show errors as overlay
    },
  },
  // 🔒 PRODUCTION BUILD SECURITY: Minification & Source Map Control
  build: {
    // Minify code (makes it harder to read in DevTools)
    minify: 'terser', // or 'esbuild' (faster but less aggressive)
    
    // Terser options for aggressive minification
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true, // Remove debugger statements
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove specific console methods
      },
      mangle: {
        // Mangle variable names to make code unreadable
        toplevel: true,
        safari10: true,
      },
      format: {
        comments: false, // Remove all comments
      },
    },
    
    // 🔒 Source Maps: DISABLE in production to hide original source code
    // Set to false or 'hidden' for production
    // Set to 'inline' or true only for development debugging
    sourcemap: false, // IMPORTANT: Set to false for production!
    
    // Code splitting for better performance and obfuscation
    rollupOptions: {
      output: {
        // Manual chunking strategy
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['lucide-react', 'framer-motion'],
          'vendor-utils': ['axios'],
        },
        // Randomize chunk names to make it harder to identify
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
      onwarn(warning, warn) {
        // Suppress certain warnings
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
        warn(warning);
      },
    },
    
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
});
