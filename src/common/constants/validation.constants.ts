/**
 * Shared validation patterns and constraints.
 *
 * Single source of truth for regex patterns and length constraints
 * used across domain VOs and infrastructure DTOs.
 */

// ── Password ────────────────────────────────────────────────────────

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_UPPERCASE_PATTERN = /[A-Z]/;
export const PASSWORD_DIGIT_PATTERN = /\d/;
/** Combined password strength check: at least 1 uppercase + 1 digit. */
export const PASSWORD_STRENGTH_PATTERN = /^(?=.*[A-Z])(?=.*\d)/;

// ── Username ────────────────────────────────────────────────────────

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
/** Only word characters (letters, digits, underscore). */
export const USERNAME_PATTERN = /^\w+$/;

// ── Email ───────────────────────────────────────────────────────────

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Verification Code ───────────────────────────────────────────────

export const VERIFICATION_CODE_LENGTH = 6;
/** Alphanumeric only (case-insensitive). */
export const VERIFICATION_CODE_PATTERN = /^[A-Z\d]+$/i;

// ── IPv6 ────────────────────────────────────────────────────────────

/** Single hex group in an IPv6 address (1-4 hex digits). */
export const IPV6_HEX_GROUP_PATTERN = /^[\da-f]{1,4}$/;
