import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas: el build funciona servido desde cualquier subruta (GitHub Pages lo sirve en /anter/).
  base: './',
  server: { port: 5173, strictPort: true },
  build: { target: 'es2022' },
});
