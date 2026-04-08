import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const TransactionCard = ({ item, planName, amount, valuedAt, timestamp, reference, status, months, paymentMethod, onDownload }) => {
    const { themeColors, isDark } = useTheme();

    const getStatusInfo = (s) => {
        const statusLower = s?.toLowerCase();
        if (statusLower === 'approved' || statusLower === 'completed') {
            return {
                color: '#10B981',
                label: 'COMPLETED',
                icon: 'checkmark-sharp',
                bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5'
            };
        }
        if (statusLower === 'pending') {
            return {
                color: '#F59E0B',
                label: 'PENDING',
                icon: 'time-outline',
                bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB'
            };
        }
        if (statusLower === 'failed' || statusLower === 'rejected') {
            return {
                color: '#EF4444',
                label: 'REJECTED',
                icon: 'close-sharp',
                bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2'
            };
        }
        return {
            color: '#6B7280',
            label: status?.toUpperCase() || 'UNKNOWN',
            icon: 'help-circle-outline',
            bg: isDark ? 'rgba(107, 114, 128, 0.15)' : '#F3F4F6'
        };
    };

    const statusInfo = getStatusInfo(status);

    const formatDate = (ts) => {
        if (!ts) return '---';
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        if (isNaN(date.getTime())) return '---';
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Color constants based on image
    const cardBg = isDark ? '#1E293B' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0';
    const detailBoxBg = isDark ? 'rgba(15, 23, 42, 0.3)' : '#F8FAFC';
    const textPrimary = isDark ? '#F1F5F9' : '#0F172A';
    const textSecondary = isDark ? '#94A3B8' : '#64748B';
    const accentColor = isDark ? '#818CF8' : '#2563EB';

    return (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderColor }]}>
            {/* TOP ROW: Icon + Plan Name + Status Badge */}
            <View style={styles.topRow}>
                <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#F0FDF4' }]}>
                    <Ionicons name={statusInfo.icon} size={22} color={statusInfo.color} />
                </View>

                <View style={styles.planInfo}>
                    <Text style={[styles.planName, { color: textPrimary }]} numberOfLines={1}>
                        {planName || 'BCN Digital'}
                    </Text>
                    <Text style={[styles.subText, { color: textSecondary }]}>
                        {months || 1} Months Plan
                    </Text>
                </View>

                <View style={[styles.statusCapsule, { backgroundColor: statusInfo.bg }]}>
                    <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
                        {statusInfo.label}
                    </Text>
                </View>
            </View>

            <View style={[styles.detailBox, { backgroundColor: detailBoxBg, borderColor: borderColor }]}>
                <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: textSecondary }]}>
                        {paymentMethod?.toLowerCase() === 'cash' ? 'Payment Method' : 'UTR Number'}
                    </Text>
                    <Text style={[styles.detailValue, { color: textPrimary }]} numberOfLines={1}>
                        {paymentMethod?.toLowerCase() === 'cash' ? 'Paid by Cash' : (reference || '---')}
                    </Text>
                </View>

                <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: textSecondary }]}>Amount Paid</Text>
                    <Text style={[styles.amountValue, { color: accentColor }]}>
                        ₹{amount || valuedAt || '0'}
                    </Text>
                </View>
            </View>

            {/* DIVIDER */}
            <View style={[styles.divider, { backgroundColor: borderColor }]} />

            {/* FOOTER: Date + Download/Invoice link */}
            <View style={styles.footer}>
                <View style={styles.dateContainer}>
                    <Ionicons name="calendar-outline" size={16} color={textSecondary} />
                    <Text style={[styles.footerText, { color: textSecondary }]}>
                        {formatDate(status?.toLowerCase() === 'approved' || status?.toLowerCase() === 'completed' ? (item?.approved_at || timestamp) : timestamp)}
                    </Text>
                </View>

                {onDownload && (
                    <TouchableOpacity onPress={onDownload} style={styles.downloadLink}>
                        <Ionicons name="document-text-outline" size={16} color={accentColor} />
                        <Text style={[styles.downloadLabel, { color: accentColor }]}>
                            {isDark ? 'Download' : 'Invoice'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    planInfo: {
        flex: 1,
    },
    planName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    subText: {
        fontSize: 13,
        fontWeight: '500',
    },
    statusCapsule: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 100,
    },
    statusLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    detailBox: {
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    detailLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    detailValue: {
        fontSize: 13,
        fontWeight: '700',
        flex: 1,
        textAlign: 'right',
        marginLeft: 20,
    },
    amountValue: {
        fontSize: 16,
        fontWeight: '800',
    },
    divider: {
        height: 1,
        marginBottom: 12,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    footerText: {
        fontSize: 13,
        fontWeight: '600',
    },
    downloadLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    downloadLabel: {
        fontSize: 13,
        fontWeight: '700',
    },
});

export default TransactionCard;
