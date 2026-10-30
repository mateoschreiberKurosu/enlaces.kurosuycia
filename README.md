# Kurosu Portal estático

Copia pública estática autocontenida del portal Kurosu, preparada para Cloudflare Workers Static Assets. El contenido fuente vive en `src/`; `dist/` es el único directorio a publicar. Para una revisión rápida sin servidor, abrí `dist/index.html`; cada página incluye Bootstrap, CSS, JD Sans Pro, Poppins como respaldo, JavaScript, iconos e imágenes locales. Los enlaces internos se abren en la misma pestaña; los externos abren una pestaña nueva con `rel="noopener noreferrer"`.

```powershell
npm ci --ignore-scripts
npm run build
npm run dev
```

Todos los builds generan `robots.txt` y sitemap con `https://www.kurosu.com.py`. `PUBLIC_SITE_URL` es opcional por compatibilidad; si se define, debe usar exactamente ese origen (se acepta una barra final). En PowerShell:

```powershell
$env:PUBLIC_SITE_URL = 'https://www.kurosu.com.py'
npm run build
```

El build local habitual no requiere esas variables. Los assets publicados se generan en `dist/assets/` con nombres fingerprinted y permanecen completamente locales.

Para validar el resultado: `npm run check`.

El proyecto usa Node 24 y npm 11.19.0; `.nvmrc`, `.npmrc` y el lockfile fijan el entorno y deshabilitan scripts de instalación. Antes de publicar, ejecutar `npm run audit:security`, `npm test` y `npm run test:browser`. La guía [SECURITY.md](SECURITY.md) explica la política CSP/HSTS, las pruebas y la reversión. La integración Git existente mantiene la publicación; no se requiere cambiar DNS ni rutas.

Para publicar cuando corresponda (no ejecutado en esta conversión):

```powershell
npx wrangler deploy
```

No hay autenticación ni integración Dataverse. Las miniaturas de los videos son locales; el reproductor YouTube diferido se carga únicamente al pulsar Reproducir, con controles móviles completos. YouTube exige un origen HTTP/HTTPS identificable para reproducir iframes: usá `npm run dev` o el despliegue Cloudflare para probarlos; `file://` puede mostrar el error 153 de YouTube.
