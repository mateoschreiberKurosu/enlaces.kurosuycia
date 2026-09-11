# Kurosu Portal estático

Copia pública estática autocontenida del portal Kurosu, preparada para Cloudflare Workers Static Assets. El contenido fuente vive en `src/`; `dist/` es el único directorio a publicar. Para una revisión rápida sin servidor, abrí `dist/index.html`; cada página incluye Bootstrap, CSS, Poppins, JavaScript, iconos e imágenes locales. Los enlaces internos se abren en la misma pestaña; los externos abren una pestaña nueva con `rel="noopener noreferrer"`.

```powershell
npm install
npm run build
npm run dev
```

Para un build de producción, `PUBLIC_SITE_URL` es obligatorio y genera el sitemap con URLs absolutas. En PowerShell:

```powershell
$env:PRODUCTION_BUILD = '1'
$env:PUBLIC_SITE_URL = 'https://enlaces.kurosuycia.com.py'
npm run build
```

El build local habitual no requiere esas variables. Los assets publicados se generan en `dist/assets/` con nombres fingerprinted y permanecen completamente locales.

Para validar el resultado: `npm run check`.

Para publicar cuando corresponda (no ejecutado en esta conversión):

```powershell
npx wrangler deploy
```

No hay autenticación ni integración Dataverse. Las miniaturas de los videos son locales; el reproductor YouTube diferido se carga únicamente al pulsar Reproducir, con controles móviles completos. YouTube exige un origen HTTP/HTTPS identificable para reproducir iframes: usá `npm run dev` o el despliegue Cloudflare para probarlos; `file://` puede mostrar el error 153 de YouTube.
