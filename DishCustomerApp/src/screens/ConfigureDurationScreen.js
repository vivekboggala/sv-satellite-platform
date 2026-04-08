import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { calculateBCNRecharge, isBCNPlan } from '../utils/bcnCalculator';

const { width } = Dimensions.get('window');

const ConfigureDurationScreen = ({ navigation, route }) => {
    const { themeColors, isDark } = useTheme();
    const { rechargeInfo, userData } = route.params || {};
    const [selectedMonths, setSelectedMonths] = useState(1);

    const basePrice = rechargeInfo?.amount || 280;
    const serviceType = rechargeInfo?.service_type || 'bcn_digital';

    const getDynamicOptions = () => {
        const isBCN = isBCNPlan(rechargeInfo);

        if (isBCN) {
            return [1, 3, 6, 12].map(m => {
                const calc = calculateBCNRecharge(m);
                return { months: m, label: `${m} Month${m > 1 ? 's' : ''}`, total: calc.amount, discount: 0 };
            });
        }

        // For Fiber / Hathway - use fixed basePrice with promotional free months
        return [1, 3, 6, 12].map(m => {
            let freeMonths = 0;
            const st = serviceType?.toLowerCase()?.replace(/[^a-z]/g, '') || '';
            const isHathway = st.includes('hathway');
            const isFiber = st.includes('fiber') || st.includes('apfiber');

            // Hathway has NO free months (per user request)
            if (!isHathway) {
                if (m === 6) freeMonths = 1;
                if (m === 12) freeMonths = 2;
            }

            const totalPayable = basePrice * m;
            const totalMonthsBenefit = m + freeMonths;

            return {
                months: m,
                freeMonths,
                label: `${m} Month${m > 1 ? 's' : ''}${freeMonths > 0 ? ` + ${freeMonths} Free` : ''}`,
                total: totalPayable,
                benefitText: freeMonths > 0 ? `Get ${totalMonthsBenefit} months for the price of ${m}` : null
            };
        });
    };

    const durationOptions = getDynamicOptions();
    const selectedOption = durationOptions.find(opt => opt.months === selectedMonths) || durationOptions[0];

    const handleProceed = () => {
        const st = serviceType?.toLowerCase()?.replace(/[^a-z]/g, '') || '';
        const isHathway = st === 'hathway';

        navigation.navigate('Payment', {
            paymentData: {
                ...rechargeInfo,
                amount: selectedOption.total,
                base_months: selectedMonths,
                bonus_months: selectedOption.freeMonths || 0,
                total_months: selectedMonths + (selectedOption.freeMonths || 0),
                plan_name: rechargeInfo?.name || (isHathway ? 'Hathway Digital' : (serviceType === 'bcn_digital' ? 'BCN Digital' : 'High-speed Fiber')),
                plan_speed: rechargeInfo?.speed || (isHathway ? 'HD Channels' : (serviceType === 'bcn_digital' ? null : '50 Mbps')),
                service_type: serviceType
            }
        });
    };

    const getDisplayAmount = () => {
        return selectedOption.total;
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.background : '#F8FAFC' }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            <SafeAreaView edges={['top']} style={[styles.headerArea, { backgroundColor: isDark ? themeColors.card : '#FFF' }]}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <MaterialIcons name="arrow-back" size={24} color={isDark ? '#FFF' : '#0F172A'} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#0F172A' }]}>Configure Duration</Text>
                    <View style={styles.headerRight} />
                </View>
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.scrollArea} showsVerticalScrollIndicator={false}>
                {/* SELECTED PLAN CARD */}
                <View style={[styles.selectedPlanCard, { backgroundColor: isDark ? themeColors.card : '#FFF', borderColor: isDark ? '#2563EB40' : '#E2E8F0' }]}>
                    <Text style={[styles.cardHeaderLabel, { color: isDark ? themeColors.textSubtle : '#94A3B8' }]}>SELECTED PLAN</Text>
                    <View style={styles.planInfoRow}>
                        <View>
                            <Text style={[styles.planName, { color: isDark ? '#FFF' : '#0F172A' }]}>
                                {rechargeInfo?.name || (serviceType === 'bcn_digital' ? 'BCN Digital' : 'High-speed Fiber')}
                            </Text>
                            <Text style={styles.planPrice}>
                                ₹{basePrice} Monthly
                            </Text>
                        </View>
                        <View style={styles.checkCircle}>
                            <Ionicons name="checkmark" size={16} color="#2563EB" />
                        </View>
                    </View>
                </View>

                {/* DURATION SELECTION */}
                <View style={styles.sectionHeader}>
                    <Ionicons name="time-outline" size={18} color={isDark ? '#FFF' : '#0F172A'} />
                    <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#0F172A' }]}>Select Recharge Duration</Text>
                </View>

                <View style={styles.grid}>
                    {durationOptions.map((option) => {
                        const isSelected = selectedMonths === option.months;
                        return (
                            <TouchableOpacity
                                key={option.months}
                                style={[
                                    styles.optionCard,
                                    { backgroundColor: isDark ? themeColors.card : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
                                    isSelected && { backgroundColor: '#2563EB', borderColor: '#2563EB' }
                                ]}
                                onPress={() => setSelectedMonths(option.months)}
                                activeOpacity={0.8}
                            >
                                {option.discount > 0 && (
                                    <View style={styles.saveBadge}>
                                        <Text style={[styles.saveText, isSelected && { color: '#2563EB' }]}>
                                            SAVE {option.discount}%
                                        </Text>
                                    </View>
                                )}
                                <Text style={[styles.optionLabel, { color: isDark ? '#FFF' : '#0F172A' }, isSelected && { color: '#FFF' }]}>
                                    {option.label}
                                </Text>
                                <Text style={[styles.optionTotal, { color: isDark ? themeColors.textSubtle : '#475569' }, isSelected && { color: 'rgba(255,255,255,0.8)' }]}>
                                    ₹{option.total} Total
                                </Text>
                                {option.benefitText && (
                                    <Text style={[styles.benefitText, isSelected && { color: 'rgba(255,255,255,0.9)' }]}>
                                        {option.benefitText}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* PAYABLE AMOUNT */}
                <View style={styles.payableContainer}>
                    <View style={[styles.secureBadge, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
                        <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                        <Text style={styles.secureText}>Secure Payment</Text>
                    </View>
                    <Text style={[styles.payableLabel, { color: isDark ? themeColors.textSubtle : '#94A3B8' }]}>PAYABLE AMOUNT</Text>
                    <Text style={[styles.payableValue, { color: isDark ? '#FFF' : '#0F172A' }]}>₹{getDisplayAmount()}</Text>
                </View>

                {/* PROCEED BUTTON */}
                <TouchableOpacity
                    style={styles.proceedBtn}
                    onPress={handleProceed}
                    activeOpacity={0.9}
                >
                    <Text style={styles.proceedText}>Proceed to Checkout</Text>
                    <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
                </TouchableOpacity>

                <Text style={[styles.footerNote, { color: isDark ? themeColors.textSubtle : '#94A3B8' }]}>
                    Prices include all applicable taxes and convenience fees.
                </Text>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerArea: { borderBottomWidth: 0 },
    topBar: {
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '800' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    notifBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notifDot: {
        position: 'absolute',
        top: 10,
        right: 12,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#EF4444',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: { color: '#FFF', fontSize: 13, fontWeight: '800' },

    scrollArea: { padding: 24 },

    selectedPlanCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        marginBottom: 30,
    },
    cardHeaderLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 12 },
    planInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    planName: { fontSize: 18, fontWeight: '900' },
    planPrice: { fontSize: 14, fontWeight: '700', color: '#2563EB', marginTop: 4 },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#2563EB',
        justifyContent: 'center',
        alignItems: 'center',
    },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
    sectionTitle: { fontSize: 14, fontWeight: '800' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    optionCard: {
        width: (width - 64) / 2,
        height: 120,
        borderRadius: 20,
        borderWidth: 1.5,
        padding: 20,
        justifyContent: 'center',
    },
    benefitText: { fontSize: 9, fontWeight: '800', color: '#10B981', marginTop: 4 },
    saveBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    saveText: { color: '#059669', fontSize: 9, fontWeight: '900' },
    optionLabel: { fontSize: 20, fontWeight: '900' },
    optionTotal: { fontSize: 12, fontWeight: '700', marginTop: 4 },

    payableContainer: { marginTop: 40, alignItems: 'center' },
    secureBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        marginBottom: 15,
    },
    secureText: { fontSize: 11, fontWeight: '800', color: '#10B981' },
    payableLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
    payableValue: { fontSize: 48, fontWeight: '900', marginTop: 5 },

    proceedBtn: {
        backgroundColor: '#2563EB',
        height: 64,
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30,
        gap: 12,
        elevation: 8,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
    },
    proceedText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
    footerNote: {
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 20,
    },
});

export default ConfigureDurationScreen;
