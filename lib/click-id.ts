import crypto from 'crypto';

export function generateClickId(): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const random = crypto.randomBytes(8).toString('hex');
    return `clk_${timestamp}_${random}`;
    // Format: clk_1704067200000_a1b2c3d4e5f67890
}

export function isValidClickId(id: string): boolean {
    // Accept both formats during transition:
    // - New format: clk_<timestamp>_<16hex> (e.g., clk_1704067200_a1b2c3d4e5f67890)
    // - Legacy format: clk_<12alphanum> (e.g., clk_abc123def456)
    return /^clk_(\d+_[a-f0-9]{16}|[a-z0-9]{12})$/.test(id);
}

export function getRootDomain(url: string | URL): string {
    if (typeof url === 'string') url = new URL(url);

    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return url.hostname;
    }

    const parts = url.hostname.split('.');
    const tld = parts[parts.length - 1];
    const sld = parts[parts.length - 2];

    // Simplified Public Suffix List for common 2-part TLDs
    // To be truly robust, this should rely on a maintained package like 'psl'
    const longTlds = ['uk', 'co', 'com', 'org', 'net', 'edu', 'gov', 'br', 'jp', 'au', 'kr'];

    // Check for patterns like .co.uk, .com.br
    if (longTlds.includes(tld) && longTlds.includes(sld)) {
        // e.g. example.co.uk -> return .example.co.uk (3 parts)
        if (parts.length >= 3) {
            return `.${parts.slice(-3).join('.')}`;
        }
    }

    // Default: return last 2 parts (e.g. example.com)
    if (parts.length >= 2) {
        return `.${parts.slice(-2).join('.')}`;
    }

    return url.hostname;
}
