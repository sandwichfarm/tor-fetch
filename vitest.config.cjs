import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    mockReset: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
    }
  },
  resolve: {
    alias: {
      axios: require.resolve('axios'),
      net: require.resolve('net'),
    },
  },
});