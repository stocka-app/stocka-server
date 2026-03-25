import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { Request } from 'express';

const POPUP_MODE_QUERY_VALUE = 'popup';
const POPUP_STATE_PREFIX = 'popup:';
const STATE_TTL_MS = 10 * 60 * 1000;

/**
 * OAuth state store that encodes the popup mode flag and a HMAC-SHA256 signature
 * in the OAuth state parameter.
 *
 * Cookies are unreliable for popup mode detection: SameSite policies and
 * browser security restrictions can block cookie delivery during cross-origin
 * OAuth redirect chains (e.g. Google → localhost). The OAuth `state` parameter
 * is guaranteed to round-trip unchanged through any OAuth provider, making it
 * the correct mechanism for passing context through the redirect chain.
 *
 * State format:
 *   - Popup mode:    `popup:<16-byte-hex>:<timestamp>.<hmac-sha256-sig>`
 *   - Normal mode:   `<16-byte-hex>:<timestamp>.<hmac-sha256-sig>`
 *
 * The HMAC signature over the payload (everything before the final dot) ensures
 * that the state cannot be tampered with. A 10-minute TTL prevents replay attacks.
 */
export class PopupStateStore {
  constructor(private readonly secret: string) {}

  store(req: Request, callback: (err: Error | null, state: string) => void): void {
    const isPopup = (req.query['mode'] as string) === POPUP_MODE_QUERY_VALUE;
    const nonce = randomBytes(16).toString('hex');
    const timestamp = Date.now().toString();
    const payload = isPopup
      ? `${POPUP_STATE_PREFIX}${nonce}:${timestamp}`
      : `${nonce}:${timestamp}`;
    const sig = this.sign(payload);
    callback(null, `${payload}.${sig}`);
  }

  verify(
    _req: Request,
    state: string,
    callback: (err: Error | null, ok: boolean, state?: unknown) => void,
  ): void {
    const lastDot = state.lastIndexOf('.');
    if (lastDot === -1) {
      callback(null, false);
      return;
    }

    const payload = state.slice(0, lastDot);
    const receivedSig = state.slice(lastDot + 1);
    const expectedSig = this.sign(payload);

    const receivedBuf = Buffer.from(receivedSig, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');

    if (receivedBuf.length !== expectedBuf.length || !timingSafeEqual(receivedBuf, expectedBuf)) {
      callback(null, false);
      return;
    }

    const parts = payload.split(':');
    const ts = parseInt(parts[parts.length - 1], 10);

    if (isNaN(ts) || Date.now() - ts > STATE_TTL_MS) {
      callback(null, false);
      return;
    }

    callback(null, true);
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.secret).update(payload).digest('hex');
  }
}

/** Returns true if the OAuth state parameter signals popup mode. */
export function isPopupState(state: string | undefined): boolean {
  return typeof state === 'string' && state.startsWith(POPUP_STATE_PREFIX);
}
