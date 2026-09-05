import crypto from 'crypto';

/**
 * Generate a SHA-256 hex hash of a buffer (e.g. uploaded file).
 * Used for duplicate payment screenshot detection.
 */
export function hashBuffer(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Generate a SHA-256 hex hash of a string.
 */
export function hashString(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
}
