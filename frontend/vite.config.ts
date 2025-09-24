import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 5137,
  },
  plugins: [dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-label'],
          
          // Feature chunks
          'three-js': ['three'],
          'chart-vendor': ['recharts'],
          
          // Page chunks
          'dashboard': ['./src/pages/Dashboard.tsx'],
          'exploration': ['./src/pages/Index.tsx', './src/components/ExplorationMap.tsx'],
          'last-mile-brief': ['./src/components/LastMileBrief.tsx', './src/components/LastMileBrief/LastMileBriefCanvas.tsx'],
          
          // Context chunks
          'contexts': [
            './src/contexts/AuthContext.tsx',
            './src/contexts/WorkspaceContext.tsx',
            './src/contexts/MapContext.tsx',
            './src/contexts/AgentChatContext.tsx',
            './src/contexts/DocumentContext.tsx',
            './src/contexts/InteractionContext.tsx'
          ]
        }
      }
    },
    // Increase chunk size warning limit to 750kb (from default 500kb)
    chunkSizeWarningLimit: 750,
    // Enable source maps for better debugging
    sourcemap: false,
    // Optimize for production
    minify: 'esbuild' as const,
    // Remove console.log statements in production
    esbuild: {
      drop: ['console', 'debugger']
    }
  }
}));
