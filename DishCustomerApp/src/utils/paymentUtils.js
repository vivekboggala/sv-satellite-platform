import { firestore } from '../services/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

/**
 * Checks if the current user has any pending payments.
 * @param {string} userId - The Firebase UID of the user.
 * @returns {Promise<boolean>} - True if a pending payment exists, false otherwise.
 */
export const checkPendingPayment = async (userId) => {
    try {
        if (!userId) return false;

        const q = query(
            collection(firestore, "payments"),
            where("user_id", "==", userId),
            where("status", "==", "pending"),
            limit(1)
        );

        const snapshot = await getDocs(q);
        return !snapshot.empty;
    } catch (error) {
        console.error("Error checking pending payment:", error);
        return false;
    }
};
