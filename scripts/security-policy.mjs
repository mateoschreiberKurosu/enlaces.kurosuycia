export const securityHeaders = Object.freeze({
  "Content-Security-Policy": [
    "default-src 'self'", "upgrade-insecure-requests", "base-uri 'self'", "object-src 'none'",
    "form-action 'self'", "frame-ancestors 'self'", "img-src 'self' data:",
    "font-src 'self'", "style-src 'self'",
    "script-src 'self' https://static.cloudflareinsights.com",
    "connect-src 'self' https://cloudflareinsights.com",
    "frame-src https://www.youtube-nocookie.com"
  ].join("; "),
  "Strict-Transport-Security": "max-age=86400",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "same-origin"
});

export const removedHeaders = Object.freeze([
  "Expect-CT", "X-XSS-Protection", "Content-Security-Policy-Report-Only"
]);
export const htmlCacheControl = "public, max-age=0, must-revalidate";
export const assetCacheControl = "public, max-age=31556952, immutable";

export function renderHeadersFile() {
  return `/*\n${Object.entries(securityHeaders).map(([k,v]) => `  ${k}: ${v}`).join("\n")}\n${removedHeaders.map(k => `  ! ${k}`).join("\n")}\n  Cache-Control: ${htmlCacheControl}\n\n/assets/*\n  ! Cache-Control\n  Cache-Control: ${assetCacheControl}\n`;
}

export function responseHeaders(asset = false) {
  return { ...securityHeaders, "Cache-Control": asset ? assetCacheControl : htmlCacheControl };
}
