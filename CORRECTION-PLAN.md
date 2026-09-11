# Plan de correcciones UX/UI

## Estado inicial

El build genera 10 documentos HTML en `dist/`. `scripts/build.mjs` actualmente lee CSS, JavaScript, fuentes e imágenes y los inserta como data URI o texto inline en cada HTML. Esto permite abrir archivos mediante `file://`, pero duplica recursos y evita reutilización por caché entre rutas.

El pipeline genera rutas desde una lista local, convierte enlaces raíz en rutas relativas por página, escribe `_headers`, `_redirects`, `robots.txt` y `sitemap.xml`. `PUBLIC_SITE_URL` es opcional; si falta, el sitemap queda correctamente formado pero vacío. `scripts/check.mjs` revisa HTML generado, seguridad, enlaces, assets, JS e interacciones, pero no resuelve todos los ID referidos por ARIA ni exige URLs de sitemap.

Base verificada antes de cambios: `npm run check`, `npm run build` y `git diff --check` finalizaron sin errores. El único contenido preexistente sin seguimiento es `.vscode/`; `UX-UI-AUDIT.md` es el informe de entrada.

## Dependencias entre hallazgos

1. A11Y-01 y DOC-01 son independientes y reversibles.
2. IA-01 depende de separar explícitamente la intención local de la publicación: local puede construir sin dominio; producción debe exigirlo.
3. PERF-01 altera la salida generada y sus rutas. Se realiza después de los quick wins, conservando la misma lista de rutas, CSP, comportamiento `file://` donde sea viable y diferimiento de YouTube.
4. Los presupuestos de rendimiento se fijan sólo tras medir la nueva salida.

## Orden de implementación

1. Crear este plan y no cambiar código hasta completarlo.
2. A11Y-01: corregir/eliminar la referencia FAQ y añadir chequeo de referencias ARIA.
3. DOC-01: corregir la frase concreta de README sobre pestañas.
4. IA-01: admitir build local sin URL, exigir `PUBLIC_SITE_URL` con una señal explícita de producción, generar URLs y validar sitemap.
5. PERF-01: emitir assets locales fingerprinted, referenciarlos con rutas relativas, mantener una sola carga de cada tipo y actualizar `_headers`.
6. Medir salida, establecer presupuesto derivado de la medición y ampliar `check`.
7. Ejecutar revisión de seguridad, calidad y navegador; redactar informe final.

## Fase 1 — Quick wins

### A11Y-01

- Problema/causa: la página FAQ asigna `aria-labelledby="faq-title"`, pero el heading producido por el helper `hero()` no recibe ese ID.
- Archivos afectados: `src/templates/pages.mjs`, `scripts/check.mjs`.
- Modificación propuesta: dar `id="faq-title"` al `h1` de FAQ de manera explícita; ampliar `check` para extraer los tokens de `aria-labelledby` y confirmar que existe cada ID en los HTML generados.
- Riesgo: bajo; sólo aumenta la relación semántica que ya pretendía existir.
- Pruebas: build, check, inspección de DOM FAQ y teclado.
- Criterio de aceptación: ninguna referencia `aria-labelledby` sin destino; FAQ conserva acordeón.
- Rollback: revertir los dos cambios; no hay migración de datos.

### DOC-01

- Problema/causa: README conservó el comportamiento anterior de enlaces internos.
- Archivos afectados: `README.md`.
- Modificación propuesta: sustituir sólo la frase incorrecta por la política actual: internos en la misma pestaña; externos en nueva pestaña con `noopener noreferrer`.
- Riesgo: nulo para runtime.
- Pruebas: revisión de texto y `git diff --check`.
- Criterio de aceptación: documentación y código coinciden.
- Rollback: revertir la línea de README.

### IA-01

- Problema/causa: el sitemap se deriva de `PUBLIC_SITE_URL`, pero la ausencia de la variable no es un error.
- Archivos afectados: `scripts/build.mjs`, `scripts/check.mjs`, `README.md`.
- Modificación propuesta: definir `PRODUCTION_BUILD=1` como señal explícita para requerir `PUBLIC_SITE_URL`; en ese modo generar `<url><loc>` para todas las rutas indexables y fallar antes de escribir una salida vacía. Mantener build local sin variable y con sitemap vacío intencional, que el check distinguirá mediante modo producción.
- Riesgo: CI/deploy debe definir dos variables explícitas. No se inventa dominio ni se rompe build local.
- Pruebas: build local; build de producción con URL; build de producción sin URL (debe fallar); check de sitemap no vacío en modo producción.
- Criterio de aceptación: en producción hay una URL por ruta pública indexable y `robots.txt` apunta a `/sitemap.xml`.
- Rollback: omitir `PRODUCTION_BUILD` y revertir los cambios del generador.

