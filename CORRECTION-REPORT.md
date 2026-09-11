# Informe de correcciones UX/UI

Fecha: 11 de septiembre de 2026  
Estado: correcciones implementadas y validadas localmente. No se realizó commit, push ni despliegue.

## 1. Resumen ejecutivo

Se resolvieron los cuatro hallazgos confirmados de `UX-UI-AUDIT.md`. El build ahora publica recursos pesados locales y reutilizables en `dist/assets` con hash; el HTML dejó de transportar CSS, JavaScript, fuentes e imágenes como datos embebidos. El sitemap de producción exige una URL pública, la relación ARIA de FAQ es válida y el README refleja la navegación real.

El sprite de iconos se conserva como SVG pequeño dentro de cada HTML. Es una excepción deliberada: Chromium bloquea referencias `<use>` a un SVG externo al abrir directamente con `file://`, mientras el sprite interno funciona sin red ni errores. CSS, JS, fuentes e imágenes siguen externos, locales y cacheables.

## 2. Hallazgos tratados

| Hallazgo | Estado | Evidencia | Validación |
|---|---|---|---|
| PERF-01 | Resuelto | Recursos compartidos en `dist/assets`; HTML sin data URI de CSS, JS, fuentes o imágenes. | Build, presupuesto, navegador HTTP y `file://`. |
| IA-01 | Resuelto | Producción requiere `PUBLIC_SITE_URL`; sitemap final contiene 9 URLs canónicas. | Build de producción y `npm run check`. |
| A11Y-01 | Resuelto | El heading FAQ tiene `id="faq-title"`. | Comprobación automática de cada `aria-labelledby`. |
| DOC-01 | Resuelto | README diferencia internos en misma pestaña y externos aislados. | Revisión dirigida de README y chequeo de enlaces. |

## 3. Cambios realizados

- El build copia fuentes, estilos, JavaScript e imágenes usadas a `dist/assets/{fonts,css,js,images}` con SHA-256 truncado de 12 caracteres.
- Las plantillas generan referencias relativas correctas para `/`, rutas anidadas y `file://`.
- `_headers` mantiene CSP y cabeceras de seguridad, y agrega caché `public, max-age=31556952, immutable` únicamente para `/assets/*` versionados.
- `PRODUCTION_BUILD=1` sin `PUBLIC_SITE_URL` falla antes de generar una salida incompleta; con `https://enlaces.kurosuycia.com.py` genera las 9 URLs de `sitemap.xml` y `robots.txt` apunta al mismo sitemap.
- Se añadieron controles de assets fingerprinted, presupuesto de tamaño, sitemap de producción, referencias ARIA, rutas locales, enlaces externos y ausencia de renderizado inseguro de búsqueda.
- FAQ usa el identificador real `faq-title`; README documenta la política actual de pestañas.

## 4. Archivos modificados

- `scripts/build.mjs`
- `scripts/check.mjs`
- `src/templates/layout.mjs`
- `src/templates/pages.mjs`
- `README.md`
- `dist/` y sus assets generados
- `CORRECTION-PLAN.md`
- Este informe

## 5. Métricas antes/después

| Métrica | Antes (auditoría) | Después (medido) | Cambio |
|---|---:|---:|---:|
| HTML de inicio | 4,055,843 B | 18,317 B | -4,037,526 B (-99.55%) |
| HTML secundario máximo | 2,323,447 B | 11,267 B | -2,312,180 B (-99.52%) |
| Assets reutilizables | prácticamente inexistentes | 17 locales, fingerprinted | disponibles para caché entre rutas |
| Bytes totales de assets | no aplicaba: iban repetidos en HTML | 2,613,317 B | medido como bundle compartido |
| Solicitudes de assets de home desktop | no medido en el estado anterior | 15 solicitudes locales 200 en captura de Playwright | CSS, JS, fuentes e imágenes locales |

El presupuesto automatizado se tomó después de medir: home 23,000 B, secundaria 14,500 B, assets 3,300,000 B y 24 archivos. Deja margen para cambios menores, pero falla ante regresiones significativas.

## 6. Resultados de validación

