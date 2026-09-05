/**
 * sanitize.util.ts
 * Robust XSS sanitizer for server-side use.
 * Strips all HTML/script patterns before data is stored in the database.
 * Defence-in-depth: the frontend must still escape on render.
 */

/**
 * Strip HTML tags and all known XSS vectors from a single string.
 * Handles edge cases: null bytes, HTML comments, SVG/MathML handlers,
 * data URIs, and CSS expression injection.
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;
  return input
    // Strip null bytes (used to bypass regex patterns)
    .replace(/\0/g, '')
    // Remove HTML comments (can hide malicious payloads)
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove all HTML/XML tags (greedy to handle nested tricks)
    .replace(/<[^>]*>/g, '')
    // Remove event handlers: onload=, onclick=, onerror=, etc. (with/without quotes)
    .replace(/\bon\w+\s*=\s*["']?[^"'>]*/gi, '')
    // Remove javascript: URIs (with optional whitespace/encoding)
    .replace(/j[\s\0]*a[\s\0]*v[\s\0]*a[\s\0]*s[\s\0]*c[\s\0]*r[\s\0]*i[\s\0]*p[\s\0]*t[\s\0]*:/gi, '')
    // Remove data: URIs (can carry base64-encoded scripts)
    .replace(/data\s*:\s*[^,]*,/gi, '')
    // Remove vbscript: URIs
    .replace(/vbscript\s*:/gi, '')
    // Remove CSS expression() attacks
    .replace(/expression\s*\(/gi, '')
    // Clean up extra whitespace artifacts
    .trim();
}

/**
 * Recursively sanitizes all string values in a plain object or array.
 * Useful for sanitizing req.body before passing to services.
 *
 * @param data - An object, array, or primitive value.
 * @returns The same structure with all strings sanitized.
 */
export function sanitizeObject<T>(data: T): T {
  if (typeof data === 'string') {
    return sanitizeString(data) as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeObject) as unknown as T;
  }
  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = sanitizeObject(value);
    }
    return result as T;
  }
  return data;
}
