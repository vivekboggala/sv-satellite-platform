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
        const hexPattern = /^[0-9A-Fa-f]{16}$/;
        const dsnwPattern = /^DSNW[0-9A-Za-z]{8}$/i;

        if (hexPattern.test(box) || dsnwPattern.test(box)) {
            return { isValid: true, message: '' };
        }

        return {
            isValid: false,
            message: 'Invalid APFiber box number.\n\nValid formats:\n• 16-character hexadecimal\n• DSNW + 8 characters'
        };
    }

    // BCN Digital - Exactly 18 digits
    if (type.includes('bcn')) {
        const bcnPattern = /^[0-9]{18}$/;
        if (bcnPattern.test(box)) return { isValid: true, message: '' };
        return {
            isValid: false,
            message: 'Invalid BCN Digital box number. Must be exactly 18 digits.'
        };
    }

    // Dish TV - Exactly 14 digits
    if (type.includes('dish')) {
        const dishPattern = /^[0-9]{14}$/;
        if (dishPattern.test(box)) return { isValid: true, message: '' };
        return { isValid: false, message: 'Dish TV Box ID must be 14 digits.' };
    }

    // Tata Play / Sun Direct / D2H - Exactly 10 digits
    if (type.includes('tata') || type.includes('sun') || type.includes('d2h')) {
        const tenPattern = /^[0-9]{10}$/;
        if (tenPattern.test(box)) return { isValid: true, message: '' };
        return { isValid: false, message: 'Box ID must be 10 digits.' };
    }

    // Airtel Digital TV - Exactly 11 digits
    if (type.includes('airtel')) {
        const airtelPattern = /^[0-9]{11}$/;
        if (airtelPattern.test(box)) return { isValid: true, message: '' };
        return { isValid: false, message: 'Airtel Box ID must be 11 digits.' };
    }

    // Hathway - Starts with 'T403231' + 6 digits (total 13 chars)
    if (type.includes('hathway')) {
        const hathwayPattern = /^T403231[0-9]{6}$/i;
        if (hathwayPattern.test(box)) return { isValid: true, message: '' };
        return {
            isValid: false,
            message: 'Invalid Hathway box number. Format: T403231 + 6 digits.'
        };
    }

    // Unknown service type
    return {
        isValid: false,
        message: `Unknown service type: ${serviceType}`
    };
};
