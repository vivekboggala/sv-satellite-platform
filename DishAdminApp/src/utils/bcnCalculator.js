// BCN Recharge Calculation Utility
// Rule: Expiry is always 12th of next month, Amount = Days × ₹10 (New/Expired) or ₹280 (Renewal)

export const calculateBCNRecharge = (currentExpiryDate = null) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let isRenewal = false;
    let rechargeStartDate = new Date(today);

    // Check if user has active subscription
    if (currentExpiryDate) {
        const expiry = new Date(currentExpiryDate.seconds ? currentExpiryDate.seconds * 1000 : currentExpiryDate);
        expiry.setHours(0, 0, 0, 0);

        if (expiry >= today) {
            // Active subscription - renewal starts from day after expiry
            isRenewal = true;
            rechargeStartDate = new Date(expiry);
            rechargeStartDate.setDate(rechargeStartDate.getDate() + 1);
        }
    }

    // Calculate next month for expiry
    let nextMonth = rechargeStartDate.getMonth() + 1;
    let yearForExpiry = rechargeStartDate.getFullYear();

    if (nextMonth > 11) {
        nextMonth = 0;
        yearForExpiry += 1;
    }

    // Expiry is always 12th of next month at 23:59:59
    const expiryDate = new Date(yearForExpiry, nextMonth, 12, 23, 59, 59);

    // Calculate days between start and expiry
    const diffTime = expiryDate - rechargeStartDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Amount calculation
    let amount;
    if (isRenewal) {
        // For renewals (active box), monthly amount is fixed ₹280
        amount = 280;
    } else {
        // For new/expired, calculate based on actual days
        amount = diffDays * 10;
    }

    return {
        isRenewal,
        rechargeDate: today.toISOString().split('T')[0],
        serviceStartDate: rechargeStartDate.toISOString().split('T')[0],
        expiryDate: expiryDate.toISOString().split('T')[0],
        remainingDays: diffDays,
        amount: amount,
        perDayRate: 10
    };
};

// Calculate numeric days remaining
export const calculateDaysRemaining = (expiryDate, serviceType = '') => {
    if (!expiryDate) return 0;

    // Normalize expiry date
    const expiry = expiryDate.seconds
        ? new Date(expiryDate.seconds * 1000)
        : (expiryDate.toDate ? expiryDate.toDate() : new Date(expiryDate));

    if (!expiry || isNaN(expiry.getTime())) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exp = new Date(expiry);
    exp.setHours(0, 0, 0, 0);

    if (exp <= today) return 0;

    // Default: Standard daily difference
    const diffTime = exp.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

// Format date for display
export const formatDate = (dateStringOrDate) => {
    const date = typeof dateStringOrDate === 'string' ? new Date(dateStringOrDate) : dateStringOrDate;
    if (!date || isNaN(date.getTime())) return 'N/A';

    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};
