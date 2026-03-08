import { badRequest } from "./http-errors.js";

/**
 * Characters unsafe for embedding in u-db --where clause string literals.
 * Single quotes break out of the literal; backslashes may act as escapes;
 * semicolons could terminate statements; control chars are never valid.
 */
const UNSAFE_PATTERN = /['\\;]/;
const CONTROL_CHAR_PATTERN = /[\x00-\x1f\x7f]/;

/**
 * Validate that a string is safe to interpolate into a u-db --where clause
 * inside single quotes. Throws badRequest on invalid input.
 */
export function safeIdentifier(value: string, fieldName: string): string {
  if (value.length === 0) {
    throw badRequest(`${fieldName} must not be empty`);
  }
  if (value.length > 256) {
    throw badRequest(`${fieldName} exceeds 256 character limit`);
  }
  if (UNSAFE_PATTERN.test(value)) {
    throw badRequest(`${fieldName} contains invalid characters`);
  }
  if (CONTROL_CHAR_PATTERN.test(value)) {
    throw badRequest(`${fieldName} contains control characters`);
  }
  return value;
}
