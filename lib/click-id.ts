import crypto from 'crypto';

export function generateClickId(): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const random = crypto.randomBytes(8).toString('hex');
    return `clk_${timestamp}_${random}`;
    // Format: clk_1704067200000_a1b2c3d4e5f67890
}

export function isValidClickId(id: string): boolean {
    return /^clk_\d+_[a-f0-9]{16}$/.test(id);
}

export function getRootDomain(url: string | URL): string {
    if (typeof url === 'string') url = new URL(url);

    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return url.hostname;  // localhost sans wildcard
    }

    const parts = url.hostname.split('.');
    if (parts.length >= 2) {
        return `.${parts.slice(-2).join('.')}`;  // .example.com
    }

    return url.hostname;
}
