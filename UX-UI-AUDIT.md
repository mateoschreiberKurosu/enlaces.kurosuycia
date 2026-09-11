# Auditoría UX/UI

Fecha: 11 de septiembre de 2026  
Estado: análisis del código y ejecución local. No se modificaron archivos de la aplicación durante la auditoría.

## 1. Resumen ejecutivo

El sitio tiene una base sólida para un portal estático: navegación consistente, jerarquía clara, componentes reutilizados, foco visible en los controles principales, búsqueda instantánea, navegación por teclado y un comportamiento responsive comprobado sin desplazamiento horizontal en los tamaños solicitados. Todas las rutas públicas previstas respondieron y los vídeos se reprodujeron dentro de sus tarjetas mediante iframe diferido.

La principal oportunidad es el coste de carga: el build inserta CSS, fuentes, imágenes, iconos y JavaScript dentro de cada HTML. Esto convierte la página de inicio en una transferencia local de 4.06 MB y cada página secundaria en aproximadamente 2.32 MB, además de impedir el caché compartido entre rutas. También hay dos defectos menores y concretos: el sitemap publicado está vacío si no se define una variable de entorno y la sección FAQ referencia un identificador ARIA que no existe.

Resultado: no hay hallazgos críticos ni P0. Priorizar la separación de assets locales con caché antes de ampliar contenido o efectos visuales.

## 2. Alcance y metodología

- Revisión dirigida de `package.json`, `README.md`, `wrangler.jsonc`, build, comprobaciones, plantillas, datos, CSS y JavaScript de interacción.
- Ejecución local con `npm run dev` en `http://127.0.0.1:8788`.
- Prueba real con Playwright de las 10 rutas publicadas, navegación, búsqueda, FAQ, vídeo, menú móvil, menú “Más”, clic exterior, Escape y teclado.
- Matriz responsive: 360×800, 390×844, 768×1024, 1366×768, 1440×900 y 1920×1080. Como comprobación adicional de reflow se revisaron tres rutas a 320 px.
- Auditoría estructural de idioma, `main`, `h1`, alternativas de imagen, etiquetas de inputs, botones sin nombre, ARIA, enlaces externos y cabeceras.
- Revisión de consola y solicitudes de red desde el navegador local. Las respuestas de terceros de YouTube se evaluaron sólo tras activar un vídeo.

Las pruebas no sustituyen una auditoría WCAG completa con usuarios, lector de pantalla, zoom del navegador, dispositivos físicos, medición con red móvil ni pruebas del entorno Cloudflare de producción.

## 3. Estado general

| Área | Puntuación | Cómo se obtuvo |
|---|---:|---|
| UX | 81/100 | Flujos directos, etiquetas claras, búsqueda y cierres de menú verificados; se descuenta por la penalización de carga inicial. |
| UI | 86/100 | Sistema visual coherente, Poppins local, tarjetas y acciones uniformes; no se identificaron cortes en la matriz visual. |
| Responsive | 91/100 | 60 comprobaciones de ruta/viewport (incluidas home) sin `scrollWidth > clientWidth`; cards y búsqueda se adaptan. |
| Accesibilidad | 82/100 | Estructura, labels, alt, teclado, foco y tamaños táctiles básicos verificados; existe una referencia ARIA rota y quedan pruebas manuales de medios/lector de pantalla. |
| Consistencia | 87/100 | Header, footer, navegación y CTA son compartidos por plantilla; README no describe el comportamiento actual de enlaces internos. |
| Performance percibida | 63/100 | La ejecución localhost fue rápida, pero la transferencia inicial y repetida de HTML inlined es alta para móvil. No se midieron Core Web Vitals en red representativa. |

Las puntuaciones son una priorización de producto, no una certificación ni una métrica de laboratorio.

## 4. Hallazgos críticos

No se identificaron hallazgos críticos ni prioridades P0 en la revisión realizada.

## 5. Hallazgos por prioridad

### P1

- **PERF-01 — Confirmado.** Cada HTML incluye assets que podrían reutilizarse; afecta especialmente el primer acceso y el cambio entre páginas en red móvil.

### P2

- **IA-01 — Confirmado.** El sitemap publicado no contiene URLs si el build no recibe `PUBLIC_SITE_URL`.

### P3

- **A11Y-01 — Confirmado.** FAQ tiene un `aria-labelledby` que apunta a un ID inexistente.
- **DOC-01 — Confirmado.** README conserva la afirmación contraria al comportamiento actual de enlaces internos.

