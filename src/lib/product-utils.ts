/**
 * Product data utilities — parsing and sanitization helpers shared
 * across all product-related API route handlers.
 */

// ---------------------------------------------------------------------------
// JSON Sanitization
// ---------------------------------------------------------------------------

/**
 * Strips null bytes and incomplete unicode escape sequences from a raw string
 * before it is passed to JSON.parse. Corrupted DB values (e.g. `\u0` instead
 * of `\u0000`) cause "Unexpected token '\'" SyntaxErrors in the RSC layer.
 */
function sanitizeJsonString(str: string): string {
  return str
    .replace(/\u0000/g, '')               // strip null bytes (binary 0x00)
    .replace(/\\u(?![0-9a-fA-F]{4})/g, ''); // remove incomplete \uXXXX sequences
}

/**
 * Recursively parses a value that may be a single- or multi-stringified JSON
 * string back into a native JS value. Handles the historic data-corruption
 * pattern where some fields were double-stringified on insert.
 */
export function deepParse(val: unknown): unknown {
  if (!val || typeof val !== 'string') return val;
  try {
    let current = sanitizeJsonString(val);
    for (let i = 0; i < 5; i++) {
      const parsed: unknown = JSON.parse(current);
      if (typeof parsed === 'string') {
        current = sanitizeJsonString(parsed);
        continue;
      }
      // Handle single-key object where the key itself is a JSON string
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const keys = Object.keys(parsed as Record<string, unknown>);
        if (
          keys.length === 1 &&
          keys[0].trim().startsWith('{') &&
          keys[0].trim().endsWith('}')
        ) {
          current = keys[0];
          continue;
        }
      }
      return parsed;
    }
    return current;
  } catch {
    return val;
  }
}

/**
 * Parses a JSON-encoded field that should resolve to an array.
 * Wraps single objects in an array for backward compatibility.
 */
export function getImages(jsonStr: string | null): unknown[] {
  if (!jsonStr) return [];
  const parsed = deepParse(jsonStr);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') return [parsed];
  return [];
}

// ---------------------------------------------------------------------------
// Product Parsing
// ---------------------------------------------------------------------------

export interface ParsedProduct {
  id: string;
  title: string;
  description: string;
  image: string;
  images: unknown[];
  mediums: unknown[];
  frameTypes: unknown[];
  frameColors: unknown[];
  specifications: unknown[];
  priceModifiers: Record<string, unknown>;
  basePrice: number;
  unitsAvailable: number | null;
  [key: string]: unknown;
}

/**
 * Normalises a raw DB product row by parsing all JSON-encoded fields and
 * resolving the primary `image` from the `images` array.
 */
export function parseProduct(p: Record<string, unknown> | null): ParsedProduct | null {
  if (!p) return null;

  const images = getImages(p.images as string | null);
  const parsed: ParsedProduct = {
    ...(p as ParsedProduct),
    mediums: getImages(p.mediums as string | null),
    frameTypes: getImages(p.frameTypes as string | null),
    frameColors: getImages(p.frameColors as string | null),
    specifications: getImages(p.specifications as string | null),
    priceModifiers: (deepParse(p.priceModifiers as string | null) as Record<string, unknown>) ?? {},
    images,
    image: (images.length > 0 ? images[0] : p.image ?? '') as string,
  };

  return parsed;
}
