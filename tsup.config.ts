import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/*.ts', '!src//*.test.ts'],
  publicDir: false,
  clean: true,
  dts: true, // 👈 TypeScript declaration files
  minify: true,
  tsconfig: 'tsconfig.json',
  format: ['cjs', 'esm'], // 👈 Node
})
