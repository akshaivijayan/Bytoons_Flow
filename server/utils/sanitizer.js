/**
 * Cybersecurity Sanitization Utility
 * Neutralizes XSS (Cross-Site Scripting) vectors by stripping HTML tags and escaping entities.
 */
const sanitizer = {
    /**
     * clean: Recursively scrubs strings or objects to ensure data is "Clean by Default".
     */
    clean(data) {
        if (typeof data === 'string') {
            return data
                .replace(/<[^>]*>?/gm, '') // Strip HTML tags
                .replace(/[&<>"']/g, (m) => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                })[m]);
        }
        if (Array.isArray(data)) {
            return data.map(v => this.clean(v));
        }
        if (typeof data === 'object' && data !== null) {
            const cleaned = {};
            for (let key in data) {
                cleaned[key] = this.clean(data[key]);
            }
            return cleaned;
        }
        return data;
    }
};

module.exports = sanitizer;
