import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getPlanDisplayValue, getBillingTypeDisplay, formatDate, getServiceLabels, getServiceColors, calculateDaysRemaining } from '../utils/bcnCalculator';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { firestore, auth } from '../services/firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { checkPendingPayment } from '../utils/paymentUtils';
import CustomAlert from '../components/CustomAlert';
import useAlert from '../hooks/useAlert';

const { width } = Dimensions.get('window');

const MySubscriptionScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const { t } = useLanguage();
    const [userData, setUserData] = useState(null);
    const [lastPayment, setLastPayment] = useState(null);
    const [loading, setLoading] = useState(true);
    const { alertState, showAlert, hideAlert } = useAlert();

    useEffect(() => {
        fetchSubscriptionData();
    }, []);

    const fetchSubscriptionData = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userDoc = await getDoc(doc(firestore, "users", user.uid));
            if (userDoc.exists()) {
                setUserData(userDoc.data());
            }

            const payQ = query(
                collection(firestore, "payments"),
                where("user_id", "==", user.uid),
                where("status", "==", "completed"),
                orderBy("timestamp", "desc"),
                limit(1)
            );
            const paySnap = await getDocs(payQ);
            if (!paySnap.empty) {
                setLastPayment(paySnap.docs[0].data());
            }

        } catch (error) {
            console.log("Error fetching subscription:", error);
        } finally {
            setLoading(false);
        }
    };


    const daysLeft = calculateDaysRemaining(userData?.expiry_date, userData);
    const labels = getServiceLabels(userData?.service_type);
    const planName = getPlanDisplayValue(userData);

    // Color based on days remaining: green >= 15, orange < 15, red < 3
    const getDaysColor = (days) => {
        if (days <= 0) return '#EF4444';
        if (days < 3) return '#F59E0B';
        if (days < 15) return '#EAB308';
        return '#10B981';
    };
    const daysColor = getDaysColor(daysLeft);

    // Display Plan Price: Monthly rate for Fiber/Hathway, Days * 10 for BCN
    const planPriceDisplay = labels.isBCN
        ? `₹${daysLeft * 10}`
        : (lastPayment?.plan_price ? `₹${lastPayment.plan_price}` : `₹${lastPayment?.amount || '---'}`);

    const InfoLine = ({ icon, label, value }) => (
        <View style={styles.infoLine}>
            <View style={styles.infoLineLeft}>
                <Feather name={icon} size={18} color={themeColors.textSubtle} />
                <Text style={[styles.infoLineLabel, { color: themeColors.textPrimary }]}>{label}</Text>
            </View>
            <Text style={[styles.infoLineValue, { color: themeColors.textPrimary }]}>{value}</Text>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
                <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            <SafeAreaView edges={['top']} style={[styles.topNav, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.headerBtn}>
                    <MaterialIcons name="menu" size={24} color={themeColors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.pageTitle, { color: themeColors.textPrimary }]}>{t('subscription_details')}</Text>
                <View style={{ width: 44 }} />
            </SafeAreaView>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* UNIFIED MESH BACKGROUND */}
                <View style={styles.meshContainer}>
                    <LinearGradient
                        colors={isDark ? ['#1E293B', '#0F172A'] : ['#F8FAFC', '#E2E8F0']}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={[styles.meshSpot1, { backgroundColor: themeColors.primary + '15' }]} />
                    <View style={[styles.meshSpot2, { backgroundColor: themeColors.primary + '05' }]} />
                </View>

                <View style={styles.content}>
                    {/* PRIMARY PLAN CARD */}
                    <View style={[styles.planCard, { backgroundColor: themeColors.card }]}>
                        <View style={styles.planCardHeader}>
                            <View style={[styles.statusBadge, { backgroundColor: daysLeft > 0 ? (daysColor + '20') : '#EF444420' }]}>
                                <View style={[styles.dot, { backgroundColor: daysLeft > 0 ? daysColor : '#EF4444' }]} />
                                <Text style={[styles.statusText, { color: daysLeft > 0 ? daysColor : '#EF4444' }]}>
                                    {daysLeft > 0 ? t('active') : t('expired')}
                                </Text>
                            </View>
                            <MaterialCommunityIcons name="wifi" size={32} color={daysLeft > 0 ? daysColor : '#EF4444'} style={styles.wifiIcon} />
                        </View>

                        <Text style={[styles.planNameTitle, { color: themeColors.textPrimary }]}>{planName}</Text>
                        <Text style={[styles.planSubTitle, { color: themeColors.textSubtle }]}>
                            {userData?.service_type?.toUpperCase()?.replace('_', ' ')} • {getServiceLabels(userData?.service_type).boxLabel}: {userData?.box_number || '---'}
                        </Text>

                        <View style={styles.metricsRow}>
                            {/* LEFT METRIC - Days/Billing */}
                            <View style={[styles.metricBox, { backgroundColor: isDark ? '#FFF0' : '#F8FAFC' }]}>
                                <View style={styles.metricHeader}>
                                    <Feather name="calendar" size={14} color={themeColors.textSubtle} />
                                    <Text style={[styles.metricLabel, { color: themeColors.textSubtle }]}>
                                        {getServiceLabels(userData?.service_type).daysLabel}
                                    </Text>
                                </View>
                                <Text style={[styles.metricValue, { color: daysLeft > 0 ? daysColor : '#EF4444' }]}>
                                    {daysLeft} <Text style={styles.metricUnit}>{t('days')}</Text>
                                </Text>
                                <Text style={[styles.metricSubText, { color: themeColors.textSubtle }]}>
                                    {getBillingTypeDisplay(userData?.service_type)} {t('cycle')}
                                </Text>
                            </View>

                            {/* RIGHT METRIC - Speed/Amount */}
                            <View style={[styles.metricBox, { backgroundColor: isDark ? '#FFF0' : '#F8FAFC' }]}>
                                <View style={styles.metricHeader}>
                                    <Feather name={labels.isBCN ? "credit-card" : "zap"} size={14} color={themeColors.textSubtle} />
                                    <Text style={[styles.metricLabel, { color: themeColors.textSubtle }]}>
                                        {labels.planLabel}
                                    </Text>
                                </View>
                                <Text style={[styles.metricValue, { color: themeColors.primary }]}>
                                    {getPlanDisplayValue(userData)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* DETAILED INFO SECTION */}
                    <View style={[styles.detailSection, { backgroundColor: themeColors.card }]}>
                        <Text style={[styles.detailTitle, { color: themeColors.textPrimary }]}>{t('detailed_info')}</Text>

                        <InfoLine
                            icon="calendar"
                            label={t('start_date')}
                            value={lastPayment?.approved_at ? new Date(lastPayment.approved_at.toDate()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '---'}
                        />
                        <View style={styles.lineDivider} />
                        <InfoLine
                            icon="calendar"
                            label={getServiceLabels(userData?.service_type).expiryLabel}
                            value={userData?.expiry_date ? formatDate(userData.expiry_date, userData) : '---'}
                        />
                        <View style={styles.lineDivider} />
                        <InfoLine
                            icon="clock"
                            label={labels.durationLabel}
                            value={labels.isBCN ? "Perpetual Cycle" : `${lastPayment?.months || lastPayment?.total_months || 1} Month(s)`}
                        />
                    </View>

                    {/* WARNING BOX */}
                    <View style={[styles.warningBox, { backgroundColor: isDark ? '#F59E0B15' : '#FFFBEB' }]}>
                        <Ionicons name="information-circle" size={18} color="#F59E0B" />
                        <Text style={[styles.warningText, { color: '#F59E0B' }]}>
                            {t('recharge_warning')}
                        </Text>
                    </View>

                    {/* ACTIONS — Updated button themes */}
                    {/* Always show button, but guard with Alert for consistency with Dashboard */}
                    <TouchableOpacity
                        onPress={async () => {
                            // Restriction a: Pending Payment
                            const hasPending = await checkPendingPayment(auth.currentUser?.uid);
                            if (hasPending) {
                                showAlert({
                                    title: t('recharge_restricted'),
                                    message: t('recharge_restricted_msg'),
                                    type: 'warning',
                                    buttons: [{ text: 'OK', onPress: hideAlert }]
                                });
                                return;
                            }

                            // Restriction b: Expiry < 7 days
                            if (daysLeft >= 7) {
                                showAlert({
                                    title: t('recharge_restricted'),
                                    message: t('recharge_restricted_days').replace('{days}', daysLeft),
                                    type: 'warning',
                                    buttons: [{ text: 'OK', onPress: hideAlert }]
                                });
                                return;
                            }
                            navigation.navigate('Plans', { userData });
                        }}
                        style={[styles.rechargeBtnWrapper, daysLeft >= 7 && { opacity: 0.6 }]}
                    >
                        <LinearGradient
                            colors={daysLeft >= 7 ? ['#94A3B8', '#64748B'] : ['#2563EB', '#1E40AF']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.rechargeBtn}
                        >
                            <MaterialIcons name="flash-on" size={20} color="#FFF" />
                            <Text style={styles.rechargeBtnText}>{t('recharge_now')}</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => navigation.navigate('History')}
                        style={[styles.historyBtn, { backgroundColor: isDark ? '#2563EB15' : '#EFF6FF', borderColor: '#2563EB30' }]}
                    >
                        <Ionicons name="receipt-outline" size={18} color="#2563EB" />
                        <Text style={[styles.historyBtnText, { color: '#2563EB' }]}>{t('view_payment_history')}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <CustomAlert {...alertState} onDismiss={hideAlert} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    meshContainer: { ...StyleSheet.absoluteFillObject, height: 400, overflow: 'hidden' },
    meshSpot1: { position: 'absolute', top: -100, left: -50, width: 300, height: 300, borderRadius: 150 },
    meshSpot2: { position: 'absolute', top: 50, right: -100, width: 350, height: 350, borderRadius: 175 },

    scrollContent: { paddingBottom: 60 },
    topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
    headerBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    pageTitle: { fontSize: 18, fontWeight: '900' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', position: 'relative' },
    notifDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#FFF' },
    userCircle: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    userInitial: { color: '#FFF', fontSize: 14, fontWeight: '900' },

    content: { padding: 20 },
    planCard: { borderRadius: 32, padding: 24, paddingBottom: 16, marginBottom: 20, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 15 },
    planCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 30, gap: 5 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    wifiIcon: { opacity: 0.8 },
    planNameTitle: { fontSize: 28, fontWeight: '900', marginBottom: 4 },
    planSubTitle: { fontSize: 13, fontWeight: '600', marginBottom: 24 },

    metricsRow: { flexDirection: 'row', gap: 12 },
    metricBox: { flex: 1, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)' },
    metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    metricLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    metricValue: { fontSize: 24, fontWeight: '900' },
    metricUnit: { fontSize: 12, opacity: 0.7 },
    metricSubText: { fontSize: 10, fontWeight: '700', marginTop: 4 },

    detailSection: { borderRadius: 30, padding: 24, marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
    detailTitle: { fontSize: 17, fontWeight: '900', marginBottom: 20 },
    infoLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
    infoLineLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    infoLineLabel: { fontSize: 14, fontWeight: '700' },
    infoLineValue: { fontSize: 14, fontWeight: '900' },
    lineDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginLeft: 30 },

    warningBox: { flexDirection: 'row', padding: 16, borderRadius: 16, gap: 12, alignItems: 'center', marginBottom: 30 },
    warningText: { flex: 1, fontSize: 12, fontWeight: '800', lineHeight: 18 },

    rechargeBtnWrapper: { borderRadius: 20, overflow: 'hidden', marginBottom: 12, elevation: 4 },
    rechargeBtn: { height: 64, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10 },
    rechargeBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },

    historyBtn: { height: 64, borderRadius: 20, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10 },
    historyBtnText: { fontSize: 15, fontWeight: '900', letterSpacing: 0.5 }
});

export default MySubscriptionScreen;
