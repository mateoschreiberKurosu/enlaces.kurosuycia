import { site } from "../data/site.mjs";

export const external = ' target="_blank" rel="noopener noreferrer"';
export const icon = (name) => `<svg class="ks-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#${name}"></use></svg>`;
export const whatsappIcon = () => `<svg class="ks-whatsapp-icon" viewBox="0 0 448 512" aria-hidden="true"><use href="#whatsapp"></use></svg>`;

function header(active) {
  const nav = site.navigation.map(([name, href]) => `<li${href === active ? ' class="active"' : ""}><a href="${href}">${name}</a></li>`).join("");
  const more = site.more.map(([name, href]) => `<li><a href="${href}">${name}</a></li>`).join("");
  return `<header class="navbar navbar-inverse navbar-static-top ks-site-header" role="banner">
  <a class="skip-link" href="#mainContent">Saltar al contenido</a>
  <div class="container ks-shell-container"><div class="navbar-header">
    <a class="navbar-brand ks-site-brand" href="/" aria-label="Kurosu y Cía. - Inicio"><span class="ks-site-brand__mark"><img src="/assets/images/kurosu-k-mark.png" alt="" width="22" height="22"></span><span class="ks-site-brand__name">Kurosu <strong>&amp; Cía.</strong></span></a>
    <button id="menuToggle" class="navbar-toggle collapsed ks-site-menu-toggle" type="button" aria-controls="siteNav" aria-expanded="false"><span class="sr-only">Abrir navegación</span><span class="icon-bar"></span><span class="icon-bar"></span><span class="icon-bar"></span></button>
  </div><nav id="siteNav" class="navbar-collapse collapse ks-site-nav" aria-label="Navegación principal"><ul class="nav navbar-nav ks-site-menu__links">${nav}
    <li class="dropdown ks-site-menu__more"><button class="ks-menu-button" type="button" aria-expanded="false" aria-controls="moreMenu">Más <span class="caret"></span></button><ul id="moreMenu" class="dropdown-menu">${more}</ul></li>
    <li class="ks-site-menu__search"><button id="searchToggle" class="ks-search-toggle" type="button" aria-label="Buscar en el portal" aria-expanded="false" aria-controls="headerSearch">${icon("search")}</button><form id="headerSearch" class="ks-header-search" role="search" hidden><label class="sr-only" for="headerSearchInput">Buscar en el portal</label><div class="ks-header-search__group"><input id="headerSearchInput" class="ks-search-input" data-ks-search-input data-ks-search-results-id="headerSearchResults" type="search" placeholder="Buscar productos, soporte o contacto" autocomplete="off"><button class="ks-header-search__submit" type="submit" aria-label="Buscar">${icon("search")}</button></div><div id="headerSearchResults" class="ks-header-search__results" data-ks-search-results aria-live="polite"></div></form></li>
    <li class="ks-site-menu__cta"><a href="${site.whatsapp}"${external}>${whatsappIcon()}<span>WhatsApp 24 hs</span></a></li>
  </ul></nav></div></header>`;
}

function footer() {
  return `<footer class="footer ks-site-footer" role="contentinfo"><div class="ks-site-footer__main"><div class="container ks-shell-container"><div class="ks-site-footer__grid">
    <a class="ks-site-brand ks-site-brand--footer" href="/" aria-label="Kurosu y Cía. - Inicio"><span class="ks-site-brand__mark"><img src="/assets/images/kurosu-k-mark.png" alt="" width="22" height="22"></span><span class="ks-site-brand__name">Kurosu <strong>&amp; Cía.</strong></span></a>
    <nav class="ks-site-footer__actions" aria-label="Accesos finales"><a href="${site.official}"${external}>Sitio oficial</a><a class="ks-footer-contact" href="${site.whatsapp}"${external}>${whatsappIcon()}<span>WhatsApp 24 hs</span></a></nav>
  </div></div></div><div class="footer-bottom ks-site-footer__bottom"><div class="container ks-shell-container"><div class="ks-site-footer__legal"><p>Copyright © ${new Date().getFullYear()}. Todos los derechos reservados.<span class="ks-site-footer__powered"><span class="ks-site-footer__separator" aria-hidden="true">|</span> Powered by: Kurosu &amp; Cía S.A.</span></p></div></div></div></footer>`;
}

export function layout({ title, description, active = "", body }) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${description}"><meta name="theme-color" content="#102f22"><title>${title} | Kurosu &amp; Cía.</title><link rel="icon" type="image/svg+xml" href="__FAVICON__"><link rel="stylesheet" href="__SITE_CSS__"></head><body>__ICON_SPRITE__${header(active)}<main id="mainContent" tabindex="-1">${body}</main>${footer()}<script>window.KS_SEARCH_INDEX=__SEARCH_INDEX__;window.KS_ROUTE_PREFIX="__ROUTE_PREFIX__";</script><script src="__SITE_JS__"></script></body></html>`;
}
