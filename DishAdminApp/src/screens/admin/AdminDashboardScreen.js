import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, RefreshControl, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { firestore, auth } from '../../services/firebase';
import { collection, query, where, onSnapshot, getDoc, doc, limit, orderBy, getDocs, getCountFromServer, getAggregateFromServer, sum, setDoc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');

const AdminDashboardScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [adminData, setAdminData] = useState(null);
    const [stats, setStats] = useState({
        totalCustomers: 0,
        pendingApprovals: 0,
        activePulse: 0,
        totalRevenue: 0,
        pendingPayments: 0,
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [broadcasts, setBroadcasts] = useState([]);
    const [unreadNotifs, setUnreadNotifs] = useState(false);
    const [showNotifPopup, setShowNotifPopup] = useState(false);

    useEffect(() => {
        fetchData();
        const unsubStatsAndActivity = setupListeners();
        const unsubNotifications = setupNotificationListener();
        
        return () => {
            unsubStatsAndActivity();
            unsubNotifications();
        };
    }, []);

    const handleNotificationPress = (item) => {
        setUnreadNotifs(false);
        setShowNotifPopup(false);

        const title = (item.title || '').toLowerCase();
        const msg = (item.message || '').toLowerCase();
        const type = (item.type || item.data?.type || '').toLowerCase();

        if (title.includes('payment') || msg.includes('payment')) {
            if (msg.includes('pending') || title.includes('pending')) {
                navigation.navigate('PendingPayments');
            } else {
                navigation.navigate('TransactionLedger');
            }
        } else if (title.includes('registration') || msg.includes('registered')) {
            navigation.navigate('NewRegistrations');
        } else if (title.includes('support') || type.includes('support') || title.includes('ticket')) {
            navigation.navigate('SupportTickets');
        } else if (title.includes('box') || msg.includes('box') || type.includes('box')) {
            navigation.navigate('BoxRequests');
        } else if (title.includes('password') || msg.includes('password')) {
            navigation.navigate('PasswordResets');
        } else {
            navigation.navigate('BroadcastAlert');
        }
    };

    const setupNotificationListener = () => {
        try {
            // Fetch notifications sent to admins or sent BY admins (broadcasts)
            const { or } = require('firebase/firestore');
            const q = query(
                collection(firestore, "notifications"),
                or(
                    where("recipient_role", "in", ["admin", "all"]),
                    where("sender_role", "==", "admin")
                ),
                limit(50)
            );

            return onSnapshot(q, (snapshot) => {
                const fetched = [];
                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    fetched.push({ id: docSnap.id, ...data });
                });

                // Sort in-memory to bypass index requirement
                fetched.sort((a, b) => {
                    const dateA = a.created_at?.toDate ? a.created_at.toDate() : (a.created_at ? new Date(a.created_at) : new Date(0));
                    const dateB = b.created_at?.toDate ? b.created_at.toDate() : (b.created_at ? new Date(b.created_at) : new Date(0));
                    return dateB - dateA;
                });

                const finalResults = fetched.slice(0, 20);
                setBroadcasts(finalResults);

                if (finalResults.length > 0) {
                    const latest = finalResults[0].created_at?.toDate ? finalResults[0].created_at.toDate() : new Date();
                    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    if (latest > twentyFourHoursAgo) setUnreadNotifs(true);
                }
            }, (error) => {
                console.log("Admin notification listener error:", error);
            });
        } catch (e) {
            console.log("Error setting up notification listener:", e);
            return () => {};
        }
    };

    const fetchData = async () => {
        try {
            await fetchAdminProfile();
            await syncSystemStats();
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchAdminProfile = async () => {
        const user = auth.currentUser;
        if (user) {
            const adminDoc = await getDoc(doc(firestore, 'admins', user.uid));
            if (adminDoc.exists()) {
                setAdminData(adminDoc.data());
            }
        }
    };

    const setupListeners = () => {
        // System Stats listener (Ultra-fast, 1 read instead of thousands)
        const unsubStats = onSnapshot(doc(firestore, 'system_stats', 'overview'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setStats(prev => ({
                    ...prev,
                    totalCustomers: data.totalCustomers || 0,
                    pendingApprovals: data.pendingApprovals || 0,
                    totalRevenue: data.totalRevenue || 0,
                    pendingPayments: data.pendingPayments || 0,
                }));
            }
        });

        // Recent Activity listener
        const unsubActivity = onSnapshot(
            query(
                collection(firestore, 'payments'),
                where('status', '==', 'completed'),
                orderBy('timestamp', 'desc'),
                limit(5)
            ),
            (snapshot) => {
                const recent = [];
                snapshot.forEach(doc => {
                    recent.push({ id: doc.id, ...doc.data() });
                });
                setRecentActivity(recent);
            }
        );

        return () => {
            unsubStats();
            unsubActivity();
        };
    };

    const syncSystemStats = async () => {
        try {
            const usersSnap = await getCountFromServer(collection(firestore, 'users'));
            const totalCustomers = usersSnap.data().count;

            const pendingUsersSnap = await getCountFromServer(query(collection(firestore, 'users'), where('is_approved', '==', false)));
            const pendingApprovals = pendingUsersSnap.data().count;

            const pendingPaymentsSnap = await getCountFromServer(query(collection(firestore, 'payments'), where('status', '==', 'pending')));
            const pendingPayments = pendingPaymentsSnap.data().count;

            const approvedPaymentsSnap = await getAggregateFromServer(
                query(collection(firestore, 'payments'), where('status', '==', 'completed')), 
                { totalRevenue: sum('amount') }
            );
            const totalRevenue = approvedPaymentsSnap.data().totalRevenue || 0;

            await setDoc(doc(firestore, 'system_stats', 'overview'), {
                totalCustomers,
                pendingApprovals,
                pendingPayments,
                totalRevenue,
                updated_at: new Date()
            });
        } catch (error) {
            console.error('Failed to sync stats: ' + error.message);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const StatCard = ({ title, value, icon, iconColor, onPress }) => (
        <TouchableOpacity
            style={[styles.statCard, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.statIconContainer, { backgroundColor: iconColor + '15' }]}>
                <Ionicons name={icon} size={24} color={iconColor} />
            </View>
            <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{value}</Text>
            <Text style={[styles.statTitle, { color: themeColors.textSecondary }]}>{title}</Text>
        </TouchableOpacity>
    );

    const ActivityItem = ({ item, isLast }) => (
        <View style={[
            styles.activityItem,
            !isLast && { borderBottomWidth: 1, borderBottomColor: themeColors.borderLight }
        ]}>
            <View style={[styles.activityIconBox, { backgroundColor: themeColors.primary + '15' }]}>
                <Ionicons name="wallet-outline" size={20} color={themeColors.primary} />
            </View>
            <View style={styles.activityInfo}>
                <Text style={[styles.activityName, { color: themeColors.textPrimary }]}>
                    {item.user_name || 'User'}
                </Text>
                <Text style={[styles.activityDetail, { color: themeColors.textSubtle }]}>
                    UTR: {item.utr_number || 'N/A'}
                </Text>
            </View>
            <Text style={[styles.activityAmount, { color: themeColors.success }]}>
                +₹{item.amount}
            </Text>
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
            <StatusBar style="light" />

            {/* Standard Header */}
            <SafeAreaView
                edges={['top']}
                style={[
                    styles.header,
                    {
                        backgroundColor: themeColors.background,
                        borderBottomColor: themeColors.borderLight
                    }
                ]}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        onPress={() => navigation.openDrawer()}
                        style={styles.headerBtn}
                    >
                        <Ionicons name="menu" size={28} color={themeColors.textPrimary} />
                    </TouchableOpacity>

                    <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Dashboard</Text>

                    <TouchableOpacity
                        onPress={() => {
                            setShowNotifPopup(true);
                            setUnreadNotifs(false);
                        }}
                        style={[styles.avatarBtn, { borderColor: themeColors.borderLight, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}>
                        <Ionicons name="notifications-outline" size={20} color={isDark ? themeColors.textPrimary : themeColors.primary} />
                        {unreadNotifs && <View style={[styles.notifDot, { borderColor: themeColors.card }]} />}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[themeColors.primary]}
                        tintColor={themeColors.primary}
                    />
                }
            >
                {/* Welcome Section */}
                <View style={styles.welcomeSection}>
                    <Text style={[styles.welcomeText, { color: themeColors.textSubtle }]}>Welcome back,</Text>
                    <Text style={[styles.adminName, { color: themeColors.textPrimary }]}>
                        {adminData?.name || 'Administrator'}
                    </Text>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <StatCard
                        title="Pending Payments"
                        value={stats.pendingPayments}
                        icon="card-outline"
                        iconColor="#3B82F6"
                        onPress={() => navigation.navigate('PendingPayments')}
                    />
                    <StatCard
                        title="Total Revenue"
                        value={`₹${(stats.totalRevenue || 0).toLocaleString()}`}
                        icon="trending-up-outline"
                        iconColor="#10B981"
                        onPress={() => navigation.navigate('Reports')}
                    />
                    <StatCard
                        title="New Registrations"
                        value={stats.pendingApprovals}
                        icon="person-add-outline"
                        iconColor="#F59E0B"
                        onPress={() => navigation.navigate('NewRegistrations')}
                    />
                    <StatCard
                        title="Total Users"
                        value={stats.totalCustomers}
                        icon="people-outline"
                        iconColor="#8B5CF6"
                        onPress={() => navigation.navigate('Customers')}
                    />
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Quick Actions</Text>
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}
                            onPress={() => navigation.navigate('SupportTickets')}
                        >
                            <Ionicons name="chatbubbles-outline" size={24} color={themeColors.primary} />
                            <Text style={[styles.actionText, { color: themeColors.textPrimary }]}>Support</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}
                            onPress={() => navigation.navigate('BroadcastAlert')}
                        >
                            <Ionicons name="notifications-outline" size={24} color={themeColors.primary} />
                            <Text style={[styles.actionText, { color: themeColors.textPrimary }]}>Broadcast</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}
                            onPress={() => navigation.navigate('ExportData')}
                        >
                            <Ionicons name="download-outline" size={24} color={themeColors.primary} />
                            <Text style={[styles.actionText, { color: themeColors.textPrimary }]}>Export</Text>
                        </TouchableOpacity>

                    </View>
                </View>

                {/* Recent Activity */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Recent Activity</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('PendingPayments')}>
                            <Text style={[styles.viewAllText, { color: themeColors.primary }]}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.activityCard, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                        {recentActivity.length > 0 ? (
                            recentActivity.map((item, index) => (
                                <ActivityItem
                                    key={item.id}
                                    item={item}
                                    isLast={index === recentActivity.length - 1}
                                />
                            ))
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="receipt-outline" size={48} color={themeColors.textSubtle} />
                                <Text style={[styles.emptyText, { color: themeColors.textSubtle }]}>
                                    No recent activity
                                </Text>
                            </View>
                        )}
                    </View>
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
                        <TouchableOpacity activeOpacity={1}>
                            <View style={[styles.notifPopup, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight, borderWidth: 1 }]}>
                                <View style={[styles.notifPopupHeader, { borderBottomColor: themeColors.borderLight }]}>
                                    <Text style={[styles.notifPopupTitle, { color: isDark ? '#FFF' : '#0F172A' }]}>Push History</Text>
                                    <TouchableOpacity onPress={() => setShowNotifPopup(false)}>
                                        <Ionicons name="close" size={20} color={themeColors.textPrimary} />
                                    </TouchableOpacity>
                                </View>

                                {broadcasts.length === 0 ? (
                                    <View style={styles.notifEmpty}>
                                        <Ionicons name="notifications-off-outline" size={36} color={themeColors.textSubtle} />
                                        <Text style={[styles.notifEmptyText, { color: themeColors.textSubtle }]}>No broadcasts sent yet</Text>
                                    </View>
                                ) : (
                                    <ScrollView style={styles.notifList} showsVerticalScrollIndicator={false}>
                                        {broadcasts.map((item, index) => (
                                            <TouchableOpacity
                                                key={item.id}
                                                onPress={() => handleNotificationPress(item)}
                                                style={[
                                                    styles.notifItem,
                                                    { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' },
                                                    index === broadcasts.length - 1 && { borderBottomWidth: 0 }
                                                ]}
                                            >
                                                <View style={[styles.notifItemDot, { backgroundColor: themeColors.primary }]} />
                                                <View style={styles.notifItemContent}>
                                                    <Text style={[styles.notifItemTitle, { color: isDark ? '#FFF' : '#0F172A' }]} numberOfLines={1}>{item.title}</Text>
                                                    <Text style={[styles.notifItemBody, { color: isDark ? themeColors.textSubtle : '#64748B' }]} numberOfLines={2}>{item.message}</Text>
                                                    <Text style={[styles.notifItemTime, { color: isDark ? themeColors.textSubtle : '#94A3B8' }]}>
                                                        {item.created_at?.toDate ? new Date(item.created_at.toDate()).toLocaleDateString() : 'Today'}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                )}

                                <TouchableOpacity
                                    style={[styles.viewAllBtn, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}
                                    onPress={() => {
                                        setShowNotifPopup(false);
                                        navigation.navigate('BroadcastAlert');
                                    }}
                                >
                                    <Text style={styles.viewAllText}>New Broadcast</Text>
                                    <Ionicons name="add-circle-outline" size={16} color="#2563EB" />
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Header Styles
    header: {
        borderBottomWidth: 1,
        paddingBottom: 10,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 60,
    },
    headerBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    avatarBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    notifDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        borderWidth: 1.5,
    },

    // Welcome Section
    welcomeSection: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 20,
    },
    welcomeText: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    adminName: {
        fontSize: 24,
        fontWeight: '700',
    },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 15,
        justifyContent: 'space-between', // Ensures spacing
        marginBottom: 20,
    },
    statCard: {
        width: '48%', // Forces 2 per row
        marginBottom: 15,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    statIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 4,
    },
    statTitle: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
    },

    // Section Styles
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Quick Actions
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 20,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        gap: 8,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '600',
    },

    // Activity Card
    activityCard: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    activityIconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityInfo: {
        flex: 1,
    },
    activityName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    activityDetail: {
        fontSize: 12,
        fontWeight: '500',
    },
    activityAmount: {
        fontSize: 15,
        fontWeight: '700',
    },

    // Empty State
    emptyState: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 12,
    },

    // Notification Popup Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    notifPopupAnchor: {
        width: '100%',
        maxWidth: 400,
    },
    notifPopup: {
        borderRadius: 28,
        overflow: 'hidden',
        maxHeight: width > 600 ? 600 : 500,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
    },
    notifPopupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    notifPopupTitle: {
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    notifEmpty: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notifEmptyText: {
        marginTop: 12,
        fontSize: 12,
        fontWeight: '600',
    },
    notifList: {
        paddingHorizontal: 16,
    },
    notifItem: {
        flexDirection: 'row',
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    notifItemDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 6,
        marginRight: 10,
    },
    notifItemContent: {
        flex: 1,
    },
    notifItemTitle: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 2,
    },
    notifItemBody: {
        fontSize: 11,
        lineHeight: 16,
        marginBottom: 4,
    },
    notifItemTime: {
        fontSize: 10,
        fontWeight: '600',
    },
    viewAllBtn: {
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderTopWidth: 1,
    },
});

export default AdminDashboardScreen;