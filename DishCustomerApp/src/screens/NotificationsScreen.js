import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { auth, firestore } from '../services/firebase';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, or, limit } from 'firebase/firestore';
import { saveToCache, getFromCache, CACHE_KEYS } from '../utils/cacheManager';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const NotificationsScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async (forceRefresh = false) => {
        if (!forceRefresh) setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) return;

            // Fetch user profile to get village/service type for filtered broadcasts
            const userDoc = await getDocs(query(collection(firestore, 'users'), where('__name__', '==', user.uid)));
            const userData = userDoc.docs[0]?.data();

            if (!forceRefresh) {
                const cached = await getFromCache(CACHE_KEYS.NOTIFICATIONS);
                if (cached) {
                    setNotifications(cached);
                    setLoading(false);
                }
            }

            const q = query(
                collection(firestore, "notifications"),
                or(
                    where("user_id", "==", user.uid),
                    where("recipient_role", "in", ["all", "filtered"])
                ),
                limit(100) // Fetch more to allow for client-side filtering
            );

            const snapshot = await getDocs(q);
            const items = [];
            snapshot.forEach((doc) => {
                const data = doc.id ? { id: doc.id, ...doc.data() } : doc.data();
                
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
                
                items.push(data);
            });

            // Sort in-memory to avoid index error
            items.sort((a, b) => {
                const dateA = a.created_at?.toDate ? a.created_at.toDate() : (a.created_at ? new Date(a.created_at) : new Date(0));
                const dateB = b.created_at?.toDate ? b.created_at.toDate() : (b.created_at ? new Date(b.created_at) : new Date(0));
                return dateB - dateA;
            });

            const finalItems = items.slice(0, 30);
            setNotifications(finalItems);
            await saveToCache(CACHE_KEYS.NOTIFICATIONS, finalItems);

            // Mark unread as read automatically
            const unread = finalItems.filter(n => !n.is_read);
            if (unread.length > 0) {
                Promise.all(unread.map(n => markAsRead(n.id))).catch(e => console.log("Silent read update error:", e));
            }
        } catch (error) {
            console.log("Error fetching notifications:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await updateDoc(doc(firestore, "notifications", id), { is_read: true });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.log("Error marking notification as read:", error);
        }
    };

    const getIconInfo = (type) => {
        switch (type) {
            case 'payment': return { name: 'card', color: '#10B981' };
            case 'approval': return { name: 'shield-checkmark', color: themeColors.primary };
            case 'alert': return { name: 'warning', color: '#F59E0B' };
            case 'broadcast': return { name: 'megaphone', color: '#8B5CF6' };
            default: return { name: 'notifications', color: themeColors.primary };
        }
    };

    const handleNotificationPress = (item) => {
        if (!item.is_read) markAsRead(item.id);

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
        }
    };

    const renderNotification = ({ item }) => {
        const icon = getIconInfo(item.type);
        const date = item.created_at ? (item.created_at.toDate ? item.created_at.toDate() : new Date(item.created_at)) : new Date();

        return (
            <TouchableOpacity
                style={[
                    styles.notifCard,
                    { backgroundColor: themeColors.card, borderColor: themeColors.border },
                    !item.is_read && { borderColor: themeColors.primary + '30', backgroundColor: themeColors.primary + '08' }
                ]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.8}
            >
                <View style={[styles.iconBox, { backgroundColor: icon.color + '15' }]}>
                    <Ionicons name={icon.name} size={24} color={icon.color} />
                </View>

                <View style={styles.notifContent}>
                    <View style={styles.notifHeader}>
                        <Text style={[styles.notifTitle, { color: themeColors.textPrimary }, !item.is_read && { color: themeColors.primary }]} numberOfLines={1}>
                            {item.title || 'Notification'}
                        </Text>
                        {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: themeColors.primary }]} />}
                    </View>
                    <Text style={[styles.notifMessage, { color: themeColors.textSecondary }]} numberOfLines={2}>{item.message}</Text>
                    <View style={styles.footerRow}>
                        <Ionicons name="time-outline" size={12} color={themeColors.textSubtle} />
                        <Text style={[styles.timeStamp, { color: themeColors.textSubtle }]}>
                            {date.toLocaleDateString('en-GB')} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            <SafeAreaView edges={['top']} style={[styles.headerArea, { backgroundColor: isDark ? themeColors.card : '#FFF' }]}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.backBtn}>
                        <MaterialIcons name="menu" size={24} color={themeColors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Notifications</Text>
                    <View style={styles.headerBtn} />
                </View>
            </SafeAreaView>

            <View style={styles.content}>
                {loading ? (
                    <View style={styles.loaderBox}>
                        <ActivityIndicator size="large" color={themeColors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={notifications}
                        keyExtractor={item => item.id}
                        renderItem={renderNotification}
                        contentContainerStyle={styles.listArea}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => { setRefreshing(true); fetchNotifications(true); }}
                                tintColor={themeColors.primary}
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <View style={[styles.emptyIconCircle, { backgroundColor: themeColors.card }]}>
                                    <Ionicons name="notifications-off-outline" size={48} color={themeColors.textSubtle} />
                                </View>
                                <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>No Notifications</Text>
                                <Text style={[styles.emptyDesc, { color: themeColors.textSecondary }]}>
                                    When you receive updates about your service or payments, they'll appear here.
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerArea: { borderBottomWidth: 0 },
    topBar: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800' },

    content: { flex: 1 },
    listArea: { padding: 20 },
    loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    notifCard: {
        flexDirection: 'row',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    notifContent: { flex: 1 },
    notifHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    notifTitle: {
        fontSize: 15,
        fontWeight: '800',
        flex: 1,
    },
    unreadDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginLeft: 8,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
    },
    timeStamp: {
        fontSize: 10,
        fontWeight: '700',
    },
    notifMessage: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
    },

    emptyBox: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '900',
    },
    emptyDesc: {
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 18,
        fontSize: 13,
        fontWeight: '600',
    },
});

export default NotificationsScreen;
