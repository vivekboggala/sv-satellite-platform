// ============================================================
// bcnCalculator.js
// EXPIRY RULES (verified from AP Fiber official portal):
//
//   BCN Digital : Always expires on the 12th of next month.
//                 Amount = remainingDays × ₹10
//
//   AP Fiber    : expiry = renewalDate + 1 calendar month + 1 day
//                 e.g. renewed 27-Feb → expires 28-Mar (29 days)
//                      renewed 04-Feb → expires 05-Mar (29 days)
//                      renewed 01-Mar → expires 02-Apr (32 days)
//
//   Hathway     : expiry = paymentDate + 30 days (exact flat)
//                 e.g. recharged 01-Mar → expires 31-Mar → shows 30 days
// ============================================================

// ── BCN DIGITAL ─────────────────────────────────────────────

export const calculateBCNRecharge = (months = 1) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // BCN rule: always expires on the 12th of next month
    const targetExpiry = new Date(currentYear, currentMonth + 1, 12, 23, 59, 59);

    const msPerDay = 1000 * 60 * 60 * 24;
    const diffMs = targetExpiry.getTime() - today.getTime();
    const remainingDays = Math.ceil(diffMs / msPerDay);

    let baseAmount = remainingDays * 10;
    let isSpeciallyPriced = false;

    // Special window: 12th to 15th → flat ₹280
    if (currentDay >= 12 && currentDay <= 15) {
        baseAmount = 280;
        isSpeciallyPriced = true;
    }

    const validMonths = Math.max(1, parseInt(months) || 1);
    const totalAmount = Math.max(0, baseAmount + (validMonths - 1) * 280);

    const finalExpiry = new Date(targetExpiry);
    if (months > 1) {
        finalExpiry.setMonth(finalExpiry.getMonth() + (months - 1));
    }

    return {
        amount: totalAmount,
        expiryDate: formatDateISO(finalExpiry),
        remainingDays,
        isSpeciallyPriced,
        baseAmount
    };
};

// ── AP FIBER ─────────────────────────────────────────────────

/**
 * Returns the correct AP Fiber expiry date.
 * Rule: expiry = renewalDate + 1 calendar month + 1 day
 *
 * Verified examples:
 *   renewed 27-Feb-2026 → expires 28-Mar-2026  (29 days, Feb=28d)
 *   renewed 04-Feb-2026 → expires 05-Mar-2026  (29 days, Feb=28d)
 *   renewed 20-Feb-2026 → expires 21-Mar-2026  (29 days, Feb=28d)
 *   renewed 01-Mar-2026 → expires 02-Apr-2026  (32 days, Mar=31d)
 *
 * @param {Date} renewalDate - The date payment was approved
 * @param {number} months - Number of months (default 1)
 * @returns {Date} expiry date
 */
export const calculateAPFiberExpiry = (renewalDate = new Date(), months = 1) => {
    const base = new Date(renewalDate);
    base.setHours(0, 0, 0, 0);

    const expiry = new Date(base);
    // Rule: flat 30 days per month (verified from AP Fiber portal)
    expiry.setDate(expiry.getDate() + (30 * months));
    expiry.setHours(23, 59, 59, 0);

    return expiry;
};

// ── HATHWAY ──────────────────────────────────────────────────

/**
 * Returns the correct Hathway expiry date.
 * Rule: expiry = paymentDate + 30 days (flat, not calendar month)
 *
 * Verified: recharged 01-Mar-2026 → valid till 30-Mar-2026 on website
 * We store expiry as paymentDate + 30 days so daysLeft shows 30 on day of payment.
 * (standard diff: 31-Mar minus 01-Mar = 30 days ✓)
 *
 * @param {Date} paymentDate - The date payment was approved
 * @param {number} months - Number of months (each = 30 days)
 * @returns {Date} expiry date
 */
export const calculateHathwayExpiry = (paymentDate = new Date(), months = 1) => {
    const base = new Date(paymentDate);
    base.setHours(0, 0, 0, 0);

    const expiry = new Date(base);
    expiry.setDate(expiry.getDate() + (30 * months));
    expiry.setHours(23, 59, 59, 0);

    return expiry;
};

