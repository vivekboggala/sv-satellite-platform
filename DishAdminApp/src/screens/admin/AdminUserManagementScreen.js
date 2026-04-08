import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { firestore } from '../../services/firebase';
import { collection, onSnapshot, query, where, updateDoc, doc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { calculateDaysRemaining } from '../../utils/bcnCalculator';

// Helper to get status with actual logic
const getSubscriberStatus = (item) => {
    if (!item.is_approved) return { label: 'PENDING', color: '#F59E0B' };

    if (!item.expiry_date || !item.plan_name) {
        return { label: 'NO PLAN', color: '#64748B' }; // Slate Gray
    }

    const diffDays = calculateDaysRemaining(item.expiry_date, item.service_type);

    if (diffDays <= 0) {
        return { label: 'EXPIRED', color: '#EF4444' }; // Red
    }

    if (diffDays <= 7) {
        return { label: 'EXPIRING SOON', color: '#F59E0B' }; // Orange
    }

    return { label: 'ACTIVE', color: '#10B981' };
};

const DetailRow = ({ label, value, themeColors }) => (
    <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>{label} : </Text>
        <Text style={[styles.detailValue, { color: themeColors.textPrimary }]}>{value}</Text>
    </View>
);

const UserCard = ({ item, index, themeColors, onPress }) => {
    const status = getSubscriberStatus(item);

    return (
        <TouchableOpacity
            style={[styles.userCard, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}
            onPress={onPress}
        >
            <View style={styles.cardHeader}>
                <Text style={[styles.indexText, { color: themeColors.textPrimary }]}>{item.name || 'Unknown User'}</Text>
                <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>

            <View style={styles.subHeader}>
                <View style={styles.mobileRow}>
                    <Ionicons name="call" size={16} color={themeColors.textSecondary} />
                    <Text style={[styles.mobileText, { color: themeColors.textSecondary }]}>{item.mobile || 'N/A'}</Text>
                </View>
            </View>

            <View style={[styles.divider, { backgroundColor: themeColors.borderLight }]} />

            <View style={styles.detailsGrid}>
                <DetailRow label="Recharge Date" value={item.last_recharge ? (item.last_recharge.toDate ? item.last_recharge.toDate().toLocaleDateString('en-GB') : new Date(item.last_recharge).toLocaleDateString('en-GB')) : 'N/A'} themeColors={themeColors} />
                <DetailRow label="End Date" value={item.expiry_date ? (item.expiry_date.toDate ? item.expiry_date.toDate().toLocaleDateString('en-GB') : new Date(item.expiry_date).toLocaleDateString('en-GB')) : 'N/A'} themeColors={themeColors} />
                <DetailRow label="Service Type" value={item.service_type?.replace('_', ' ').toUpperCase() || 'N/A'} themeColors={themeColors} />
                <DetailRow label="Box ID" value={item.box_number || 'N/A'} themeColors={themeColors} />
                <DetailRow label="Plan" value={item.plan_name || 'N/A'} themeColors={themeColors} />
            </View>
        </TouchableOpacity>
    );
};

const AdminUserManagementScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const { t } = useLanguage();
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchMode, setSearchMode] = useState('Name'); // Name, Mobile, Box No
    const [selectedFilter, setSelectedFilter] = useState('All'); // All, Active, Pending, Expired

    useEffect(() => {
        const q = query(collection(firestore, 'users'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedUsers = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.role !== 'admin') {
                    fetchedUsers.push({ id: doc.id, ...data });
                }
            });
            setUsers(fetchedUsers);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        let filtered = users;

        // Search Filter based on mode
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(user => {
                switch (searchMode) {
                    case 'Name': return user.name?.toLowerCase().includes(query);
                    case 'Mobile': return user.mobile?.includes(query);
                    case 'Box No': return user.box_number?.toLowerCase().includes(query) || user.customer_id?.toLowerCase().includes(query);
                    default: return true;
                }
            });
        }

        // Chip Filter (Radio Style)
        if (selectedFilter !== 'All') {
            filtered = filtered.filter(user => {
                if (selectedFilter === 'Active') return getSubscriberStatus(user).label === 'ACTIVE';
                if (selectedFilter === 'Pending') return !user.is_approved;
                if (selectedFilter === 'Expired') return getSubscriberStatus(user).label === 'EXPIRED';
                return true;
            });
        }

        setFilteredUsers(filtered);
    }, [searchQuery, searchMode, selectedFilter, users]);

    const handleUserPress = (user) => {
        navigation.navigate('AdminUserDetails', { user });
    };

    const toggleFilter = (filter) => {
        setSelectedFilter(filter);
    };

    const SearchModeItem = ({ label, icon, active }) => (
        <TouchableOpacity
            style={styles.searchModeItem}
            onPress={() => setSearchMode(label)}
        >
            <View style={[styles.modeIconBox, active && { borderBottomWidth: 2, borderBottomColor: themeColors.primary }]}>
                <Ionicons name={icon} size={24} color={active ? themeColors.primary : themeColors.textSubtle} />
            </View>
            <Text style={[styles.modeLabel, { color: active ? themeColors.textPrimary : themeColors.textSubtle }]}>{label}</Text>
        </TouchableOpacity>
    );

    const FilterChip = ({ label, color }) => {
        const isSelected = selectedFilter === label;
        return (
            <TouchableOpacity
                onPress={() => toggleFilter(label)}
                style={[
                    styles.chip,
                    {
                        backgroundColor: isSelected ? color : 'transparent',
                        borderColor: color,
                        borderWidth: 1.5,
                    }
                ]}
            >
                <Text style={[styles.chipText, { color: isSelected ? '#FFF' : color }]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: themeColors.background, borderBottomColor: themeColors.borderLight }]}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu" size={26} color={themeColors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Customers</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Advanced Filter Section */}
            <View style={[styles.advancedFilterSection, { backgroundColor: themeColors.card }]}>
                {/* Search Bar */}
                <View style={[styles.searchBar, { borderColor: themeColors.borderLight }]}>
                    <Ionicons name="search-outline" size={20} color={themeColors.textSubtle} />
                    <TextInput
                        style={[styles.searchInput, { color: themeColors.textPrimary }]}
                        placeholder={`Search by ${searchMode}...`}
                        placeholderTextColor={themeColors.textSubtle}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Search Modes */}
                <View style={styles.searchModesRow}>
                    <SearchModeItem label="Name" icon="person-outline" active={searchMode === 'Name'} />
                    <SearchModeItem label="Mobile" icon="phone-portrait-outline" active={searchMode === 'Mobile'} />
                    <SearchModeItem label="Box No" icon="barcode-outline" active={searchMode === 'Box No'} />
                </View>
            </View>

            {/* Chips Wrap */}
            <View style={styles.chipsContainer}>
                <View style={styles.chipsWrap}>
                    <FilterChip label="All" color="#6B21A8" />
                    <FilterChip label="Active" color="#059669" />
                    <FilterChip label="Pending" color="#F59E0B" />
                    <FilterChip label="Expired" color="#EF4444" />
                </View>
            </View>

            {/* User List */}
            {loading ? (
                <ActivityIndicator size="large" color={themeColors.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={filteredUsers}
                    keyExtractor={item => item.id}
                    renderItem={({ item, index }) => (
                        <UserCard
                            item={item}
                            index={index}
                            themeColors={themeColors}
                            onPress={() => handleUserPress(item)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={64} color={themeColors.textSubtle} />
                            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                                No users found matching your criteria
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 60,
        borderBottomWidth: 1,
    },
    menuButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    advancedFilterSection: {
        padding: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 50,
        borderRadius: 25,
        borderWidth: 1.5,
        marginBottom: 20,
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16, fontWeight: '600' },
    searchModesRow: { flexDirection: 'row', justifyContent: 'space-between' },
    searchModeItem: { alignItems: 'center', flex: 1 },
    modeIconBox: { paddingBottom: 8, marginBottom: 4 },
    modeLabel: { fontSize: 11, fontWeight: '700' },
    chipsContainer: { paddingHorizontal: 20, paddingTop: 15 },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 15,
    },
    chipText: { fontSize: 12, fontWeight: '800' },
    listContent: { padding: 20 },
    userCard: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    indexText: { fontSize: 16, fontWeight: '800' },
    topRightId: { fontSize: 13, fontWeight: '800' },
    subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    mobileRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    mobileText: { fontSize: 15, fontWeight: '700' },
    statusText: { fontSize: 13, fontWeight: '900' },
    divider: { height: 1, marginBottom: 12 },
    detailsGrid: { gap: 4 },
    detailRow: { flexDirection: 'row', alignItems: 'center' },
    detailLabel: { fontSize: 13, fontWeight: '600', width: 140 }, // Using width instead of padEnd for layout stability
    detailValue: { fontSize: 13, fontWeight: '800', flex: 1 },
    emptyState: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 16, fontWeight: '600', marginTop: 16 },
});

export default AdminUserManagementScreen;