import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        strictPort: true,
        hmr: {
            timeout: 5000
        },
        proxy: {
            '/auth': {
                target: 'http://localhost:3003',
                changeOrigin: true,
                secure: false
            },
            '/api': {
                target: 'http://localhost:3003',
                changeOrigin: true,
                secure: false
            }
        }
    },
    optimizeDeps: {
        include: [
            '@mui/material',
            '@mui/material/styles',
            '@emotion/react',
            '@emotion/styled'
        ],
        force: true
    },
    build: {
        sourcemap: true,
        commonjsOptions: {
            transformMixedEsModules: true
        }
    }
});
