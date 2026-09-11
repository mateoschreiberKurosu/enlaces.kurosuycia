# Kurosu Portal estático

Copia pública estática autocontenida del portal Kurosu, preparada para Cloudflare Workers Static Assets. El contenido fuente vive en `src/`; `dist/` es el único directorio a publicar. Para una revisión rápida sin servidor, abrí `dist/index.html`; cada página incluye Bootstrap, CSS, Poppins, JavaScript, iconos e imágenes locales. Las vistas internas se abren en pestañas nuevas mediante enlaces explícitos a sus respectivos `index.html`.

```powershell
npm install
npm run build
npm run dev
```

Si se conoce el dominio final, generá URLs absolutas de sitemap con `PUBLIC_SITE_URL` antes del build, por ejemplo: `$env:PUBLIC_SITE_URL = 'https://portal.ejemplo.py'; npm run build`.

Para validar el resultado: `npm run check`.

Para publicar cuando corresponda (no ejecutado en esta conversión):

```powershell
npx wrangler deploy
```

No hay autenticación ni integración Dataverse. Las miniaturas de los videos son locales; el reproductor YouTube diferido se carga únicamente al pulsar Reproducir, con controles móviles completos. YouTube exige un origen HTTP/HTTPS identificable para reproducir iframes: usá `npm run dev` o el despliegue Cloudflare para probarlos; `file://` puede mostrar el error 153 de YouTube.
