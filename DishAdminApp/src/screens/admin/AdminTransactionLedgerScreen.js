import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, FlatList, TextInput } from 'react-native';
import CustomAlert from '../../components/CustomAlert';
import useAlert from '../../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { firestore } from '../../services/firebase';
import { collection, query, where, orderBy, getDocs, limit, onSnapshot } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const AdminTransactionLedgerScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [filter, setFilter] = useState('All');
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const { alertState, showAlert, hideAlert } = useAlert();

    useEffect(() => {
        const trQ = query(
            collection(firestore, "payments"),
            orderBy("timestamp", "desc")
        );

        const unsubscribe = onSnapshot(trQ, (snapshot) => {
            const trList = [];
            let total = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                const item = { id: doc.id, ...data };
                trList.push(item);
                if (data.status === 'completed') {
                    total += Number(data.amount || 0);
                }
            });
            setTransactions(trList);
            setTotalRevenue(total);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        let filtered = transactions;

        // Search
        if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.user_name?.toLowerCase().includes(q) ||
                t.box_id?.toLowerCase().includes(q) ||
                t.utr?.toLowerCase().includes(q) ||
                t.utr_number?.toLowerCase().includes(q)
            );
        }

        // Status Filter
        if (filter !== 'All') {
            const statusMap = {
                'Completed': 'completed',
                'Pending': 'pending',
                'Rejected': 'rejected'
            };
            filtered = filtered.filter(t => t.status?.toLowerCase() === statusMap[filter]);
        }

        setFilteredTransactions(filtered);
    }, [filter, searchQuery, transactions]);



    const TransactionCard = ({ item }) => {
        const date = item.timestamp?.toDate ? item.timestamp.toDate() : new Date(item.timestamp);

        return (
            <View style={[styles.trCard, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                <View style={styles.trHeader}>
                    <View style={styles.trIconContainer}>
                        <View style={styles.trIconBg}>
                            <MaterialIcons name="arrow-upward" size={20} color={themeColors.success} />
                        </View>
                    </View>
                    <View style={styles.trInfo}>
                        <Text style={[styles.customerName, { color: themeColors.textPrimary }]}>{item.user_name || 'Subscriber'}</Text>
                        <Text style={[styles.subInfo, { color: themeColors.textSubtle }]}>{item.box_id || item.box_number || 'N/A'} • Payment {(item.status || 'Pending').toUpperCase()}</Text>
                    </View>
                    <View style={styles.amountInfo}>
                        <Text style={[styles.amountText, { color: item.status === 'completed' ? '#10B981' : item.status === 'rejected' ? '#EF4444' : '#F59E0B' }]}>
                            {item.status === 'completed' ? '+' : ''}₹{item.amount || '0'}
                        </Text>
                        <Text style={[styles.dateText, { color: themeColors.textSubtle }]}>{date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                </View>

                {(item.old_balance !== undefined || item.valued_at !== undefined) && (
                    <View style={[styles.balanceRow, { backgroundColor: themeColors.background, borderColor: themeColors.borderLight }]}>
                        <View style={styles.balanceItem}>
                            <Text style={[styles.balanceLabel, { color: themeColors.textSubtle }]}>BEFORE</Text>
                            <Text style={[styles.balanceValue, { color: themeColors.textPrimary }]}>₹{item.old_balance || '0'}</Text>
                        </View>
                        <View style={styles.balanceItem}>
                            <Text style={[styles.balanceLabel, { color: themeColors.textSubtle }]}>ADDED</Text>
                            <Text style={[styles.balanceValue, { color: '#10B981' }]}>₹{item.amount || '0'}</Text>
                        </View>
                        <View style={styles.balanceItem}>
                            <Text style={[styles.balanceLabel, { color: themeColors.textSubtle }]}>AFTER</Text>
                            <Text style={[styles.balanceValue, { color: '#6366F1' }]}>₹{item.valued_at || item.amount || '0'}</Text>
                        </View>
                    </View>
                )}

                <View style={styles.refRow}>
                    <Ionicons name="information-circle-outline" size={14} color={themeColors.textSubtle} />
                    <Text style={[styles.refText, { color: themeColors.textSubtle }]}>Ref: {item.utr || '298347387648'}</Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <SafeAreaView edges={['top']} style={[styles.headerArea, { backgroundColor: themeColors.card }]}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.iconBtn}>
                        <Ionicons name="menu" size={28} color={themeColors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Transaction Ledger</Text>
                    <View style={styles.headerRight}>
                        {/* Icons removed as per request */}
                    </View>
                </View>
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* REVENUE HERO */}
                <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    style={styles.heroCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.heroHeader}>
                        <FontAwesome5 name="rupee-sign" size={14} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.heroLabel}>CURRENT TOTAL REVENUE</Text>
                    </View>
                    <Text style={styles.heroAmount}>₹{totalRevenue}</Text>
                    <View style={styles.statusRow}>
                        <Ionicons name="refresh-circle" size={18} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.statusText}>Real-time persistence active</Text>
                    </View>
                </LinearGradient>

                {/* SEARCH */}
                <View style={[styles.searchContainer, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                    <Ionicons name="search" size={20} color={themeColors.textSubtle} />
                    <TextInput
                        style={[styles.searchInput, { color: themeColors.textPrimary }]}
                        placeholder="Search customer, box ID or UTR..."
                        placeholderTextColor={themeColors.textSubtle}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* FILTERS */}
                <View style={styles.filterRow}>
                    {['All', 'Completed', 'Pending', 'Rejected'].map(f => (
                        <TouchableOpacity
                            key={f}
                            style={[
                                styles.filterChip,
                                { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' },
                                filter === f && { backgroundColor: '#6366F1' }
                            ]}
                            onPress={() => setFilter(f)}
                        >
                            <Text style={[
                                styles.filterText,
                                { color: isDark ? '#CBD5E1' : '#64748B' },
                                filter === f && { color: '#FFF' }
                            ]}>{f}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ACTIVITY LOG */}
                <View style={styles.logHeader}>
                    <Text style={[styles.logTitle, { color: themeColors.textPrimary }]}>Activity Log ({filteredTransactions.length})</Text>
                </View>

                <FlatList
                    data={filteredTransactions}
                    renderItem={({ item }) => <TransactionCard item={item} />}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyText}>No transactions found for this filter.</Text>
                        </View>
                    }
                />
            </ScrollView>
            <CustomAlert {...alertState} onDismiss={hideAlert} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerArea: { elevation: 1 },
    topBar: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20
    },
    headerTitle: { fontSize: 18, fontWeight: '800' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBtn: { padding: 4 },
    logoutBtn: {
        padding: 8,
        backgroundColor: '#FEF2F2',
        borderRadius: 12
    },

    content: { padding: 20, paddingBottom: 40 },

    heroCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        elevation: 8,
        shadowColor: '#3B82F6',
        shadowOpacity: 0.3,
        shadowRadius: 15
    },
    heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    heroLabel: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5 },
    heroAmount: { fontSize: 48, fontWeight: '900', color: '#FFF', marginBottom: 16 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 20,
        borderWidth: 1,
    },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '600' },

    filterRow: { flexDirection: 'row', gap: 10, marginBottom: 30 },
    filterChip: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center'
    },
    activeFilterChip: { backgroundColor: '#6366F1' },
    filterText: { fontSize: 13, fontWeight: '800', color: '#64748B' },
    activeFilterText: { color: '#FFF' },

    logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    logTitle: { fontSize: 16, fontWeight: '800' },


    trCard: {
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        elevation: 2,
    },
    trHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    trIconContainer: { marginRight: 12 },
    trIconBg: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    trInfo: { flex: 1 },
    customerName: { fontSize: 15, fontWeight: '800' },
    subInfo: { fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 2 },
    amountInfo: { alignItems: 'flex-end' },
    amountText: { fontSize: 16, fontWeight: '900', color: '#10B981' },
    dateText: { fontSize: 10, color: '#94A3B8', fontWeight: '700', marginTop: 4 },

    balanceRow: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
    },
    balanceItem: { flex: 1, alignItems: 'center' },
    balanceLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', marginBottom: 4, letterSpacing: 0.5 },
    balanceValue: { fontSize: 14, fontWeight: '900' },

    refRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    refText: { fontSize: 11, color: '#64748B', fontWeight: '600' },

    emptyBox: { padding: 40, alignItems: 'center' },
    emptyText: { color: '#64748B', fontWeight: '600' }
});

export default AdminTransactionLedgerScreen;
