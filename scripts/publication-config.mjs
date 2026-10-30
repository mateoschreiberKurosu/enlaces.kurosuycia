export const publicationOrigin = "https://www.kurosu.com.py";

export const sitemapRoutes = Object.freeze([
  "/",
  "/contacto/",
  "/enlaces-de-productos/",
  "/soporte-tecnico/",
  "/promociones/",
  "/preguntas-frecuentes/",
  "/sobre-nosotros/",
  "/busqueda/",
  "/acceso-denegado/"
]);

export function resolvePublicationOrigin(value = process.env.PUBLIC_SITE_URL) {
  if (value === undefined || value === "") return publicationOrigin;

  let candidate;
  try {
    candidate = new URL(value);
  } catch {
    throw new Error(`PUBLIC_SITE_URL debe ser exactamente ${publicationOrigin}.`);
  }

  const canonical = new URL(publicationOrigin);
  const valid = candidate.protocol === "https:"
    && candidate.hostname === canonical.hostname
    && candidate.port === ""
    && candidate.username === ""
    && candidate.password === ""
    && candidate.pathname === "/"
    && candidate.search === ""
    && candidate.hash === "";
  if (!valid) throw new Error(`PUBLIC_SITE_URL debe ser exactamente ${publicationOrigin}.`);

  return publicationOrigin;
}

export function sitemapUrls(origin = publicationOrigin) {
  return sitemapRoutes.map((route) => `${origin}${route}`);
}
