import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    globals: true,
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    projects: [
      {
        // Server-side: API routes, server actions, lib utilities
        test: {
          name: 'server',
          environment: 'node',
          globals: true,
          include: [
            'src/app/api/**/*.{test,spec}.{ts,tsx}',
            'src/lib/**/*.{test,spec}.{ts,tsx}',
            'src/server/**/*.{test,spec}.{ts,tsx}',
          ],
          exclude: ['e2e/**', 'node_modules/**'],
        },
        resolve: {
          alias: {
            '@': resolve(__dirname, 'src'),
          },
        },
      },
      {
        // Client-side: React components, hooks, pages
        plugins: [react()],
        test: {
          name: 'client',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./vitest.setup.ts'],
          include: [
            'src/components/**/*.{test,spec}.{ts,tsx}',
            'src/hooks/**/*.{test,spec}.{ts,tsx}',
            'src/app/**/(!api)/**/*.{test,spec}.{ts,tsx}',
          ],
          exclude: ['e2e/**', 'node_modules/**'],
        },
        resolve: {
          alias: {
            '@': resolve(__dirname, 'src'),
          },
        },
      },
    ],
  },
});
