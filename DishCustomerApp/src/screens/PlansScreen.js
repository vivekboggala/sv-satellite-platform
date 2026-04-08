import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { firestore, auth } from '../services/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { calculateBCNRecharge, isPlanActiveForService, formatDate } from '../utils/bcnCalculator';
import { checkPendingPayment } from '../utils/paymentUtils';
import CustomAlert from '../components/CustomAlert';
import useAlert from '../hooks/useAlert';

const { width } = Dimensions.get('window');

const PlansScreen = ({ navigation, route }) => {
    const { themeColors, isDark } = useTheme();
    const { t } = useLanguage();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rechargeInfo, setRechargeInfo] = useState(null);
    const [availablePlans, setAvailablePlans] = useState([]);
    const [fetchingPlans, setFetchingPlans] = useState(false);
    const { alertState, showAlert, hideAlert } = useAlert();

    useEffect(() => {
        if (route.params?.userData) {
            setUserData(route.params.userData);
            setLoading(false);
            // Background refresh
            fetchData();
        } else {
            fetchData();
        }
    }, []);

    const fetchData = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userDoc = await getDoc(doc(firestore, "users", user.uid));
            if (userDoc.exists()) {
                const uData = userDoc.data();
                // 1. Normalize service type for matching
                const st = uData.service_type?.toLowerCase()?.replace(/[^a-z]/g, '') || '';

                // 2. Handle BCN Smart Pricing
                if (st === 'bcndigital') {
                    const info = calculateBCNRecharge(1);
                    setRechargeInfo({ ...info, service_type: 'bcn_digital', name: 'BCN Elite Digital' });
                }

                // 3. Fetch Fixed-Price plans from Firestore (for Fiber/Hathway)
                await fetchFirestorePlans(uData.service_type);
            }
        } catch (error) {
            console.log("Error fetching plan data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFirestorePlans = async (serviceType) => {
        setFetchingPlans(true);
        let plans = [];
        try {
            // Normalize serviceType for robust matching
            const st = serviceType?.toLowerCase()?.replace(/[^a-z]/g, '') || '';

            // Mapping service_type to plan categories used in database
            let category = 'fiber';
            if (st === 'bcndigital') category = 'cable';
            if (st === 'hathway') category = 'hathway';
            if (st === 'apfiber' || st === 'apfibernettv') category = 'fiber';

            const q = query(collection(firestore, "plans"), where("type", "==", category));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => {
                plans.push({ id: doc.id, ...doc.data() });
            });

            // Sort by price
            plans.sort((a, b) => a.price - b.price);

            // Tag "Basic" plans as recommended
            plans = plans.map((p, idx) => ({
                ...p,
                isRecommended: idx === 0 || p.name?.toLowerCase().includes('basic') || p.id?.includes('basic')
            }));

            // Re-sort to put recommended/cheapest first
            plans.sort((a, b) => {
                if (a.isRecommended && !b.isRecommended) return -1;
                if (!a.isRecommended && b.isRecommended) return 1;
                return a.price - b.price;
            });
        } catch (error) {
            console.log("Error fetching Firestore plans:", error);
        } finally {
            const st = serviceType?.toLowerCase()?.replace(/[^a-z]/g, '') || '';
            // FALLBACKS if Firestore is empty or for specific providers
            if (plans.length === 0) {
                if (st === 'apfiber' || st === 'apfibernettv') {
                    plans = [
                        { id: 'ap_basic', name: 'Home Basic', price: 350, speed: '30 Mbps', data_limit: 'Unlimited', type: 'fiber', isRecommended: true },
                        { id: 'ap_mini', name: 'Home Mini', price: 350, speed: '40 Mbps', data_limit: 'Unlimited', type: 'fiber' },
                        { id: 'ap_life', name: 'Home Life', price: 295, speed: '20 Mbps', data_limit: 'Unlimited', type: 'fiber' },
                        { id: 'ap_pie', name: 'Home Pie', price: 249, speed: '15 Mbps', data_limit: 'Unlimited', type: 'fiber' },
                        { id: 'ap_ultra', name: 'Home Ultra', price: 190, speed: '10 Mbps', data_limit: 'Unlimited', type: 'fiber' },
                        { id: 'ap_essential', name: 'Home Essential', price: 449, speed: '60 Mbps', data_limit: 'Unlimited', type: 'fiber' },
                        { id: 'ap_premium', name: 'Home Premium', price: 599, speed: '100 Mbps', data_limit: 'Unlimited', type: 'fiber' },
                        { id: 'ap_enterprise', name: 'Enterprise Basic', price: 1179, speed: '200 Mbps', data_limit: 'Unlimited', type: 'fiber' }
                    ];
                } else if (st === 'hathway') {
                    plans = [{
                        id: 'hathway_std',
                        name: 'Hathway Digital',
                        price: 280,
                        speed: 'HD Channels',
                        data_limit: '150+ Channels',
                        type: 'hathway',
                        description: 'Premium digital cable TV experience with HD clarity.',
                        isRecommended: true
                    }];
                }
            }

            // Final sort by price, but keep recommended at top if they are the basic ones
            plans.sort((a, b) => {
                if (a.isRecommended && !b.isRecommended) return -1;
                if (!a.isRecommended && b.isRecommended) return 1;
                return a.price - b.price;
            });

            setAvailablePlans(plans);
            setFetchingPlans(false);
        }
    };

    const calculateDaysRemaining = (expiryDate) => {
        if (!expiryDate) return 0;
        const expiry = expiryDate.toDate ? expiryDate.toDate() : new Date(expiryDate);
        if (isNaN(expiry.getTime())) return 0;
        const now = new Date();
        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    };

    const daysLeft = isPlanActiveForService(userData) ? calculateDaysRemaining(userData?.expiry_date) : 0;

    const getExpiryDisplay = () => {
        if (!userData?.expiry_date || !isPlanActiveForService(userData)) return 'N/A';
        const exp = userData.expiry_date.toDate ? userData.expiry_date.toDate() : new Date(userData.expiry_date);
        return exp.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    if (loading && !userData) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: isDark ? themeColors.background : '#F8FAFC' }]}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.background : '#F8FAFC' }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            {/* HEADER - FIXED AT TOP */}
            <SafeAreaView edges={['top']} style={[styles.headerArea, { backgroundColor: isDark ? themeColors.card : '#FFF' }]}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.backBtn}>
                        <MaterialIcons name="menu" size={24} color={isDark ? '#FFF' : '#0F172A'} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#0F172A' }]}>Select Plan</Text>
                    <View style={styles.headerRight} />
                </View>
            </SafeAreaView>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.content}>
                    {/* NETWORK PROVIDER CARD */}
                    <View style={styles.providerWrapper}>
                        <LinearGradient
                            colors={['#3B82F6', '#6366F1']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.providerCard}
                        >
                            <Text style={styles.providerLabel}>NETWORK PROVIDER</Text>
                            <Text style={styles.providerName}>
                                {userData?.service_type?.replace('_', ' ').toUpperCase() || 'BCN DIGITAL'}
                            </Text>
                            {/* Decorative element */}
                            <View style={styles.providerDecor}>
                                <Ionicons name="wifi-outline" size={80} color="rgba(255,255,255,0.1)" />
                            </View>
                        </LinearGradient>
                    </View>

                    {/* BCN SMART PRICING INFO BOX (Only for BCN users) */}
                    {(userData?.service_type?.toLowerCase()?.replace(/[^a-z]/g, '') === 'bcndigital') && (
                        <View style={[styles.smartBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                            <View style={styles.smartHeader}>
                                <View style={[styles.smartIconCircle, { backgroundColor: '#2563EB15' }]}>
                                    <Ionicons name="time-outline" size={20} color="#2563EB" />
                                </View>
                                <Text style={[styles.smartTitle, { color: isDark ? '#FFF' : '#0F172A' }]}>BCN Smart Pricing</Text>
                            </View>

                            <View style={styles.smartMetrics}>
                                <View style={[styles.smartMetricCard, { borderColor: isDark ? '#334155' : '#E2E8F0', backgroundColor: isDark ? themeColors.background : '#FFF' }]}>
                                    <Text style={[styles.smartMetricLabel, { color: isDark ? themeColors.textSubtle : '#64748B' }]}>VALID UNTIL</Text>
                                    <Text style={[styles.smartMetricValue, { color: '#2563EB' }]}>
                                        {rechargeInfo?.expiryDate ? formatDate(rechargeInfo.expiryDate) : 'N/A'}
                                    </Text>
                                </View>
                                <View style={[styles.smartMetricCard, { borderColor: isDark ? '#334155' : '#E2E8F0', backgroundColor: isDark ? themeColors.background : '#FFF' }]}>
                                    <Text style={[styles.smartMetricLabel, { color: isDark ? themeColors.textSubtle : '#64748B' }]}>DAILY RATE</Text>
                                    <Text style={[styles.smartMetricValue, { color: '#10B981' }]}>₹10.00 / day</Text>
                                </View>
                            </View>

                            <Text style={[styles.smartDesc, { color: isDark ? themeColors.textSecondary : '#64748B' }]}>
                                Your price is calculated based on {rechargeInfo?.remainingDays || 0} days remaining until target expiry.
                            </Text>
                        </View>
                    )}

                    {/* SECTION LABEL */}
                    <Text style={[styles.sectionLabel, { color: isDark ? '#FFF' : '#2563EB' }]}>
                        {(userData?.service_type?.toLowerCase()?.replace(/[^a-z]/g, '') === 'bcndigital') ? 'Smart Pricing' : 'Available Plans'}
                    </Text>

                    {/* BCN SMART PLAN (Conditional) */}
                    {(userData?.service_type?.toLowerCase()?.replace(/[^a-z]/g, '') === 'bcndigital') && (
                        <TouchableOpacity
                            style={[styles.planCard, { backgroundColor: isDark ? themeColors.card : '#FFF', borderColor: isDark ? '#2563EB40' : '#2563EB25', marginBottom: 20 }]}
                            onPress={() => {
                                const selectPlan = () => {
                                    navigation.navigate('ConfigureDuration', {
                                        rechargeInfo: { ...rechargeInfo, speed: 'HD Clarity' },
                                        userData
                                    });
                                };

                                if (userData?.is_approved && !userData?.expiry_date) {
                                    showAlert({
                                        title: "First Recharge?",
                                        message: "Please ensure your current box plan has expired. Recharge should only be done after box expiry. Your new validity will be calculated from the date of Admin approval, not the request date.",
                                        type: 'info',
                                        buttons: [
                                            { text: "Cancel", onPress: hideAlert },
                                            { text: "Proceed", onPress: () => { hideAlert(); selectPlan(); } }
                                        ]
                                    });
                                } else {
                                    selectPlan();
                                }
                            }}
                            activeOpacity={0.85}
                        >
                            <View style={styles.planHeader}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text style={[styles.planName, { color: isDark ? '#FFF' : '#0F172A' }]} numberOfLines={2}>BCN Elite Digital</Text>
                                    <View style={styles.planBadgeRow}>
                                        <Ionicons name="flash" size={12} color="#F59E0B" />
                                        <Text style={[styles.planBadgeText, { color: isDark ? themeColors.textSubtle : '#64748B' }]}>HD CLARITY</Text>
                                    </View>
                                </View>
                                <View style={styles.priceBlock}>
                                    <Text style={[styles.priceSymbol, { color: '#2563EB' }]}>₹</Text>
                                    <Text style={[styles.priceAmount, { color: '#2563EB' }]}>{rechargeInfo?.amount || 310}</Text>
                                    <Text style={[styles.priceUnit, { color: isDark ? themeColors.textSubtle : '#94A3B8' }]}>/ month</Text>
                                </View>
                            </View>
                            <View style={styles.featureRow}>
                                {['150+ Premium channels', 'HD Quality Support', 'Smart Hybrid Box'].map((feat, idx) => (
                                    <View key={idx} style={[styles.featurePill, { backgroundColor: isDark ? '#FFF1' : '#F8FAFC', borderColor: isDark ? '#FFF1' : '#E2E8F0' }]}>
                                        <Text style={[styles.featurePillText, { color: isDark ? themeColors.textPrimary : '#334155' }]}>• {feat}</Text>
                                    </View>
                                ))}
                            </View>
                        </TouchableOpacity>
                    )}

                    {/* FIRESTORE PLANS (Fiber / Hathway) */}
                    {fetchingPlans ? (
                        <ActivityIndicator size="small" color="#2563EB" style={{ marginTop: 20 }} />
                    ) : (
                        availablePlans.map((plan) => (
                            <TouchableOpacity
                                key={plan.id}
                                onPress={() => {
                                    const selectPlan = () => {
                                        navigation.navigate('ConfigureDuration', {
                                            rechargeInfo: {
                                                ...plan,
                                                amount: plan.price,
                                                service_type: userData?.service_type,
                                                speed: plan.speed || 'High Speed'
                                            },
                                            userData
                                        });
                                    };

                                    if (userData?.is_approved && !userData?.expiry_date) {
                                        showAlert({
                                            title: "First Recharge?",
                                            message: "Please ensure your current box plan has expired. Recharge should only be done after box expiry. Your new validity will be calculated from the date of Admin approval, not the request date.",
                                            type: 'info',
                                            buttons: [
                                                { text: "Cancel", onPress: hideAlert },
                                                { text: "Proceed", onPress: () => { hideAlert(); selectPlan(); } }
                                            ]
                                        });
                                    } else {
                                        selectPlan();
                                    }
                                }}
                                activeOpacity={0.85}
                            >
                                <View style={styles.planHeader}>
                                    <View style={{ flex: 1, marginRight: 10 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                                            <Text style={[styles.planName, { color: isDark ? '#FFF' : '#0F172A', marginBottom: 0 }]} numberOfLines={2}>{plan.name}</Text>
                                            {plan.isRecommended && (
                                                <View style={styles.recommendedBadge}>
                                                    <Text style={styles.recommendedText}>MOST POPULAR</Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.planBadgeRow}>
                                            <Ionicons name="speedometer-outline" size={12} color="#2563EB" />
                                            <Text style={[styles.planBadgeText, { color: isDark ? themeColors.textSubtle : '#64748B' }]}>{plan.speed || 'High Speed'}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.priceBlock}>
                                        <Text style={[styles.priceSymbol, { color: '#2563EB' }]}>₹</Text>
                                        <Text style={[styles.priceAmount, { color: '#2563EB' }]}>{plan.price}</Text>
                                        <Text style={[styles.priceUnit, { color: isDark ? themeColors.textSubtle : '#94A3B8' }]}>/ month</Text>
                                    </View>
                                </View>
                                <Text style={[styles.planDescText, { color: isDark ? themeColors.textSecondary : '#64748B', marginBottom: 15 }]}>
                                    {plan.description || 'Professional broadband service for your home.'}
                                </Text>
                                <View style={styles.featureRow}>
                                    <View style={[styles.featurePill, { backgroundColor: isDark ? '#FFF1' : '#F8FAFC', borderColor: isDark ? '#FFF1' : '#E2E8F0' }]}>
                                        <Text style={[styles.featurePillText, { color: isDark ? themeColors.textPrimary : '#334155' }]}>
                                            • {plan.type === 'hathway' ? (plan.data_limit || 'HD Quality') : (plan.data_limit || 'Unlimited Data')}
                                        </Text>
                                    </View>
                                    <View style={[styles.featurePill, { backgroundColor: isDark ? '#FFF1' : '#F8FAFC', borderColor: isDark ? '#FFF1' : '#E2E8F0' }]}>
                                        <Text style={[styles.featurePillText, { color: isDark ? themeColors.textPrimary : '#334155' }]}>
                                            • {plan.type === 'hathway' ? 'HD Support' : 'Pro Support'}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}

                    {availablePlans.length === 0 && !fetchingPlans && userData?.service_type !== 'bcn_digital' && (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <Ionicons name="search-outline" size={48} color={themeColors.textSubtle} />
                            <Text style={{ color: themeColors.textSubtle, marginTop: 10, textAlign: 'center' }}>
                                No plans available for {userData?.service_provider || 'this service'}.
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView >

            <CustomAlert {...alertState} onDismiss={hideAlert} />
        </View >
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    headerArea: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    topBar: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '900' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    avatarCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#FFF', fontSize: 14, fontWeight: '800' },

    scrollContent: { paddingBottom: 60 },
    content: { padding: 20 },

    providerWrapper: { borderRadius: 24, overflow: 'hidden', marginBottom: 24, elevation: 6, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 15 },
    providerCard: { padding: 28, minHeight: 120, justifyContent: 'center' },
    providerLabel: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, marginBottom: 6 },
    providerName: { fontSize: 28, fontWeight: '900', color: '#FFF' },
    providerDecor: { position: 'absolute', right: 16, bottom: 8 },

    smartBox: { borderRadius: 24, padding: 24, borderWidth: 1.5, borderStyle: 'dashed', marginBottom: 28 },
    smartHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
    smartIconCircle: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    smartTitle: { fontSize: 17, fontWeight: '900' },
    smartMetrics: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    smartMetricCard: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1 },
    smartMetricLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginBottom: 6 },
    smartMetricValue: { fontSize: 16, fontWeight: '900' },
    smartDesc: { fontSize: 12, fontWeight: '600', lineHeight: 18 },

    sectionLabel: { fontSize: 18, fontWeight: '900', marginBottom: 16, marginLeft: 4 },

    planCard: { borderRadius: 24, padding: 24, borderWidth: 1.5, borderStyle: 'dashed', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
    planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    planName: { fontSize: 22, fontWeight: '900', marginBottom: 4 },
    planBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    planBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
    priceBlock: { alignItems: 'flex-end' },
    priceSymbol: { fontSize: 16, fontWeight: '900' },
    priceAmount: { fontSize: 30, fontWeight: '900', lineHeight: 34 },
    priceUnit: { fontSize: 11, fontWeight: '700', marginTop: 2 },

    featureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    featurePill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
    featurePillText: { fontSize: 12, fontWeight: '700' },
    recommendedBadge: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    recommendedText: {
        color: '#FFF',
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    planDescText: { fontSize: 13, fontWeight: '500', lineHeight: 20 },
});

export default PlansScreen;
