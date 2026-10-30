export const maintenanceBadge = '<span class="ks-maintenance-badge">En mantenimiento</span>';

// Applied to every generated page, including shared navigation and inline links.
export function disableOfficialSiteLinks(html) {
  return html.replace(/<a\b([^>]*?)\bhref="([^"]*)"([^>]*)>([\s\S]*?)<\/a>/gi, (anchor, before, href, after, content) => {
    let url;
    try { url = new URL(href); } catch { return anchor; }
    if (url.hostname.toLowerCase() !== "www.kurosu.com.py") return anchor;

    let attributes = `${before}${after}`.replace(/\s+(?:target|rel)="[^"]*"/gi, "");
    attributes = /\bclass="/.test(attributes)
      ? attributes.replace(/class="([^"]*)"/, 'class="$1 ks-maintenance-link"')
      : `${attributes} class="ks-maintenance-link"`;
    const copy = content.replace(/<span class="ks-page__arrow"[^>]*>[\s\S]*?<\/span>/g, "");
    return `<span${attributes} role="link" aria-disabled="true">${copy}${maintenanceBadge}</span>`;
  });
}
