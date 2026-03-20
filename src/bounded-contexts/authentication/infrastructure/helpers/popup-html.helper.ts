import { Response } from 'express';

export const POPUP_OAUTH_MODE_COOKIE = 'oauth_mode';
export const POPUP_OAUTH_MODE_VALUE = 'popup';

const POPUP_OAUTH_MODE_COOKIE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

export function setPopupModeCookie(res: Response): void {
  res.cookie(POPUP_OAUTH_MODE_COOKIE, POPUP_OAUTH_MODE_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/authentication',
    maxAge: POPUP_OAUTH_MODE_COOKIE_MAX_AGE_MS,
  });
}

function buildPopupHtml(accessToken: string, frontendOrigin: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Completing sign-in…</title></head>
<body>
<script>
  (function () {
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: 'oauth-success', accessToken: '${accessToken}' },
          '${frontendOrigin}'
        );
      }
    } finally {
      window.close();
    }
  }());
</script>
</body>
</html>`;
}

/**
 * Sends the OAuth popup HTML response.
 *
 * Overrides two Helmet defaults that would otherwise break the popup flow:
 *
 * 1. Content-Security-Policy: Helmet blocks inline scripts by default.
 *    The popup contains only a self-contained inline script with no external
 *    resources, so a narrow override is safe here.
 *
 * 2. Cross-Origin-Opener-Policy: Helmet sets COOP: same-origin by default.
 *    This severs the opener relationship between the popup (localhost:3001)
 *    and the frontend window (localhost:5173), making window.opener null and
 *    blocking window.close(). Setting unsafe-none restores the opener reference
 *    for this ephemeral page only.
 *
 * Both overrides are scoped to this single response.
 */
export function sendPopupResponse(res: Response, accessToken: string, frontendOrigin: string): void {
  res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'");
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.send(buildPopupHtml(accessToken, frontendOrigin));
}
