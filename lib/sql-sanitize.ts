/**
 * SQL Sanitization utilities for Tinybird queries
 *
 * IMPORTANT: These functions sanitize user input before interpolation into SQL strings.
 * This is a defense-in-depth measure for Tinybird queries which don't support parameterized queries.
 */

import { isValidClickId } from './click-id'

/**
 * Validates and returns a click ID, or null if invalid.
 * Click IDs must match: clk_{timestamp}_{16hex} or clk_{12alphanum}
 *
 * @example
 * sanitizeClickId('clk_1704067200_a1b2c3d4e5f67890') // returns the same string
 * sanitizeClickId("'; DROP TABLE--") // returns null
 */
export function sanitizeClickId(clickId: string | null | undefined): string | null {
    if (!clickId) return null
    if (typeof clickId !== 'string') return null

    // Use existing validator
    if (isValidClickId(clickId)) {
        return clickId
    }

    console.warn('[SQL Sanitize] Invalid click ID rejected:', clickId.slice(0, 20))
    return null
}

/**
 * Validates a UUID format (workspace_id, user_id, link_id, etc.)
 * UUIDs must match standard format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 *
 * @example
 * sanitizeUUID('550e8400-e29b-41d4-a716-446655440000') // returns the same string
 * sanitizeUUID("'; DROP TABLE--") // returns null
 */
export function sanitizeUUID(uuid: string | null | undefined): string | null {
    if (!uuid) return null
    if (typeof uuid !== 'string') return null

    // Standard UUID format (with or without hyphens)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const uuidNoHyphensRegex = /^[0-9a-f]{32}$/i

    if (uuidRegex.test(uuid) || uuidNoHyphensRegex.test(uuid)) {
        return uuid
    }

    console.warn('[SQL Sanitize] Invalid UUID rejected:', uuid.slice(0, 20))
    return null
}

/**
 * Validates a link ID format
 * Link IDs can be UUIDs or custom formats like 'lnk_xxx'
 */
export function sanitizeLinkId(linkId: string | null | undefined): string | null {
    if (!linkId) return null
    if (typeof linkId !== 'string') return null

    // UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    // Custom link ID format (lnk_ prefix + alphanumeric)
    const linkIdRegex = /^lnk_[a-zA-Z0-9_-]+$/
    // CUID format (starts with c, 25 chars)
    const cuidRegex = /^c[a-z0-9]{24}$/
    // NanoID format (alphanumeric, typically 21 chars)
    const nanoidRegex = /^[a-zA-Z0-9_-]{10,30}$/

    if (uuidRegex.test(linkId) || linkIdRegex.test(linkId) || cuidRegex.test(linkId) || nanoidRegex.test(linkId)) {
        return linkId
    }

    console.warn('[SQL Sanitize] Invalid link ID rejected:', linkId.slice(0, 20))
    return null
}

/**
 * Escapes a string for safe SQL interpolation as a fallback.
 * Replaces dangerous characters that could break out of string literals.
 *
 * USE ONLY when validation is not possible. Prefer specific validators above.
 */
export function escapeSQLString(value: string | null | undefined): string | null {
    if (!value) return null
    if (typeof value !== 'string') return null

    // Remove or escape dangerous characters for SQL string literals
    return value
        .replace(/\\/g, '\\\\')    // Escape backslashes
        .replace(/'/g, "''")       // Escape single quotes (SQL standard)
        .replace(/"/g, '\\"')      // Escape double quotes
        .replace(/\x00/g, '')      // Remove null bytes
        .replace(/\n/g, '\\n')     // Escape newlines
        .replace(/\r/g, '\\r')     // Escape carriage returns
        .replace(/;/g, '')         // Remove semicolons (prevent statement termination)
        .replace(/--/g, '')        // Remove SQL comments
}

/**
 * Validates an ISO date string
 */
export function sanitizeDateString(date: string | null | undefined): string | null {
    if (!date) return null
    if (typeof date !== 'string') return null

    // ISO 8601 date format
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/

    if (isoDateRegex.test(date)) {
        return date
    }

    console.warn('[SQL Sanitize] Invalid date rejected:', date.slice(0, 30))
    return null
}

/**
 * Validates a customer external ID (can be various formats)
 */
export function sanitizeExternalId(externalId: string | null | undefined): string | null {
    if (!externalId) return null
    if (typeof externalId !== 'string') return null

    // Allow alphanumeric, hyphens, underscores, dots (common ID formats)
    // Max 255 chars to prevent DoS
    const externalIdRegex = /^[a-zA-Z0-9._-]{1,255}$/

    if (externalIdRegex.test(externalId)) {
        return externalId
    }

    // Fallback: escape the string if it doesn't match the safe pattern
    // This allows for more complex IDs while still being safe
    console.warn('[SQL Sanitize] External ID using escape fallback:', externalId.slice(0, 20))
    return escapeSQLString(externalId)
}

/**
 * Sanitizes an array of IDs for use in SQL IN clauses
 * Returns only valid IDs, filters out invalid ones
 */
export function sanitizeIdList(
    ids: string[],
    validator: (id: string | null | undefined) => string | null
): string[] {
    return ids
        .map(id => validator(id))
        .filter((id): id is string => id !== null)
}
