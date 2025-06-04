import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/*.ts', '!src//*.test.ts'],
  publicDir: false,
  clean: true,
  minify: true,
  format: ['cjs'], // 👈 Node
})
