/**
 * Validates box number based on service type
 * @param {string} serviceType - 'apfiber', 'bcn_digital', or 'hathway'
 * @param {string} boxNumber - The box number to validate
 * @returns {Object} { isValid: boolean, message: string }
 */
export const validateBoxNumber = (serviceType, boxNumber) => {
    if (!serviceType) {
        return { isValid: false, message: 'Please select a service type first.' };
    }

    if (!boxNumber) {
        return { isValid: false, message: 'Box number is required.' };
    }

    // Normalize inputs
    const type = serviceType.toLowerCase().trim();
    const box = boxNumber.trim();

    // APFiber - Two valid formats
    if (type.includes('ap') || type.includes('fiber')) {
        // Format 1: 16-character hexadecimal (0-9, A-F)
        const hexPattern = /^[0-9A-Fa-f]{16}$/;

        // Format 2: DSNW prefix + 8 alphanumeric characters (total 12 chars)
        const dsnwPattern = /^DSNW[0-9A-Za-z]{8}$/i;

        if (hexPattern.test(box) || dsnwPattern.test(box)) {
            return { isValid: true, message: '' };
        }

        return {
            isValid: false,
            message: 'Invalid APFiber box number.\n\nValid formats:\n• 16-character hexadecimal (e.g., A1B2C3D4E5F60718)\n• DSNW + 8 characters (e.g., DSNW12AB34CD)'
        };
    }

    // BCN Digital - Exactly 18 digits
    if (type.includes('bcn')) {
        const bcnPattern = /^[0-9]{18}$/;

        if (bcnPattern.test(box)) {
            return { isValid: true, message: '' };
        }

        return {
            isValid: false,
            message: 'Invalid BCN Digital box number.\n\nMust be exactly 18 digits (e.g., 628012345678901234)'
        };
    }

    // Hathway - Starts with 'T403231' + 6 digits (total 13 chars)
    if (type.includes('hathway')) {
        const hathwayPattern = /^T403231[0-9]{6}$/i;

        if (hathwayPattern.test(box)) {
            return { isValid: true, message: '' };
        }

        return {
            isValid: false,
            message: 'Invalid Hathway box number.\n\nMust start with T403231 followed by 6 digits (e.g., T403231123456)'
        };
    }

    // Unknown service type
    return {
        isValid: false,
        message: `Unknown service type: ${serviceType}`
    };
};
