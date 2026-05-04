const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNonEmptyString(val) {
    return typeof val === 'string' && val.trim().length > 0;
}

function isValidEmail(val) {
    return isNonEmptyString(val) && EMAIL_RE.test(val.trim());
}

function pick(obj, allowedKeys) {
    const out = {};
    for (const key of allowedKeys) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            out[key] = obj[key];
        }
    }
    return out;
}

module.exports = {
    isNonEmptyString,
    isValidEmail,
    pick
};