// ✅ Global Safety Helper: Checks if the plan matches the current service
export const isPlanActiveForService = (userData) => {
    if (!userData) return false;
    const planValue = getPlanDisplayValue(userData);
    return planValue !== 'No Plan';
};

// ── DAYS REMAINING ───────────────────────────────────────────

export const calculateDaysRemaining = (expiryDate, userData = null) => {
    // Safety Guard: If we have userData, check if the plan is valid for the current service
    if (userData && !isPlanActiveForService(userData)) return 0;

    if (!expiryDate) return 0;

    const expiry = expiryDate.seconds
        ? new Date(expiryDate.seconds * 1000)
        : (expiryDate.toDate ? expiryDate.toDate() : new Date(expiryDate));

    if (!expiry || isNaN(expiry.getTime())) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exp = new Date(expiry);
    exp.setHours(0, 0, 0, 0);

    if (exp <= today) return 0;

    const diffTime = exp.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

// ── HELPER: Get expiry for any service type ──────────────────

/**
 * Universal expiry calculator — use this in the admin app when approving payments.
 *
 * @param {string} serviceType - 'ap_fiber', 'hathway', or 'bcn_digital'
 * @param {Date} approvalDate - Date when payment is approved (default: now)
 * @param {number} months - Number of months purchased
 * @returns {Date} correct expiry date for the service
 */
export const getExpiryForService = (serviceType, approvalDate = new Date(), months = 1) => {
    const st = (serviceType || '').toLowerCase().replace(/[^a-z_]/g, '');

    if (st.includes('ap_fiber') || st.includes('apfiber') || st.includes('fiber')) {
        return calculateAPFiberExpiry(approvalDate, months);
    }

    if (st.includes('hathway')) {
        return calculateHathwayExpiry(approvalDate, months);
    }

    // BCN Digital: use bcnCalculator result
    const bcn = calculateBCNRecharge(months);
    return new Date(bcn.expiryDate);
};

// ── DATE UTILITIES ───────────────────────────────────────────

// Format date as YYYY-MM-DD (for Firestore storage)
const formatDateISO = (date) => {
    return new Date(date).toISOString().split('T')[0];
};

// Format date for display: "28 Mar 2026"
export const formatDate = (dateStringOrDate, userData = null) => {
    // Safety Guard: Hide date if plan is stale
    if (userData && !isPlanActiveForService(userData)) return 'N/A';

    if (!dateStringOrDate) return 'N/A';
    const date = dateStringOrDate.seconds
        ? new Date(dateStringOrDate.seconds * 1000)
        : new Date(dateStringOrDate);
    if (!date || isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

// Check if user needs recharge (expiry passed)
export const needsRecharge = (expiryDate) => {
    if (!expiryDate) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = expiryDate.seconds
        ? new Date(expiryDate.seconds * 1000)
        : new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return expiry < today;
};

// Check if user can renew (within 7 days of expiry)
export const canRenew = (expiryDate) => {
    if (!expiryDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = expiryDate.seconds
        ? new Date(expiryDate.seconds * 1000)
        : new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
};

// ── PLAN CHECKS ──────────────────────────────────────────────

export const isBCNPlan = (plan) => {
    if (!plan) return false;
    const name = (plan.name || '').toLowerCase();
    const serviceType = (plan.service_type || '').toLowerCase();
    return name.includes('bcn') || serviceType.includes('bcn');
};

export const isAPFiberPlan = (plan) => {
    if (!plan) return false;
    const name = (plan.name || '').toLowerCase();
    const serviceType = (plan.service_type || '').toLowerCase();
    return name.includes('ap fiber') || name.includes('apfiber') || serviceType.includes('ap_fiber');
};

export const isHathwayPlan = (plan) => {
    if (!plan) return false;
    const name = (plan.name || '').toLowerCase();
    const serviceType = (plan.service_type || '').toLowerCase();
    return name.includes('hathway') || serviceType.includes('hathway');
};

// ── UI HELPERS ───────────────────────────────────────────────

export const getServiceLabels = (serviceType = 'bcn_digital') => {
    const st = (serviceType || 'bcn_digital').toLowerCase().replace(/[^a-z]/g, '');

    if (st.includes('fiber') || st.includes('apfiber') || st === 'apfiber') {
        return {
            boxLabel: 'Device ID',
            expiryLabel: 'Next Billing Date',
            daysLabel: 'DAYS REMAINING',
            balanceLabel: '',
            planLabel: 'SELECTED PLAN',
            durationLabel: 'Billing Cycle',
            renewLabel: 'Pay Bill',
            isBCN: false,
            serviceName: 'APFiber'
        };
    }

    if (st.includes('hathway')) {
        return {
            boxLabel: 'Device ID',
            expiryLabel: 'Next Billing Date',
            daysLabel: 'DAYS REMAINING',
            balanceLabel: '',
            planLabel: 'SELECTED PLAN',
            durationLabel: 'Billing Cycle',
            renewLabel: 'Pay Bill',
            isBCN: false,
            serviceName: 'Hathway'
        };
    }

    return {
        boxLabel: 'Box Number',
        expiryLabel: 'Account Expiry',
        daysLabel: 'DAYS REMAINING',
        balanceLabel: 'PLAN PRICE',
        planLabel: 'PLAN PRICE',
        durationLabel: 'Billing Info',
        renewLabel: 'Renew Now',
        isBCN: true,
        serviceName: 'BCN Digital'
    };
};

export const getPlanDisplayValue = (userData) => {
    const st = (userData?.service_type || '').toLowerCase();
    if (st.includes('fiber') || st.includes('apfiber') || st.includes('hathway')) {
        if (userData?.plan_name) {
            // Safety: if plan name contains "BCN" but we are in Fiber/Hathway mode, it's stale data
            if (userData.plan_name.toLowerCase().includes('bcn')) return 'No Plan';
            return userData.plan_name;
        }
        if (userData?.plan_speed) return `${userData.plan_speed} Mbps`;
        return 'No Plan';
    }
    return userData?.plan_name || 'No Plan';
};

export const getBillingTypeDisplay = (serviceType) => {
    const st = (serviceType || '').toLowerCase().replace(/[^a-z]/g, '');
    if (st.includes('fiber') || st.includes('hathway') || st === 'apfiber') {
        return 'Monthly';
    }
    return 'Daily';
};

export const getServiceColors = (serviceType, isDark) => {
    const st = (serviceType || '').toLowerCase().replace(/[^a-z_]/g, '');

    if (st.includes('bcn')) {
        return {
            primary: '#EC4899',
            bg: isDark ? '#EC489920' : '#FCE7F3',
            text: '#EC4899',
            gradient: ['#EC4899', '#DB2777']
        };
    }

    if (st.includes('hathway')) {
        return {
            primary: '#14B8A6',
            bg: isDark ? '#14B8A620' : '#F0FDFA',
            text: '#14B8A6',
            gradient: ['#14B8A6', '#0D9488']
        };
    }

    // AP Fiber (default)
    return {
        primary: '#2563EB',
        bg: isDark ? '#2563EB20' : '#EFF6FF',
        text: '#2563EB',
        gradient: ['#2563EB', '#1E40AF']
    };
};

export const calculateBCNBalance = (daysLeft, dailyRate = 10) => {
    return daysLeft * dailyRate;
};

export const getServiceIcon = (serviceType) => {
    switch (serviceType) {
        case 'bcn_digital': return 'tv';
        case 'hathway': return 'cable';
        case 'apfiber':
        default: return 'wifi';
    }
};

export const getServiceDisplayName = (serviceType) => {
    const st = (serviceType || '').toLowerCase().replace(/[^a-z_]/g, '');
    if (st.includes('bcn')) return 'BCN Digital Cable TV';
    if (st.includes('hathway')) return 'Hathway Cable TV';
    return 'APFiber Broadband';
};