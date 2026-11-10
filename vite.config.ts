import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas: el mismo build sirve en la raíz y bajo /anter/ en GitHub Pages.
  base: './',
  server: { port: 5173, strictPort: true },
  build: { target: 'es2022' },
});