- Build de producción: `PRODUCTION_BUILD=1`, `PUBLIC_SITE_URL=https://enlaces.kurosuycia.com.py`, correcto.
- `npm run check`: correcto; 10 HTML, 17 assets fingerprinted, cabeceras, presupuestos e interacciones estáticas.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades.
- `git diff --check`: sin errores de whitespace.
- Prueba negativa: el build de producción sin `PUBLIC_SITE_URL` falló como se espera.
- Prueba local `file://`: home y búsqueda cargan stylesheet, iconos y no tienen overflow; tras corregir el sprite, consola con 0 errores.

## 7. Responsive

Playwright comprobó la home en 360×800, 390×844, 768×1024, 1366×768, 1440×900 y 1920×1080; no hubo scroll horizontal y `body` tuvo margen 0. Las 10 rutas devolvieron 200 por HTTP local, cada una con un `main`, un `h1`, CSS y JavaScript externos.

En 390 px se confirmó: menú móvil abre y se cierra con clic exterior, “Más” cambia de `aria-expanded=true` a `false` con Escape, y la búsqueda conserva input y botón en la misma fila (263.6 px y 48 px). Elegir “soporte” navega a `/soporte-tecnico/` en la pestaña actual.

## 8. Accesibilidad

- La primera tabulación enfoca “Saltar al contenido” con outline sólido de 2.4 px; Enter mueve el foco a `mainContent`.
- FAQ abre mediante `details/summary`; el `aria-labelledby="faq-title"` ahora resuelve.
- La búsqueda sigue creando resultados con nodos DOM y `textContent`, no con `innerHTML`.
- Los controles de navegación conservan estado ARIA y el reproductor diferido usa iframe `youtube-nocookie` con `controls=1` y `playsinline=1`.

## 9. Performance

Los recursos mayores dejan de repetirse por ruta y Cloudflare puede reutilizarlos por nombre inmutable. Los documentos HTML quedan con contenido, configuración de búsqueda por ruta y el pequeño sprite local requerido por `file://`; no contienen fuentes, imágenes, CSS ni JavaScript como data URI.

Se conservó el diferimiento de YouTube: no se crea el iframe hasta activar una tarjeta. La prueba creó un iframe dentro de la tarjeta con la URL `youtube-nocookie` esperada.

## 10. Seguridad

- CSP, `Permissions-Policy`, `nosniff`, `SAMEORIGIN` y política de referrer se validan en `_headers`.
- CSP limita scripts a origen propio y Cloudflare Analytics autorizado; los iframes quedan limitados a YouTube nocookie.
- Los enlaces externos mantienen `target="_blank"` y `rel="noopener noreferrer"`; los internos no fuerzan una nueva pestaña.
- Los paths generados son locales, no hay recursos HTTP(S) de aplicación embebidos y el chequeo rechaza data URI de recursos pesados y `innerHTML` en la búsqueda.

La cabecera `_headers` se comprobó como archivo estático compatible con Workers. La aplicación local de dichas cabeceras debe confirmarse una vez en el entorno Cloudflare, pues el servidor de desarrollo no interpreta `_headers`.

## 11. Riesgos pendientes

- Los bytes de las imágenes originales no se recodificaron para no alterar la identidad ni la calidad aprobada. El bundle compartido actual mide 2.61 MB; una futura optimización de imágenes requiere revisión visual separada.
- La validación de headers en una respuesta real de Cloudflare sigue pendiente de un despliegue autorizado.

## 12. Pruebas manuales todavía necesarias

- Lector de pantalla (NVDA o VoiceOver), zoom de 200/400 % y dispositivos físicos.
- Subtítulos, audiodescripción y controles de los vídeos alojados por YouTube.
- Medición de Core Web Vitals con red móvil y caché de Cloudflare en producción.

## 13. Conclusión

Los hallazgos auditados quedan corregidos sin rediseño ni dependencias nuevas. `dist` continúa siendo un sitio estático publicable por Cloudflare Workers Static Assets y también puede inspeccionarse directamente desde archivos locales. Las comprobaciones automatizadas impiden que vuelvan el sitemap vacío en producción, la referencia ARIA rota, el inline masivo de recursos o una regresión importante de tamaño.
