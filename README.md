# La Esquina de Maderna — App (Vite + React + TS + Tailwind)
## 1) Instalar dependencias
npm i

## 2) Correr en local
npm run dev
# Abrir la URL que aparece (ej: http://localhost:5173)

## 3) Publicar en GitHub Pages (auto)
- Crear repo en GitHub (por ej. maderna-app)
- Subir todo el proyecto
- En Settings → Pages → elegir "GitHub Actions"
- Hacer commit en main → se publica automático a Pages

> Si el repo se llama distinto, ajustá `base` en vite.config.ts o dejá el env `GITHUB_PAGES=true` como viene.
