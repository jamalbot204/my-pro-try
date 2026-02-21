
import { fileURLToPath, URL } from 'url';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaOptions } from './pwa.options';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [VitePWA(pwaOptions)],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': fileURLToPath(new URL('.', import.meta.url)),
        }
      },
      // FORCE PRE-BUNDLING: Critical for Cloud Environments (AI Studio/IDX)
      // This forces Vite to process these heavy libraries immediately when the server starts,
      // preventing the "pause" or "reload" that happens when you first open a feature using them.
      optimizeDeps: {
        include: [
          'react', 
          'react-dom', 
          'react-markdown', 
          'rehype-raw', 
          'remark-gfm', 
          'mermaid', 
          'tone',
          'react-syntax-highlighter',
          'zustand',
          '@google/genai',
          'jszip',
          'html2canvas',
          'jspdf'
        ]
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              // Core React & Markdown rendering (Always loaded)
              'vendor-react': ['react', 'react-dom', 'react-markdown', 'rehype-raw', 'remark-gfm'],
              // Heavy Syntax Highlighting (Lazy loaded in code blocks)
              'syntax-highlighter': ['react-syntax-highlighter', 'refractor'],
              // PDF Generation (Lazy loaded on export)
              'pdf-worker': ['html2canvas', 'jspdf', 'html-to-pdfmake', 'pdfmake'],
              // Diagramming (Very heavy, Lazy loaded)
              'mermaid': ['mermaid'],
              // Audio Processing (Heavy, Lazy loaded)
              'audio': ['tone'],
              // AI SDK (Critical path)
              'genai': ['@google/genai'],
            }
          }
        }
      }
    };
});
