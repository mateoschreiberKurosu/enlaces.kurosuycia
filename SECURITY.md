# Seguridad de la landing

## Modelo y alcance

El sitio publica HTML, CSS, JavaScript, imágenes y fuentes estáticos. No recibe credenciales ni consultas en un backend, no tiene base de datos y no implementa sesiones. El parámetro de búsqueda es entrada no confiable: se compara con un índice local y se muestran resultados mediante `textContent`.

Las cuentas GitHub/Cloudflare, el proceso de publicación y sus credenciales son límites administrativos. El navegador solo descarga la inicialización, índice y código público; nunca debe recibir secretos. YouTube se carga al solicitar reproducción. Se conserva Cloudflare Insights y no se agregan servicios externos.

## Política del navegador

`scripts/security-policy.mjs` es la fuente de cabeceras para el build y el servidor local. Se genera `dist/_headers` para Workers Static Assets:

- CSP sin `unsafe-inline` ni `unsafe-eval`. Inicialización externa fingerprinted antes del código principal, ambos con `defer`; el prefijo para navegación `file://` es un atributo de datos.
- `upgrade-insecure-requests` complementa HSTS para recursos de la misma navegación que cuenten con equivalente HTTPS; no agrega orígenes, comodines ni sustituye HSTS.
- Estilos locales; los iconos se ocultan mediante CSS externo, no atributos `style`.
- Scripts externos limitados a Cloudflare Insights; conexión a la misma procedencia y `https://cloudflareinsights.com`; marcos limitados a `https://www.youtube-nocookie.com`.
- HSTS `max-age=86400`, sin `includeSubDomains` ni preload. Solo establece política para el hostname visitado. Mantener HTTPS también al restituir el hosting original.
- COOP y CORP `same-origin`; `nosniff`; Referrer-Policy `same-origin`; `SAMEORIGIN` y `frame-ancestors 'self'`; permisos de cámara, micrófono, ubicación y otros deshabilitados.
- HTML revalida; únicamente los assets con fingerprint reciben caché inmutable.
- Se solicita retirar Expect-CT, X-XSS-Protection y la CSP Report-Only desalineada en la capa de assets. Las reglas de Cloudflare que actúen después pueden reintroducirlos; deben revisarse allí si el chequeo público los detecta.

No se habilitan COEP, Integrity-Policy ni CORS permisivo. No hay necesidad funcional de aislamiento completo entre orígenes y se preservan videos y destinos externos. `security.txt` queda pendiente hasta confirmar un contacto de seguridad real; no se inventa una dirección.

## Dependencias y validación

Node 24 (versión fijada en `.nvmrc`), npm 11.19.0 y lockfile versionado. La instalación predeterminada deshabilita scripts. No usar `npm audit fix --force`.

```powershell
npm ci --ignore-scripts
npm run audit:security
npm run build
npm run check
npm test
node node_modules/@playwright/test/cli.js install chromium
npm run test:browser
```

En Windows se puede usar Chrome existente sin instalar otro navegador:

```powershell
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run test:browser
```

La CI utiliza Node y Playwright fijados, acciones por SHA, permisos `contents: read` y ninguna credencial de despliegue. El audit completo incluye dependencias de desarrollo y falla ante avisos altos o críticos. Que el audit no reporte avisos no demuestra ausencia de código malicioso o vulnerabilidades desconocidas.

Las pruebas de navegador comprueban las diez páginas, modos HTTP/file, búsqueda, XSS no persistente, navegación, encabezados, caché y recursos permitidos. Los fixtures remotos de pruebas permiten comprobar CSP sin depender de la disponibilidad de YouTube o analítica desde CI; no certifican esos servicios externos. El servidor local solo escucha en `127.0.0.1` y comprueba rutas canónicas para bloquear escapes y symlinks externos, además de manejar errores de URI/archivos y GET/HEAD/405.

## Publicación y comprobación real

Publicar mediante la integración Git ya existente del Worker. No modificar DNS, nombres de Worker ni Workers Routes. Para revisar los tres dominios después del despliegue:

```powershell
npm run check:production
```

La publicación genera siempre `robots.txt` y las nueve URLs del sitemap con `https://www.kurosu.com.py`; una variable `PUBLIC_SITE_URL` distinta se rechaza antes de escribir `dist/`. El chequeo de producción visita las diez páginas, una ruta 404, robots, sitemap y assets; `npm run check:production -- --json` emite además la matriz con hostname, URL, control, valor esperado, observado y clasificación. Falla por requisitos del repositorio y diferencia una página de bloqueo 403, una falla de red o cabeceras reintroducidas por Cloudflare como advertencias externas, no como aprobación de la landing. Revisar en un navegador real búsqueda, menús, reproducción solicitada y solicitudes de Insights, especialmente si existen reglas de transformación de cabeceras en Cloudflare.

Para revertir código, usar el commit anterior conocido. Revertir o borrar HSTS no elimina políticas ya guardadas en navegadores: para cancelarlas antes de tiempo hay que servir `Strict-Transport-Security: max-age=0` por HTTPS en cada hostname afectado. Si no, mantener HTTPS mientras vence el plazo de un día.

## Hallazgos que no se corrigen desde este repositorio

El JSON Web Check del 30/10/2026 incluye 93 CVE para la IP compartida `172.67.209.173`, pero su módulo de vulnerabilidades identifica a `salvogc.com`; no son 93 hallazgos confirmados de esta landing. Sus tres CVE KEV corresponden a WordPress, que no forma parte de este proyecto. El análisis TLS del mismo archivo obtiene grado A y Lighthouse recibió una página 403. No usar esas métricas para modificar componentes inexistentes o desactivar indiscriminadamente el WAF.

Pendiente de infraestructura: revisar el origen anterior y sus parches con el proveedor antes del retorno; auditar reglas adicionales de cabeceras, WAF y cuentas; evaluar DNSSEC y CAA en la zona correcta. No hay cambios de esas configuraciones en esta implementación.

Referencias: [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src), [cabeceras de Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/headers/), [HSTS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/), [IP compartidas de Cloudflare](https://developers.cloudflare.com/fundamentals/concepts/cloudflare-ip-addresses/).