## Fase 2 — PERF-01

- Problema/causa: `scripts/build.mjs` serializa repetidamente todos los recursos en cada documento.
- Archivos afectados: `scripts/build.mjs`, `scripts/check.mjs`, `src/templates/layout.mjs`, salida `dist/`, `_headers`, README y documentación final.
- Modificación propuesta:
  1. Copiar CSS concatenado a `dist/assets/css/site.<hash>.css` y JavaScript a `dist/assets/js/site.<hash>.js`.
  2. Copiar fuentes, imágenes, sprite SVG y favicon a directorios locales de assets con nombre fingerprinted cuando aplica.
  3. Reemplazar rutas por rutas relativas al documento (`../...` para páginas anidadas), manteniendo imágenes locales, fuentes locales, SVG `use`, `loading="lazy"` y el iframe diferido de YouTube.
  4. Mantener solamente el pequeño objeto de índice/ruta de búsqueda inline porque varía por página y evita una solicitud adicional sin beneficio.
  5. Aplicar `Cache-Control: public, max-age=31556952, immutable` sólo a `/assets/*` fingerprinted; dejar HTML en la política segura por defecto de Workers (`max-age=0, must-revalidate`).
- Decisión técnica: el patrón de assets con hash y caché immutable está respaldado por la documentación oficial de [Cloudflare Workers Static Assets — Headers](https://developers.cloudflare.com/workers/static-assets/headers/). `_headers` y `_redirects` seguirán dentro de `dist`, compatiblemente con Workers Static Assets.
- Riesgos: errores de prefijo en rutas anidadas, CSP demasiado restrictiva, `file://` y favicon/SVG. Mitigar centralizando el cálculo de prefijo y validándolo en cada HTML/ruta.
- Pruebas: build, check de rutas y tipos de asset, navegador en HTTP para las 10 rutas y prueba puntual `file://` de home/search; CSP/headers por inspección de `dist/_headers` y Workers-compatible dev no server-side.
- Criterio de aceptación: HTML drásticamente menor, assets locales compartidos/fingerprinted, sin recursos remotos previos a interacción, interacciones existentes sin regresión.
- Rollback: volver al build inline anterior en un único commit/reversión; no se modifica contenido ni datos.

## Riesgos

- `file://` no aplica cabeceras HTTP; sólo se usará como comprobación de rutas locales, mientras YouTube seguirá requiriendo HTTP/HTTPS.
- Un cache immutable sobre un asset sin hash serviría contenido viejo; por eso se limita a nombres con hash.
- Cloudflare aplica `_headers` al contenido estático de `dist`; no se añadirá un Worker runtime.
- El sitemap sólo será completo cuando la URL canónica sea conocida; no se insertará un dominio supuesto.

## Estrategia de rollback

- Todos los cambios se limitan a templates, build, checks, documentación y `dist` regenerado.
- El rollback es `git revert` del cambio de correcciones; no requiere datos, DNS, deployment ni modificación de contenido.
- Los assets fingerprinted antiguos desaparecen en la siguiente regeneración limpia de `dist`; no se referencian sin hash.

## Archivos afectados

- `src/templates/pages.mjs`
- `src/templates/layout.mjs`
- `scripts/build.mjs`
- `scripts/check.mjs`
- `README.md`
- `dist/` (generado)
- `CORRECTION-REPORT.md` (nuevo al finalizar)

## Validaciones por fase

| Fase | Validación |
|---|---|
| Quick wins | build local y producción controlada; check ARIA/sitemap; diff check. |
| PERF-01 | rutas relativas, CSP, HTML/asset inventory, presupuesto medido. |
| Navegador | rutas, six viewports, navegación, búsqueda, menú, FAQ, vídeo, foco, consola y red. |
| Final | `npm run check`, build local y producción, `npm audit`, sintaxis, `git diff --check`, revisión de diff. |

## Criterios de aceptación

- FAQ tiene una relación ARIA válida.
- README coincide con el comportamiento actual de enlaces.
- Build de producción sin URL canónica falla; con URL produce sitemap no vacío con rutas públicas.
- CSS, JS, fuentes, imágenes, iconos y favicon se entregan desde archivos locales bajo `dist/assets` con hash cuando corresponde.
- HTML y transferencia repetida se reducen frente a los 4.06 MB / 2.32 MB medidos antes.
- Las rutas, diseño, responsive, YouTube diferido, CSP, headers y enlaces no regresan.
- Check falla ante ARIA inválido, sitemap vacío en producción y una regresión material sobre presupuestos establecidos post-corrección.

## Resultado esperado

Un sitio estático sin dependencias nuevas ni CDN: HTML pequeño y revalidable, assets locales fingerprinted y cacheables, sitemap de producción verificable, FAQ semánticamente correcta y documentación de navegación coherente.
