import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, firestore } from '../services/firebase';
import { collection, query, where, getDocs, orderBy, or } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const SupportScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchTickets();
        });
        return unsubscribe;
    }, [navigation]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) return;

            // 1. Fetch Tickets (Simplified query to avoid index requirements)
            const qTickets = query(
                collection(firestore, "support_tickets"),
                where("user_id", "==", user.uid)
            );
            const ticketSnapshot = await getDocs(qTickets);
            const fetchedTickets = [];
            ticketSnapshot.forEach((doc) => {
                fetchedTickets.push({ id: doc.id, ...doc.data(), itemType: 'ticket' });
            });

            // 2. Fetch Broadcasts
            const qNotifs = query(
                collection(firestore, "notifications"),
                where("recipient_role", "==", "all")
            );
            const notifSnapshot = await getDocs(qNotifs);
            const fetchedBroadcasts = [];
            notifSnapshot.forEach((doc) => {
                fetchedBroadcasts.push({ id: doc.id, ...doc.data(), itemType: 'broadcast' });
            });

            // 3. Merge and Sort In-Memory
            const merged = [...fetchedTickets, ...fetchedBroadcasts].sort((a, b) => {
                const getTime = (val) => {
                    if (!val) return 0;
                    if (val.toDate) return val.toDate().getTime();
                    const d = new Date(val);
                    return isNaN(d.getTime()) ? 0 : d.getTime();
                };
                return getTime(b.created_at) - getTime(a.created_at);
            });

            setTickets(merged);
        } catch (error) {
            console.log("Customer Support History Error:", error.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = (status) => {
        switch (status?.toLowerCase()) {
            case 'resolved': return { color: '#10B981', label: 'RESOLVED', icon: 'checkmark-circle' };
            case 'closed': return { color: '#6B7280', label: 'CLOSED', icon: 'close-circle' };
            case 'open': return { color: '#F59E0B', label: 'OPEN', icon: 'alert-circle' };
            default: return { color: '#2563EB', label: 'ACTIVE', icon: 'radio-button-on' };
        }
    };

    const renderItem = ({ item }) => {
        const isBroadcast = item.itemType === 'broadcast';

        if (isBroadcast) {
            const date = item.created_at ? (item.created_at.toDate ? item.created_at.toDate() : new Date(item.created_at)) : new Date();
            return (
                <View style={[styles.ticketCard, { backgroundColor: isDark ? themeColors.card : '#FFF', borderColor: '#8B5CF640', borderWidth: 1 }]}>
                    <View style={styles.ticketRow}>
                        <View style={[styles.ticketIconCircle, { backgroundColor: '#8B5CF615' }]}>
                            <Ionicons name="megaphone" size={22} color="#8B5CF6" />
                        </View>
                        <View style={styles.ticketInfo}>
                            <Text style={[styles.tktSubject, { color: isDark ? '#FFF' : '#0F172A' }]} numberOfLines={1}>{item.title || 'Broadcast'}</Text>
                            <Text style={[styles.tktCategory, { color: '#8B5CF6' }]}>System Update</Text>
                        </View>
                        <View style={[styles.statusChip, { backgroundColor: '#8B5CF615' }]}>
                            <Text style={[styles.statusChipText, { color: '#8B5CF6' }]}>BROADCAST</Text>
                        </View>
                    </View>
                    <Text style={[styles.tktDesc, { color: isDark ? themeColors.textSecondary : '#64748B' }]} numberOfLines={3}>{item.message}</Text>
                    <View style={styles.ticketFooter}>
                        <View style={styles.footerLeft}>
                            <Ionicons name="time-outline" size={13} color={isDark ? themeColors.textSubtle : '#94A3B8'} />
                            <Text style={[styles.tktTime, { color: isDark ? themeColors.textSubtle : '#94A3B8' }]}>
                                {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </Text>
                        </View>
                        <Text style={[styles.tktIdLabel, { color: '#8B5CF6' }]}>SYSTEM</Text>
                    </View>
                </View>
            );
        }

        const statusInfo = getStatusInfo(item.status);
        const date = item.created_at ? (item.created_at.toDate ? item.created_at.toDate() : new Date(item.created_at)) : new Date();

        return (
            <TouchableOpacity
                style={[styles.ticketCard, { backgroundColor: isDark ? themeColors.card : '#FFF' }]}
                onPress={() => item.support_id && navigation.navigate('Chat', { ticketId: item.id, ticket: item })}
            >
                <View style={styles.ticketRow}>
                    <View style={[styles.ticketIconCircle, { backgroundColor: statusInfo.color + '15' }]}>
                        <Ionicons name={statusInfo.icon} size={22} color={statusInfo.color} />
                    </View>
                    <View style={styles.ticketInfo}>
                        <Text style={[styles.tktSubject, { color: isDark ? '#FFF' : '#0F172A' }]} numberOfLines={1}>{item.subject}</Text>
                        <Text style={[styles.tktCategory, { color: isDark ? themeColors.textSubtle : '#64748B' }]}>{item.category || 'General'}</Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: statusInfo.color + '15' }]}>
                        <Text style={[styles.statusChipText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                    </View>
                </View>
                <Text style={[styles.tktDesc, { color: isDark ? themeColors.textSecondary : '#64748B' }]} numberOfLines={2}>{item.description}</Text>
                <View style={styles.ticketFooter}>
                    <View style={styles.footerLeft}>
                        <Ionicons name="time-outline" size={13} color={isDark ? themeColors.textSubtle : '#94A3B8'} />
                        <Text style={[styles.tktTime, { color: isDark ? themeColors.textSubtle : '#94A3B8' }]}>
                            {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                    </View>
                    <Text style={[styles.tktIdLabel, { color: isDark ? themeColors.textSubtle : '#CBD5E1' }]}>#{String(item.id).substring(0, 6).toUpperCase()}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.background : '#F8FAFC' }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            {/* HEADER — no notification/profile icons */}
            <SafeAreaView edges={['top']} style={[styles.headerArea, { backgroundColor: isDark ? themeColors.card : '#FFF' }]}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
                        <Ionicons name="menu" size={24} color={isDark ? '#FFF' : '#0F172A'} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#0F172A' }]}>Support Center</Text>
                    <View style={{ width: 44 }} />
                </View>
            </SafeAreaView>

            <FlatList
                data={tickets}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listArea}
                showsVerticalScrollIndicator={false}
                refreshing={loading}
                onRefresh={fetchTickets}
                ListHeaderComponent={
                    <View>
                        {/* PAGE LABEL */}
                        <Text style={[styles.pageLabel, { color: isDark ? '#FFF' : '#0F172A' }]}>Support Center</Text>

                        {/* HERO CARD — "Need Help?" */}
                        <View style={styles.heroWrapper}>
                            <LinearGradient
                                colors={['#3B82F6', '#6366F1']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.heroCard}
                            >
                                <View style={styles.heroContent}>
                                    <Text style={styles.heroTitle}>Need Help?</Text>
                                    <Text style={styles.heroDesc}>Our team is ready to assist you. Creating a ticket takes less than a minute.</Text>
                                    <TouchableOpacity
                                        style={[styles.heroBtn, { backgroundColor: isDark ? '#0F172A' : '#FFF' }]}
                                        onPress={() => navigation.navigate('RaiseTicket')}
                                    >
                                        <Ionicons name="add" size={18} color={isDark ? '#FFF' : '#2563EB'} />
                                        <Text style={[styles.heroBtnText, { color: isDark ? '#FFF' : '#2563EB' }]}>Raise New Ticket</Text>
                                    </TouchableOpacity>
                                </View>
                                {/* Decorative element */}
                                <View style={styles.heroDecor}>
                                    <Ionicons name="chatbubbles-outline" size={60} color="rgba(255,255,255,0.15)" />
                                </View>
                            </LinearGradient>
                        </View>

                        {/* SECTION LABEL */}
                        <View style={styles.sectionRow}>
                            <Ionicons name="time-outline" size={18} color={isDark ? '#FFF' : '#0F172A'} />
                            <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#0F172A' }]}>Recent Tickets</Text>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <View style={[styles.emptyBox, { backgroundColor: isDark ? themeColors.card : '#FFF', borderColor: isDark ? '#FFF1' : '#E2E8F0' }]}>
                        <Ionicons name="chatbubble-outline" size={48} color={isDark ? themeColors.textSubtle : '#CBD5E1'} />
                        <Text style={[styles.emptyText, { color: isDark ? themeColors.textSubtle : '#94A3B8' }]}>No previous tickets found.</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerArea: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    topBar: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    menuBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '900' },

    listArea: { padding: 20, paddingBottom: 100 },

    pageLabel: { fontSize: 22, fontWeight: '900', marginBottom: 16 },

    heroWrapper: { marginBottom: 28, borderRadius: 24, overflow: 'hidden', elevation: 6, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16 },
    heroCard: { padding: 28, flexDirection: 'row', minHeight: 160 },
    heroContent: { flex: 1 },
    heroTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', marginBottom: 8 },
    heroDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 20, marginBottom: 20, fontWeight: '500' },
    heroBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
    heroBtnText: { color: '#2563EB', fontSize: 14, fontWeight: '800' },
    heroDecor: { justifyContent: 'flex-end', alignItems: 'flex-end', width: 80 },

    sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    sectionTitle: { fontSize: 17, fontWeight: '900' },

    ticketCard: { borderRadius: 20, padding: 18, marginBottom: 14, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
    ticketRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    ticketIconCircle: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    ticketInfo: { flex: 1 },
    tktSubject: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
    tktCategory: { fontSize: 11, fontWeight: '700' },
    statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusChipText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },
    tktDesc: { fontSize: 13, lineHeight: 19, marginBottom: 12, fontWeight: '500' },
    ticketFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.06)' },
    footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    tktTime: { fontSize: 11, fontWeight: '700' },
    tktIdLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

    emptyBox: { alignItems: 'center', paddingVertical: 50, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed' },
    emptyText: { fontSize: 14, fontWeight: '600', marginTop: 16 },
});

export default SupportScreen;
