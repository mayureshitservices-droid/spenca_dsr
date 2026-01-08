// GPS validation
const validateGPS = (latitude, longitude, accuracy) => {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return { valid: false, error: 'Latitude and longitude must be numbers' };
    }

    if (latitude < -90 || latitude > 90) {
        return { valid: false, error: 'Latitude must be between -90 and 90' };
    }

    if (longitude < -180 || longitude > 180) {
        return { valid: false, error: 'Longitude must be between -180 and 180' };
    }

    if (typeof accuracy !== 'number' || accuracy < 0) {
        return { valid: false, error: 'Accuracy must be a positive number' };
    }

    return { valid: true };
};

// Email validation
const validateEmail = (email) => {
    const emailRegex = /^\S+@\S+\.\S+$/;
    return emailRegex.test(email);
};

// Sanitize input (basic XSS prevention)
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>]/g, '');
};

module.exports = {
    validateGPS,
    validateEmail,
    sanitizeInput
};
