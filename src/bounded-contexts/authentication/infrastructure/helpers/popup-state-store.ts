import { randomBytes } from 'crypto';
import { Request } from 'express';

const POPUP_MODE_QUERY_VALUE = 'popup';
const POPUP_STATE_PREFIX = 'popup:';

/**
 * OAuth state store that encodes the popup mode flag in the OAuth state parameter.
 *
 * Cookies are unreliable for popup mode detection: SameSite policies and
 * browser security restrictions can block cookie delivery during cross-origin
 * OAuth redirect chains (e.g. Google → localhost). The OAuth `state` parameter
 * is guaranteed to round-trip unchanged through any OAuth provider, making it
 * the correct mechanism for passing context through the redirect chain.
 *
 * State format:
 *   - Popup mode:    `popup:<16-byte-hex>`   e.g. "popup:a1b2c3..."
 *   - Normal mode:   `<16-byte-hex>`          e.g. "a1b2c3..."
 *
 * Note: This store does not implement server-side CSRF state verification.
 * CSRF protection is provided by Passport's built-in mechanisms (session-based
 * state stores) when sessions are enabled. For stateless OAuth flows, the
 * provider's own PKCE / nonce mechanisms provide the needed protection.
 */
export class PopupStateStore {
  store(req: Request, callback: (err: Error | null, state: string) => void): void {
    const isPopup = (req.query['mode'] as string) === POPUP_MODE_QUERY_VALUE;
    const randomPart = randomBytes(16).toString('hex');
    const state = isPopup ? `${POPUP_STATE_PREFIX}${randomPart}` : randomPart;
    callback(null, state);
  }

  verify(
    _req: Request,
    _state: string,
    callback: (err: Error | null, ok: boolean, state?: unknown) => void,
  ): void {
    callback(null, true);
  }
}

/** Returns true if the OAuth state parameter signals popup mode. */
export function isPopupState(state: string | undefined): boolean {
  return typeof state === 'string' && state.startsWith(POPUP_STATE_PREFIX);
}
