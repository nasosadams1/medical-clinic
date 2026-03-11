import { defineConfig } from 'vite';

const MANUAL_CHUNK_GROUPS = [
  ['monaco-vendor', ['monaco-editor', '@monaco-editor/react']],
  ['supabase-vendor', ['@supabase/supabase-js']],
  ['motion-vendor', ['framer-motion']],
  ['payments-vendor', ['@stripe', 'stripe']],
  ['socket-vendor', ['socket.io-client']],
  ['icons-vendor', ['lucide-react']],
];

export default defineConfig({
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (
          warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
          typeof warning.id === 'string' &&
          warning.id.includes('react-hot-toast/dist/index.mjs')
        ) {
          return;
        }

        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          for (const [chunkName, packages] of MANUAL_CHUNK_GROUPS) {
            if (packages.some((pkg) => id.includes(`/node_modules/${pkg}/`) || id.includes(`\\node_modules\\${pkg}\\`))) {
              return chunkName;
            }
          }

          if (id.includes('/node_modules/') || id.includes('\\node_modules\\')) {
            return 'vendor';
          }

          return undefined;
        },
      },
    },
  },
});