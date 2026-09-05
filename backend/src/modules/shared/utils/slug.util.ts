import prisma from '../../../lib/prisma';

/**
 * Convert a string to a URL-safe slug.
 * e.g. "Red Silk Blouse!" → "red-silk-blouse"
 */
export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** Alias for toSlug — used by older imports */
export const slugify = toSlug;

/**
 * Generate a unique slug for an EcomProduct.
 * Appends -2, -3, etc. if slug already exists.
 */
export async function uniqueProductSlug(name: string, existingId?: string): Promise<string> {
  const base = toSlug(name);
  let slug = base;
  let counter = 2;

  while (true) {
    const conflict = await prisma.ecomProduct.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!conflict || conflict.id === existingId) break;
    slug = `${base}-${counter++}`;
  }

  return slug;
}

/**
 * Generate a unique slug for an EcomCategory.
 */
export async function uniqueCategorySlug(name: string, existingId?: string): Promise<string> {
  const base = toSlug(name);
  let slug = base;
  let counter = 2;

  while (true) {
    const conflict = await prisma.ecomCategory.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!conflict || conflict.id === existingId) break;
    slug = `${base}-${counter++}`;
  }

  return slug;
}
