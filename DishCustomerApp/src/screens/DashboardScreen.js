import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getPlanDisplayValue, getBillingTypeDisplay, calculateBCNRecharge, formatDate, getServiceLabels, getServiceColors, calculateDaysRemaining } from '../utils/bcnCalculator';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, firestore } from '../services/firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, or, updateDoc, onSnapshot } from 'firebase/firestore';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { saveToCache, getFromCache, CACHE_KEYS } from '../utils/cacheManager';
import { checkPendingPayment } from '../utils/paymentUtils';
import CustomAlert from '../components/CustomAlert';
import useAlert from '../hooks/useAlert';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
    const { t } = useLanguage();
    const { themeColors, isDark } = useTheme();
    const [userData, setUserData] = useState(null);
    const [latestBroadcast, setLatestBroadcast] = useState(null);
    const [broadcasts, setBroadcasts] = useState([]);
    const [lastPayment, setLastPayment] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showNotifPopup, setShowNotifPopup] = useState(false);
    const { alertState, showAlert, hideAlert } = useAlert();

    useEffect(() => {
        fetchAllData();
        
        // Setup real-time listener for notifications
        const userId = auth.currentUser?.uid;
        let unsubscribe = () => {};
        if (userId) {
            unsubscribe = setupNotificationListener(userId);
        }
        
        return () => unsubscribe();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        const user = auth.currentUser;
        if (!user) return;

        try {
            // 1. Fetch User Data
            const cachedUser = await getFromCache(CACHE_KEYS.USER_DATA);
            if (cachedUser) setUserData(cachedUser);

            const userDoc = await getDoc(doc(firestore, "users", user.uid));
            if (userDoc.exists()) {
                const freshData = userDoc.data();
                setUserData(freshData);
                await saveToCache(CACHE_KEYS.USER_DATA, freshData);

                // 2. Initial fetch handled by listener setup now
                // await fetchNotifications(freshData);

                // 3. Fetch Last Payment for duration display
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
            }
        } catch (e) {
            console.log("Dashboard fetch error:", e);
        } finally {
            setLoading(false);
        }
    };

    const setupNotificationListener = (userId) => {
        try {
            const q = query(
                collection(firestore, "notifications"),
                or(
                    where("user_id", "==", userId),
                    where("recipient_role", "in", ["all", "filtered"])
                ),
                limit(50)
            );

            return onSnapshot(q, (snapshot) => {
                const allNotifs = [];
                snapshot.forEach(docSnap => {
                    const data = { id: docSnap.id, ...docSnap.data() };
                    
                    // Filtering Logic for Segmented Broadcasts
                    if (data.recipient_role === 'filtered' && data.filters) {
                        let matches = false;
                        data.filters.forEach(f => {
                            if (f.field === 'tag') {
                                if (f.key === 'village' && f.value === userData?.village) matches = true;
                                if (f.key === 'service_type' && f.value === userData?.service_type) matches = true;
                            }
                        });
                        if (!matches) return; // Skip if it doesn't match this user
                    }
                    
                    allNotifs.push(data);
                });

                // Sort in-memory to avoid index error
                allNotifs.sort((a, b) => {
                    const dateA = a.created_at?.toDate ? a.created_at.toDate() : (a.created_at ? new Date(a.created_at) : new Date(0));
                    const dateB = b.created_at?.toDate ? b.created_at.toDate() : (b.created_at ? new Date(b.created_at) : new Date(0));
                    return dateB - dateA;
                });

                // Support both old and new timestamp fields
                const normalized = allNotifs.map(n => ({
                    ...n,
                    timestamp: n.created_at || n.timestamp
                }));

                setBroadcasts(normalized.slice(0, 5));
                setLatestBroadcast(normalized.length > 0 ? normalized[0] : null);
            }, (error) => {
                console.log("Notification listener error:", error);
            });
        } catch (e) {
            console.log("Notification fetch error:", e);
            return () => {};
        }
    };


    const daysLeft = calculateDaysRemaining(userData?.expiry_date, userData);
    const activePlan = userData?.plan_name || 'None';
    const boxId = userData?.box_number || userData?.box_id || '---';

    // Color based on days remaining: green >= 15, orange < 15, red < 3
    const getDaysColor = (days) => {
        if (days <= 0) return '#EF4444';    // Red (Expired)
        if (days < 3) return '#F59E0B';     // Orange
        if (days < 15) return '#EAB308';    // Yellow
        return '#10B981';                   // Green
    };
    const daysColor = getDaysColor(daysLeft);

    const handleRecharge = async () => {
        setLoading(true);
        try {
            // 0. Restriction: Pending Payment
            const hasPending = await checkPendingPayment(auth.currentUser?.uid);
            if (hasPending) {
                showAlert({
                    title: t('recharge_restricted'),
                    message: t('recharge_restricted_msg'),
                    type: 'warning',
                    buttons: [{ text: "OK", onPress: hideAlert }]
                });
                return;
            }

            // 1. Restriction: Expiry < 7 days (only if a valid plan is active)
            const currentPlan = getPlanDisplayValue(userData);
            if (daysLeft >= 7 && currentPlan !== 'No Plan') {
                showAlert({
                    title: t('recharge_restricted'),
                    message: t('recharge_restricted_days').replace('{days}', daysLeft),
                    type: 'warning',
                    buttons: [{ text: "OK", onPress: hideAlert }]
                });
                return;
            }

            navigation.navigate('Plans', { userData });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    const getAlertTheme = (type) => {
        switch (type) {
            case 'urgent': return { color: '#EF4444', icon: 'alert-circle', label: 'URGENT' };
            case 'warning': return { color: '#F59E0B', icon: 'warning', label: 'WARNING' };
            case 'update': return { color: '#10B981', icon: 'cloud-upload', label: 'UPDATE' };
            default: return { color: '#3B82F6', icon: 'information-circle', label: 'INFO' };
        }
    };

    const formatBroadcastTime = (ts) => {
        if (!ts) return '';
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        if (isNaN(date.getTime())) return '';
        const now = new Date();
        const diff = now - date;
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };

    const markAsRead = async (id) => {
        try {
            const docRef = doc(firestore, "notifications", id);
            await updateDoc(docRef, { is_read: true });
            setBroadcasts(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (e) {
            console.log("Error marking notification as read:", e);
        }
    };

    const handleNotificationPress = (item) => {
        if (!item.is_read) markAsRead(item.id);
        setShowNotifPopup(false);

        const type = (item.type || item.data?.type || '').toLowerCase();
        const title = (item.title || '').toLowerCase();
        const msg = (item.message || '').toLowerCase();

        // Navigation logic based on keywords or type
        if (type.includes('payment') || title.includes('payment') || msg.includes('payment')) {
            navigation.navigate('History');
        } else if (type.includes('support') || type.includes('ticket') || title.includes('ticket')) {
            navigation.navigate('Support');
        } else if (type.includes('box') || title.includes('box')) {
            navigation.navigate('BoxRequest');
        } else {
            navigation.navigate('Notifications');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.background : '#F8FAFC' }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            {/* HEADER with shadow */}
            <SafeAreaView edges={['top']} style={[styles.safeHeader, { backgroundColor: isDark ? themeColors.card : '#FFF' }]}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <MaterialIcons name="menu" size={28} color={themeColors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>{t('my_dashboard')}</Text>
                    <View style={styles.topRight}>
                        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: isDark ? '#FFF1' : '#F1F5F9' }]} onPress={() => setShowNotifPopup(true)}>
                            <Ionicons name="notifications-outline" size={22} color={themeColors.textPrimary} />
                            {broadcasts.some(n => !n.is_read) && <View style={styles.notifDot} />}
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
            {/* Shadow line below header */}
            <View style={[styles.headerShadow, { backgroundColor: isDark ? '#0002' : '#0001' }]} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { backgroundColor: themeColors.background }]}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAllData} tintColor={themeColors.primary} />}
            >
                {/* WELCOME CARD */}
                <View style={[styles.welcomeCard, { backgroundColor: themeColors.primary }]}>
                    <Text style={styles.welcomeTitle}>
                        {t('hello')}, {userData?.name?.split(' ')[0] || 'User'}!
                    </Text>
                    <View style={styles.locationContainer}>
                        <MaterialIcons name="location-on" size={16} color="#FFF" style={{ opacity: 0.8 }} />
                        <Text style={styles.locationText}>
                            {userData?.village || 'Dish Fiber'}
                        </Text>
                    </View>
                    <Ionicons name="wifi" size={80} color="rgba(255,255,255,0.05)" style={styles.bgIcon} />
                </View>

                {/* STATS GRID */}
                <View style={styles.statsGrid}>
                    {/* LEFT CARD - Days Remaining */}
                    <View style={[styles.statItem, { backgroundColor: daysColor + '15', borderRadius: 20 }]}>
                        <Text style={[styles.statLabel, { color: daysColor }]}>
                            {getServiceLabels(userData?.service_type).daysLabel}
                        </Text>
                        <Text style={[styles.statValue, { color: daysColor }]}>
                            {daysLeft}
                        </Text>
                    </View>

                    {/* RIGHT CARD - Selected Plan */}
                    <View style={[styles.statItem, { backgroundColor: isDark ? themeColors.card : '#FFFFFF', borderRadius: 20, borderWidth: isDark ? 0 : 1, borderColor: '#F1F5F9' }]}>
                        <Text style={[styles.statLabel, { color: themeColors.textSubtle }]}>
                            {getServiceLabels(userData?.service_type).planLabel}
                        </Text>
                        <Text style={[styles.statValue, {
                            color: themeColors.primary,
                            fontSize: (getPlanDisplayValue(userData).length > 12) ? 18 : 24
                        }]}>
                            {getPlanDisplayValue(userData)}
                        </Text>
                        <Text style={[styles.statSub, { color: themeColors.textSecondary }]}>
                            {getServiceLabels(userData?.service_type).serviceName}
                        </Text>
                    </View>
                </View>



                {/* SUBSCRIPTION DETAILS */}
                <View style={[styles.infoCard, { backgroundColor: themeColors.card, marginTop: 20 }]}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>{t('subscription_details')}</Text>
                        <TouchableOpacity
                            style={[styles.manageBtn, { backgroundColor: isDark ? themeColors.primary + '20' : '#EEF2FF' }]}
                            onPress={handleRecharge}
                        >
                            <Text style={[styles.manageText, { color: themeColors.primary }]}>{t('manage')}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={[styles.iconBox, { backgroundColor: isDark ? themeColors.primary + '20' : '#EEF2FF' }]}>
                            <Ionicons name="calendar-outline" size={20} color={themeColors.primary} />
                        </View>
                        <View style={styles.infoText}>
                            <Text style={[styles.infoLabel, { color: themeColors.textSubtle }]}>
                                {getServiceLabels(userData?.service_type).expiryLabel}
                            </Text>
                            <Text style={[styles.infoValue, { color: themeColors.textPrimary }]}>
                                {userData?.expiry_date ? formatDate(userData.expiry_date, userData) : 'N/A'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={[styles.iconBox, { backgroundColor: isDark ? '#10B98120' : '#F0FDF4' }]}>
                            <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
                        </View>
                        <View style={styles.infoText}>
                            <Text style={[styles.infoLabel, { color: themeColors.textSubtle }]}>
                                {getServiceLabels(userData?.service_type).boxLabel}
                            </Text>
                            <Text style={[styles.infoValue, { color: themeColors.textPrimary }]}>{boxId}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={[styles.iconBox, { backgroundColor: isDark ? '#F59E0B20' : '#FFF7ED' }]}>
                            <Ionicons name="flash-outline" size={20} color="#F59E0B" />
                        </View>
                        <View style={styles.infoText}>
                            <Text style={[styles.infoLabel, { color: themeColors.textSubtle }]}>{t('service_status')}</Text>
                            <Text style={[styles.infoValue, { color: themeColors.textPrimary }]}>
                                {daysLeft > 0 ? t('active') : t('expired')}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* QUICK ACTIONS — only Recharge */}
                <View style={styles.actionsGrid}>
                    <TouchableOpacity style={[styles.actionTile, { backgroundColor: themeColors.card }]} onPress={handleRecharge}>
                        <View style={[styles.actionIcon, { backgroundColor: '#2563EB15' }]}>
                            <Ionicons name="flash" size={22} color="#2563EB" />
                        </View>
                        <Text style={[styles.actionLabel, { color: themeColors.textPrimary }]}>{t('plans_recharge')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionTile, { backgroundColor: themeColors.card }]} onPress={() => navigation.navigate('History')}>
                        <View style={[styles.actionIcon, { backgroundColor: '#10B98115' }]}>
                            <Ionicons name="receipt-outline" size={22} color="#10B981" />
                        </View>
                        <Text style={[styles.actionLabel, { color: themeColors.textPrimary }]}>{t('history')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionTile, { backgroundColor: themeColors.card }]} onPress={() => navigation.navigate('RaiseTicket')}>
                        <View style={[styles.actionIcon, { backgroundColor: '#8B5CF615' }]}>
                            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#8B5CF6" />
                        </View>
                        <Text style={[styles.actionLabel, { color: themeColors.textPrimary }]}>{t('support')}</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* NOTIFICATION POPUP */}
            <Modal
                visible={showNotifPopup}
                transparent
                animationType="fade"
                onRequestClose={() => setShowNotifPopup(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowNotifPopup(false)}
                >
                    <View style={styles.notifPopupAnchor}>
                        <View>
                            <View style={[styles.notifPopup, { backgroundColor: isDark ? themeColors.card : '#FFF' }]}>
                                <View style={styles.notifPopupHeader}>
                                    <Text style={[styles.notifPopupTitle, { color: isDark ? '#FFF' : '#0F172A' }]}>{t('notifications')}</Text>
                                    <TouchableOpacity onPress={() => setShowNotifPopup(false)}>
                                        <Ionicons name="close" size={20} color={isDark ? themeColors.textSubtle : '#94A3B8'} />
                                    </TouchableOpacity>
                                </View>

                                {broadcasts.length === 0 ? (
                                    <View style={styles.notifEmpty}>
                                        <Ionicons name="notifications-off-outline" size={36} color={isDark ? themeColors.textSubtle : '#CBD5E1'} />
                                        <Text style={[styles.notifEmptyText, { color: isDark ? themeColors.textSubtle : '#94A3B8' }]}>{t('no_notifications')}</Text>
                                    </View>
                                ) : (
                                    <ScrollView style={styles.notifList} showsVerticalScrollIndicator={false}>
                                        {broadcasts.map((item, index) => {
                                            const theme = getAlertTheme(item.type);
                                            return (
                                                <TouchableOpacity
                                                    key={item.id}
                                                    style={[
                                                        styles.notifItem,
                                                        { borderBottomColor: isDark ? '#FFF0A' : '#F1F5F9' },
                                                        !item.is_read && { backgroundColor: theme.color + '05' },
                                                        index === broadcasts.length - 1 && { borderBottomWidth: 0 }
                                                    ]}
                                                    onPress={() => handleNotificationPress(item)}
                                                >
                                                    <View style={[styles.notifItemDot, { backgroundColor: item.is_read ? (isDark ? '#334155' : '#E2E8F0') : theme.color }]} />
                                                    <View style={styles.notifItemContent}>
                                                        <Text style={[styles.notifItemTitle, { color: isDark ? '#FFF' : '#0F172A' }, !item.is_read && { fontWeight: '900' }]} numberOfLines={1}>{item.title}</Text>
                                                        <Text style={[styles.notifItemBody, { color: isDark ? themeColors.textSubtle : '#64748B' }]} numberOfLines={2}>{item.message}</Text>
                                                        <Text style={[styles.notifItemTime, { color: isDark ? themeColors.textSubtle : '#94A3B8' }]}>{formatBroadcastTime(item.timestamp)}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                )}

                                {/* View All button */}
                                <TouchableOpacity
                                    style={[styles.viewAllBtn, { borderTopColor: isDark ? '#FFF1' : '#F1F5F9' }]}
                                    onPress={() => {
                                        setShowNotifPopup(false);
                                        navigation.navigate('Notifications');
                                    }}
                                >
                                    <Text style={styles.viewAllText}>{t('view_all')}</Text>
                                    <Ionicons name="arrow-forward" size={16} color="#2563EB" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            <CustomAlert {...alertState} onDismiss={hideAlert} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeHeader: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        zIndex: 10,
    },
    headerShadow: { height: 1 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '900' },
    topRight: { flexDirection: 'row', gap: 12 },
    iconBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#FFF' },
    scrollContent: { paddingHorizontal: 20 },

    welcomeCard: {
        borderRadius: 24,
        padding: 24,
        marginTop: 16,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    welcomeTitle: { fontSize: 24, fontWeight: '900', color: '#FFF' },
    locationContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 5 },
    locationText: { fontSize: 13, fontWeight: '700', color: '#FFF', opacity: 0.9 },
    bgIcon: { position: 'absolute', right: -10, bottom: -10 },

    statsGrid: { flexDirection: 'row', gap: 16, marginTop: 20 },
    statItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 20,
        justifyContent: 'flex-start',
    },
    statLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4, textTransform: 'uppercase', textAlign: 'center' },
    statValue: { fontSize: 24, fontWeight: '900', marginVertical: 2, textAlign: 'center' },
    statSub: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

    announcementBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
    },
    announcementIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    announcementContent: { flex: 1 },
    announcementType: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5, marginBottom: 2 },
    announcementTitle: { fontSize: 13, fontWeight: '700' },

    actionsGrid: { flexDirection: 'row', gap: 12, marginTop: 20 },
    actionTile: {
        flex: 1,
        borderRadius: 20,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
    },
    actionIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionLabel: { fontSize: 11, fontWeight: '800' },

    infoCard: {
        borderRadius: 24,
        padding: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    cardTitle: { fontSize: 15, fontWeight: '900' },
    manageBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    manageText: { fontSize: 11, fontWeight: '900' },

    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
    iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    infoText: { flex: 1 },
    infoLabel: { fontSize: 10, fontWeight: '800' },
    infoValue: { fontSize: 14, fontWeight: '900', marginTop: 2 },

    // Notification Popup
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    notifPopupAnchor: {
        position: 'absolute',
        top: 100,
        right: 16,
        left: 16,
    },
    notifPopup: {
        borderRadius: 20,
        maxHeight: 420,
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        overflow: 'hidden',
    },
    notifPopupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 18,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    notifPopupTitle: { fontSize: 17, fontWeight: '900' },

    notifEmpty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    notifEmptyText: { fontSize: 14, fontWeight: '600' },

    notifList: { maxHeight: 280 },
    notifItem: {
        flexDirection: 'row',
        paddingHorizontal: 18,
        paddingVertical: 14,
        gap: 12,
        borderBottomWidth: 1,
    },
    notifItemDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
    notifItemContent: { flex: 1 },
    notifItemTitle: { fontSize: 14, fontWeight: '800', marginBottom: 3 },
    notifItemBody: { fontSize: 12, fontWeight: '500', lineHeight: 17, marginBottom: 4 },
    notifItemTime: { fontSize: 10, fontWeight: '700' },

    viewAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 16,
        borderTopWidth: 1,
    },
    viewAllText: { color: '#2563EB', fontSize: 14, fontWeight: '800' },
});

export default DashboardScreen;