### Fichas de hallazgo

**PERF-01 — assets inlined repetidos**

- Página/componente: todas las páginas; pipeline de build.
- Categoría e impacto: Performance percibida, UX y calidad frontend.
- Problema y evidencia: `scripts/build.mjs` transforma fuentes e imágenes a data URI y los inserta junto con CSS/JS en cada documento. Medición local: home 4,055,843 bytes en disco / 4,056,143 bytes transferidos; secundarias 2,321,357–2,323,447 bytes. No hubo recursos reutilizables en la navegación de home.
- Impacto para la persona usuaria: mayor espera, consumo de datos y repetición de descarga al cambiar entre vistas, especialmente en móvil.
- Severidad/prioridad/esfuerzo: Alto / P1 / Medio.
- Recomendación concreta: emitir assets locales con nombre versionado en `dist/assets`, enlazarlos desde el HTML, aplicar caché largo a esos assets y establecer un presupuesto de transferencia.
- Archivos relacionados: `scripts/build.mjs`, `src/assets/source/*`, `src/assets/images/*`, HTML generado en `dist/`.
- Referencia: [Web Vitals](https://web.dev/articles/vitals) para medir la experiencia real después del cambio. La magnitud indicada es evidencia local, no una puntuación CWV.

**IA-01 — sitemap sin URLs**

- Página/componente: descubribilidad global y build de producción.
- Categoría e impacto: Arquitectura de información, findability y calidad de despliegue.
- Problema y evidencia: `dist/sitemap.xml` contiene sólo `urlset`; `scripts/build.mjs` deja las URLs vacías cuando falta `PUBLIC_SITE_URL`, mientras `robots.txt` lo anuncia.
- Impacto para la persona usuaria: no rompe la navegación directa, pero reduce la capacidad de que buscadores descubran rutas públicas y, por extensión, que lleguen a ellas desde resultados.
- Severidad/prioridad/esfuerzo: Medio / P2 / Bajo.
- Recomendación concreta: fijar la URL canónica en CI/Workers y convertir un sitemap vacío en error de build para producción.
- Archivos relacionados: `scripts/build.mjs`, `dist/sitemap.xml`, `dist/robots.txt`, `README.md`.
- Referencia: [Sitemaps XML protocol](https://www.sitemaps.org/protocol.html), que requiere una entrada `url` y `loc` por URL incluida.

**A11Y-01 — relación ARIA rota en FAQ**

- Página/componente: `/preguntas-frecuentes/`, sección de preguntas.
- Categoría e impacto: Accesibilidad y semántica HTML.
- Problema y evidencia: el DOM resultante incluye `aria-labelledby="faq-title"`; Playwright confirmó que `document.getElementById('faq-title')` devuelve nulo.
- Impacto para la persona usuaria: una relación programática anunciada no se resuelve; complica el mantenimiento y puede reducir contexto para tecnologías asistivas.
- Severidad/prioridad/esfuerzo: Bajo / P3 / Bajo.
- Recomendación concreta: asignar `id="faq-title"` al heading correspondiente o quitar `aria-labelledby` si la sección no necesita nombre accesible.
- Archivos relacionados: `src/templates/pages.mjs`, `scripts/check.mjs`.
- Referencia: [WCAG 2.2 — Info and Relationships (1.3.1)](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html).

**DOC-01 — documentación de navegación desactualizada**

- Página/componente: instrucciones de operación y QA.
- Categoría e impacto: Consistencia y calidad frontend.
- Problema y evidencia: README dice que las vistas internas se abren en nuevas pestañas; las plantillas no añaden `target` a enlaces internos y la prueba abrió `/soporte-tecnico/` en la pestaña actual.
- Impacto para la persona usuaria: indirecto; aumenta la posibilidad de regresión por una expectativa operativa equivocada.
- Severidad/prioridad/esfuerzo: Bajo / P3 / Bajo.
- Recomendación concreta: documentar explícitamente “internos: misma pestaña; externos: nueva pestaña con `noopener noreferrer`”.
- Archivos relacionados: `README.md`, `src/templates/layout.mjs`, `src/templates/pages.mjs`, `scripts/check.mjs`.
- Referencia: [WCAG 2.2 — Consistent Navigation (3.2.3)](https://www.w3.org/WAI/WCAG22/quickref/#consistent-navigation).

## 6. Arquitectura de información

La profundidad es baja: inicio dirige a contacto, productos, soporte y promociones; “Más” contiene Sobre nosotros y FAQ. El patrón se conserva entre páginas y las etiquetas describen adecuadamente su destino. Los accesos oficiales externos y WhatsApp están diferenciados mediante apertura en nueva pestaña; las rutas internas navegan en la pestaña actual.

El buscador cubre productos, soporte y contacto desde el header y desde `/busqueda/`; en la prueba “soporte” mostró una coincidencia y llevó a `/soporte-tecnico/` en la misma pestaña. El sitemap vacío limita la encontrabilidad desde rastreadores, no la navegación humana desde el menú.

## 7. Navegación y flujos

Confirmado en navegador:

- El menú móvil informa `aria-expanded`, abre y se cierra con clic exterior.
- “Más” se cierra con Escape y con clic exterior.
- Al buscar en móvil, input y botón de 48 px permanecieron en la misma fila (264 px + 48 px a 390 px de viewport).
- El skip link recibe foco, lleva el foco a `mainContent` y evita recorrer la navegación.
- Los tres vídeos sustituyen su póster por iframe `youtube-nocookie` con `controls=1` y `playsinline=1` después de la interacción.

No se encontró una ruta rota entre las 10 rutas auditadas. Los formularios de búsqueda no envían datos al servidor; su estado vacío intencional no muestra resultados cuando no hay coincidencias. Si se decide cambiar esa política, validar que un mensaje de “sin resultados” no contradiga el requisito de producto actual.

## 8. Diseño visual

La jerarquía se sostiene con un hero de marca, títulos de sección, cards y CTA de alto contraste. La paleta está centralizada en variables; como muestra, los pares principales calculados (`#19231d`/blanco, `#66736a`/blanco, blanco/`#102f22`, amarillo/verde) dan 16.16:1, 4.97:1, 14.47:1 y 7.61:1 respectivamente. Es una muestra de tokens, no una medición exhaustiva sobre fotos ni una declaración de conformidad.

Los componentes de navegación, tarjetas, iconos y footer se generan desde plantillas compartidas. No se detectaron variaciones visuales de header/footer entre las rutas auditadas.

## 9. Responsive

| Viewport | Resultado confirmado |
|---|---|
| 360×800 | Sin margen de body ni overflow horizontal; menú móvil y una tarjeta de vídeo por fila. |
| 390×844 | Búsqueda móvil en una fila; controles táctiles inspeccionados sin elementos visibles menores de 44 px. |
| 768×1024 | Menú colapsable; vídeo en tres columnas sin overflow. |
| 1366×768 | Navegación desktop; tres vídeos por fila. |
| 1440×900 | Navegación desktop estable; no se detectó scroll horizontal. |
| 1920×1080 | Contenedor máximo consistente y sin desbordamiento horizontal. |

Además, `/`, `/busqueda/` y `/preguntas-frecuentes/` se revisaron a 320 px sin desbordamiento. En total, se evaluaron 54 combinaciones adicionales de ruta/viewport no-home sin problemas de ancho, footer inválido ni más de un elemento activo en el menú.

## 10. Accesibilidad

Aspectos confirmados:

- `lang="es"`, un `main` y un `h1` por cada una de las 10 rutas.
- No se detectaron imágenes sin atributo `alt`, botones sin nombre accesible ni enlaces externos sin `target="_blank"` y `rel="noopener noreferrer"`.
- Los dos inputs de la ruta de búsqueda tienen label asociado; sus resultados usan `aria-live="polite"`.
- El skip link, controles de navegación, Escape y foco visible fueron probados por teclado. Los controles interactivos visibles inspeccionados en la home cumplen al menos 44 px en su dimensión menor.
- La preferencia `prefers-reduced-motion` reduce transiciones de la home.

**A11Y-01 (confirmado):** la sección FAQ usa `aria-labelledby="faq-title"`, pero no existe `id="faq-title"`. No se debe asumir que sea una región nombrada; la relación ARIA simplemente queda rota. Corregir añadiendo el ID al heading que la nombra o eliminando el atributo si la sección no necesita nombre accesible.

Requiere prueba manual antes de afirmar AA completo: lectura con NVDA/VoiceOver, orden de foco de todas las cards, zoom 200/400 %, contraste de texto sobre fotografía, subtítulos y audiodescripción reales de cada vídeo alojado por YouTube.

## 11. Performance y experiencia percibida

**PERF-01 (confirmado, Alto/P1):** `scripts/build.mjs` convierte fuentes e imágenes locales en data URIs e inserta Bootstrap, CSS, iconos y JS en cada documento. En Playwright local, la navegación de la home transfirió 4,056,143 bytes y no generó requests de recursos reutilizables; los HTML secundarios en `dist` pesan entre 2,321,357 y 2,323,447 bytes. La home pesa 4,055,843 bytes en disco.

El diferimiento de YouTube sí es positivo: no se cargó el player hasta hacer clic; una vez activado, las solicitudes del player devolvieron 200/204. La localización hace que los resultados de timing (DCL 173 ms y load 180 ms en localhost) no representen una conexión móvil ni un CDN comprimido.

Recomendación: publicar CSS, fuentes, imágenes, iconos y JS como archivos locales versionados en `dist/assets`, enlazarlos en HTML y aplicar cache largo a los assets con hash. Mantiene el requisito “todo local”, reduce el HTML y permite reutilización al navegar. Medir después LCP/INP/CLS con throttling representativo.

## 12. Consistencia del sistema de diseño

El sistema usa tokens de color, radio y sombras, Poppins local, componentes compartidos (`layout.mjs`) y datos centralizados (`site.mjs`). Las acciones internas y externas comparten patrones visuales, y los iconos SVG se centralizan.

**DOC-01 (confirmado, Bajo/P3):** README afirma que las vistas internas se abren en pestañas nuevas, mientras que build y pruebas actuales navegan rutas internas en la misma pestaña. Actualizar la documentación para evitar que mantenimiento, QA o futuras correcciones reintroduzcan el comportamiento anterior.

## 13. Calidad de implementación frontend

Fortalezas:

- HTML estático, JavaScript vanilla y build pequeño; sin framework innecesario.
- La búsqueda construye resultados con nodos DOM y `textContent`, no con `innerHTML`.
- CSP, `nosniff`, `SAMEORIGIN`, referrer policy y Permissions-Policy están generados en `_headers`.
- `npm run check` valida rutas, recursos locales, aislamiento de enlaces externos, sintaxis JS e interacciones esperadas.

Deuda que influye en UX:

- El build concentra demasiada responsabilidad de empaquetado inline en `scripts/build.mjs`.
- La generación de sitemap permite silenciosamente un sitemap válido pero vacío.
- La relación ARIA de FAQ no tiene una prueba estática dedicada.

## 14. Tabla completa de hallazgos

| ID | Área | Hallazgo | Severidad | Prioridad | Esfuerzo | Recomendación |
|---|---|---|---|---|---|---|
| PERF-01 | Performance / todas las páginas | CSS, fuentes, imágenes, iconos y JS se repiten como data URIs dentro de cada HTML; home 4.06 MB y secundarias ~2.32 MB. Confirmado. | Alto | P1 | Medio | Extraer assets locales versionados, referenciarlos y cachearlos; volver a medir en red móvil. |
| IA-01 | Descubribilidad / build | `dist/sitemap.xml` está vacío cuando `PUBLIC_SITE_URL` no se define. Confirmado. | Medio | P2 | Bajo | Definir el dominio de producción en build/CI y fallar el build si el sitemap queda sin `<url><loc>`. |
| A11Y-01 | FAQ | `aria-labelledby="faq-title"` no resuelve a ningún elemento. Confirmado. | Bajo | P3 | Bajo | Añadir el ID correcto al heading o eliminar la relación ARIA innecesaria. |
| DOC-01 | Documentación / mantenimiento | README declara que enlaces internos abren otra pestaña; el sitio actual navega en la misma. Confirmado. | Bajo | P3 | Bajo | Actualizar README y dejar explícita la diferencia entre enlaces internos y externos. |

## 15. Quick wins

1. Corregir `faq-title` y añadir una comprobación estática para IDs ARIA referenciados.
2. Hacer obligatorio `PUBLIC_SITE_URL` en el comando de build de producción y comprobar que sitemap contiene las rutas públicas.
3. Corregir la frase de README sobre pestañas internas.
4. Conservar el diferimiento de YouTube al extraer assets; es una optimización ya efectiva.

## 16. Mejoras estructurales

- Separar el empaquetado de contenido de la estrategia de entrega: templates generan HTML y el build copia/hashea assets locales compartidos.
- Añadir una prueba de tamaño por página y un presupuesto de transferencia para home.
- Añadir chequeos de referencias ARIA, sitemap no vacío y comportamiento interno/externo documentado.
- Ejecutar auditoría manual asistida con lector de pantalla y dispositivos reales antes de etiquetar WCAG AA.

## 17. Roadmap recomendado

### Inmediato

- Resolver A11Y-01 y DOC-01.
- Configurar `PUBLIC_SITE_URL` en el pipeline de producción y validar el sitemap.

### Corto plazo

- Resolver PERF-01 conservando todos los recursos locales.
- Definir cabeceras de caché para assets con hash y medir el resultado con una red móvil simulada.

### Medio plazo

- Prueba manual de captions/audiodescripción en los tres vídeos, lector de pantalla, zoom y navegación completa sin mouse.
- Establecer presupuesto de rendimiento y revisión visual automatizada por viewport en CI.

## 18. Conclusión

El portal es funcional, coherente y responsive en las rutas y escenarios probados. Su principal riesgo de experiencia no es una rotura visual actual, sino la transferencia de HTML excesivamente grande y no reutilizable. Atender PERF-01 mejorará de forma material la experiencia en móviles sin cambiar identidad, contenido ni navegación.

No se declara conformidad WCAG 2.2 AA completa: las comprobaciones automáticas y de navegador cubren una parte del estándar; siguen pendientes pruebas manuales de tecnologías asistivas, contenido de vídeo y condiciones reales de producción.

## 19. Evidencias técnicas

- **Servidor:** `npm run dev`, `http://127.0.0.1:8788`.
- **Rutas:** `/`, `/contacto/`, `/enlaces-de-productos/`, `/soporte-tecnico/`, `/promociones/`, `/preguntas-frecuentes/`, `/sobre-nosotros/`, `/busqueda/`, `/acceso-denegado/` y `/404.html` respondieron 200 en el servidor local y tuvieron `main` y título.
- **Consola local:** 0 errores y 0 warnings al finalizar la prueba. No hubo requests fallidos; el reproductor YouTube activado respondió 200/204.
- **Responsive:** 54 combinaciones de rutas secundarias y los seis viewports solicitados, más home en los seis, sin `scrollWidth > clientWidth`. A 390 px búsqueda: input 264 px, botón 48 px, misma fila.
- **Interacciones:** menú móvil y “Más” actualizan `aria-expanded`; clic exterior y Escape los cierran. Búsqueda con “soporte” muestra una coincidencia y navega en la pestaña actual. FAQ abre un detalle. Vídeo crea iframe con controles móviles.
- **Accesibilidad estructural:** 10/10 con `lang=es`, 1 `main`, 1 `h1`, 0 imágenes sin `alt`, 0 botones sin nombre y 0 enlaces externos sin aislamiento seguro. Única referencia ARIA inválida: FAQ.
- **Código relacionado:** `scripts/build.mjs`, `scripts/check.mjs`, `src/templates/layout.mjs`, `src/templates/pages.mjs`, `src/assets/site.js`, `src/assets/overrides.css`, `src/assets/source/kurosu-ui.css`, `src/assets/source/home.css`, `dist/sitemap.xml`, `README.md`.
- **Calidad:** `npm run check` pasó (10 HTML, cabeceras, assets e interacciones); `npm audit --omit=dev --audit-level=high` informó 0 vulnerabilidades; `git diff --check` no produjo salida. Antes de crear este informe el único elemento sin seguimiento era `.vscode/`.

## 20. Fuentes y estándares consultados

- [W3C — WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/): criterios de alternativas textuales, reflow, teclado, foco visible, orden de foco, propósito de enlace, headings/labels, mensajes de estado y Name/Role/Value.
- [W3C — Understanding SC 1.3.1: Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html): semántica y relaciones programáticas.
- [W3C — Understanding SC 1.4.10: Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): reflow sin pérdida de información o funcionalidad.
- [W3C — Understanding SC 2.4.11: Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html): foco y contenido persistente.
- [W3C — Understanding SC 2.5.8: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): objetivo táctil mínimo.
- [W3C — Understanding SC 1.2.2: Captions (Prerecorded)](https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html): verificación manual pendiente para los vídeos de terceros.
- [Sitemaps.org — Sitemap XML protocol](https://www.sitemaps.org/protocol.html): una entrada `url` y su `loc` por URL incluida.
- Guía local `ui-ux-pro-max`: foco visible, objetivo táctil, reflow y ausencia de scroll horizontal se usaron como criterios de revisión complementarios; las fuentes W3C anteriores prevalecen para WCAG.
