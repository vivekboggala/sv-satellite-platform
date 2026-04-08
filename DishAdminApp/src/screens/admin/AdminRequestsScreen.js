import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl, Animated, Platform } from 'react-native';
import CustomAlert from '../../components/CustomAlert';
import useAlert from '../../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { firestore } from '../../services/firebase';
import { collection, onSnapshot, query, updateDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import notificationService from '../../services/notificationService';
import { validateBoxNumber } from '../../utils/validation';

const AdminRequestsScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const { t } = useLanguage();
    const { alertState, showAlert, hideAlert } = useAlert();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [bulkProcessing, setBulkProcessing] = useState(false);

    const [activeTab, setActiveTab] = useState('new'); // 'new' (pending), 'history' (approved, completed, rejected)
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    // ── Fetch ──
    const fetchRequests = useCallback(async () => {
        const q = query(collection(firestore, 'box_change_requests'));
        const unsub = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            fetched.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
            setRequests(fetched);
            setLoading(false);
            setRefreshing(false);
        }, (error) => {
            console.error("Fetch Error:", error);
            setLoading(false);
            setRefreshing(false);
        });
        return unsub;
    }, []);

    useEffect(() => {
        let unsub;
        fetchRequests().then(u => unsub = u);
        return () => unsub?.();
    }, [fetchRequests]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchRequests();
    };

    // ── Filtering ──
    const displayData = useMemo(() => {
        let filtered = requests;

        if (activeTab === 'new') {
            filtered = filtered.filter(r => r.status === 'pending');
        } else {
            filtered = filtered.filter(r => r.status !== 'pending');
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(r => 
                (r.customer_name || '').toLowerCase().includes(q) || 
                (r.mobile || '').includes(q) ||
                (r.new_box_number || '').toLowerCase().includes(q)
            );
        }

        return filtered;
    }, [requests, activeTab, searchQuery]);

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    // ── Bulk Actions ──
    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const selectAll = () => {
        if (selectedIds.length === displayData.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(displayData.map(r => r.id));
        }
    };

    const handleBulkApprove = () => {
        showAlert({
            title: `Approve ${selectedIds.length} Requests?`,
            message: `Are you sure you want to approve all selected requests? This will update their box numbers in their profiles.`,
            type: 'confirm',
            buttons: [
                { text: 'Cancel', onPress: hideAlert },
                { text: 'Approve All', onPress: () => { hideAlert(); processBulk('approve'); } }
            ]
        });
    };

    const processBulk = async (action) => {
        setBulkProcessing(true);
        try {
            const batch = writeBatch(firestore);
            const status = action === 'approve' ? 'approved' : 'rejected';
            
            for (const id of selectedIds) {
                const req = requests.find(r => r.id === id);
                if (!req) continue;

                // Update Request Doc
                const reqRef = doc(firestore, 'box_change_requests', id);
                batch.update(reqRef, {
                    status,
                    updated_at: serverTimestamp()
                });

                // If Approval, update user profile
                if (action === 'approve') {
                    const userRef = doc(firestore, 'users', req.user_id);
                    const profileUpdate = {
                        box_number: req.new_box_number,
                        updated_at: serverTimestamp()
                    };
                    if (req.target_service_type) profileUpdate.service_type = req.target_service_type;
                    
                    if (req.request_type === 'Service Change' || req.type === 'service_change') {
                        profileUpdate.expiry_date = null;
                        profileUpdate.plan_id = null;
                        profileUpdate.plan_name = null;
                        profileUpdate.last_recharge = null;
                    }
                    batch.update(userRef, profileUpdate);
                    
                    // Notify
                    notificationService.sendNotificationWithRetry(req.user_id, "Box Change Approved", "Your box change request has been approved!", { type: 'box_change' });
                }
            }

            await batch.commit();
            setSelectedIds([]);
            showAlert({ title: 'Success', message: 'Bulk approval successful.', type: 'success', buttons: [{ text: 'OK', onPress: hideAlert }] });
        } catch (e) {
            console.error("Bulk Error:", e);
            showAlert({ title: 'Error', message: 'Failed to process bulk action.', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
        } finally {
            setBulkProcessing(false);
        }
    };

    // ── Single Action ──
    const processAction = async (request, action) => {
        if (processingId) return;
        setProcessingId(request.id);
        try {
            const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'completed';
            await updateDoc(doc(firestore, 'box_change_requests', request.id), {
                status,
                updated_at: serverTimestamp()
            });

            if (action === 'approve') {
                const userRef = doc(firestore, 'users', request.user_id);
                const profileUpdate = { box_number: request.new_box_number, updated_at: serverTimestamp() };
                if (request.target_service_type) profileUpdate.service_type = request.target_service_type;
                if (request.request_type === 'Service Change' || request.type === 'service_change') {
                    profileUpdate.expiry_date = null;
                    profileUpdate.plan_id = null;
                    profileUpdate.plan_name = null;
                    profileUpdate.last_recharge = null;
                }
                await updateDoc(userRef, profileUpdate);
            }

            notificationService.sendNotificationWithRetry(request.user_id, "Box Request Update", `Your request is now ${status}.`, { type: 'box_change' });
            showAlert({ title: 'Success', message: `Request ${action}ed.`, type: 'success', buttons: [{ text: 'OK', onPress: hideAlert }] });
        } catch (e) {
            showAlert({ title: 'Error', message: 'Failed to process.', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
        } finally {
            setProcessingId(null);
        }
    };

    // ── Components ──
    const RequestCard = ({ item }) => {
        const isSelected = selectedIds.includes(item.id);
        const showCheckbox = activeTab === 'new' && displayData.length >= 2;
        
        const getStatusColor = (s) => {
            if (s === 'pending') return '#F59E0B';
            if (s === 'approved') return '#1E40AF';
            if (s === 'completed') return '#10B981';
            return '#EF4444';
        };

        return (
            <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => showCheckbox ? toggleSelect(item.id) : null}
                style={[styles.card, { backgroundColor: themeColors.card, borderColor: isSelected ? themeColors.primary : themeColors.borderLight }]}
            >
                <View style={[styles.cardAccent, { backgroundColor: getStatusColor(item.status) }]} />
                <View style={styles.cardMain}>
                    <View style={styles.cardTop}>
                        {showCheckbox && (
                            <TouchableOpacity style={styles.checkbox} onPress={() => toggleSelect(item.id)}>
                                <Ionicons 
                                    name={isSelected ? "checkbox" : "square-outline"} 
                                    size={22} 
                                    color={isSelected ? themeColors.primary : themeColors.textSubtle} 
                                />
                            </TouchableOpacity>
                        )}
                        <View style={[styles.avatar, { backgroundColor: themeColors.primary + '15' }]}>
                            <Text style={[styles.avatarText, { color: themeColors.primary }]}>{(item.customer_name || 'U').charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={styles.headerInfo}>
                            <Text style={[styles.customerName, { color: themeColors.textPrimary }]}>{item.customer_name || 'Unknown'}</Text>
                            <Text style={[styles.mobile, { color: themeColors.textSubtle }]}>{item.mobile}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status.toUpperCase()}</Text>
                        </View>
                    </View>

                    <View style={[styles.detailsBox, { backgroundColor: themeColors.background }]}>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: themeColors.textSubtle }]}>TYPE</Text>
                            <Text style={[styles.detailValue, { color: themeColors.textPrimary }]}>{item.request_type || 'Box Change'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: themeColors.textSubtle }]}>OLD BOX</Text>
                            <Text style={[styles.detailValue, { color: themeColors.textPrimary }]}>{item.old_box_number || '—'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: themeColors.textSubtle }]}>NEW BOX</Text>
                            <Text style={[styles.detailValue, { color: themeColors.primary, fontWeight: '800' }]}>{item.new_box_number || '—'}</Text>
                        </View>
                    </View>

                    {item.status === 'pending' && !showCheckbox && (
                        <View style={styles.actions}>
                            <TouchableOpacity style={[styles.btn, { backgroundColor: '#EF444415' }]} onPress={() => processAction(item, 'reject')}>
                                <Text style={{ color: '#EF4444', fontWeight: '700' }}>Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btn, { backgroundColor: themeColors.primary }]} onPress={() => processAction(item, 'approve')}>
                                <Text style={{ color: '#FFF', fontWeight: '700' }}>Approve</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    
                    {item.status === 'approved' && (
                        <TouchableOpacity style={[styles.fullBtn, { backgroundColor: '#10B981' }]} onPress={() => processAction(item, 'complete')}>
                            <Ionicons name="checkmark-done" size={18} color="#FFF" />
                            <Text style={{ color: '#FFF', fontWeight: '700', marginLeft: 8 }}>Mark Completed</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={styles.appHeader}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu" size={26} color={themeColors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Box Update Requests</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Tabs */}
            <View style={[styles.tabsWrap, { backgroundColor: themeColors.card }]}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'new' && { backgroundColor: themeColors.primary + '15' }]} 
                    onPress={() => { setActiveTab('new'); setSelectedIds([]); }}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'new' ? themeColors.primary : themeColors.textSubtle }]}>
                        New Requests {pendingCount > 0 && `(${pendingCount})`}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'history' && { backgroundColor: themeColors.primary + '15' }]} 
                    onPress={() => { setActiveTab('history'); setSelectedIds([]); }}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'history' ? themeColors.primary : themeColors.textSubtle }]}>
                        History
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                    <Ionicons name="search" size={20} color={themeColors.textSubtle} />
                    <TextInput 
                        placeholder="Search by name, mobile or new box..." 
                        placeholderTextColor={themeColors.textSubtle}
                        style={[styles.searchInput, { color: themeColors.textPrimary }]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                {activeTab === 'new' && displayData.length >= 2 && (
                    <TouchableOpacity style={styles.selectAll} onPress={selectAll}>
                        <Text style={{ color: themeColors.primary, fontWeight: '700' }}>
                            {selectedIds.length === displayData.length ? 'Deselect All' : 'Select All'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}><ActivityIndicator color={themeColors.primary} size="large" /></View>
            ) : (
                <FlatList 
                    data={displayData}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <RequestCard item={item} />}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="documents-outline" size={60} color={themeColors.textSubtle} />
                            <Text style={{ color: themeColors.textSubtle, marginTop: 10 }}>No requests found</Text>
                        </View>
                    }
                />
            )}

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <View style={[styles.bulkBar, { backgroundColor: themeColors.card }]}>
                    <Text style={{ color: themeColors.textPrimary, fontWeight: '700' }}>{selectedIds.length} Selected</Text>
                    <TouchableOpacity 
                        style={[styles.bulkBtn, { backgroundColor: themeColors.primary }]} 
                        onPress={handleBulkApprove}
                        disabled={bulkProcessing}
                    >
                        {bulkProcessing ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: '800' }}>Approve Selected</Text>}
                    </TouchableOpacity>
                </View>
            )}

            <CustomAlert {...alertState} onDismiss={hideAlert} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    appHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 60 },
    menuButton: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800' },
    tabsWrap: { flexDirection: 'row', margin: 15, borderRadius: 12, padding: 4 },
    tab: { flex: 1, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    tabText: { fontWeight: '700', fontSize: 13 },
    searchContainer: { paddingHorizontal: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
    searchBar: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14 },
    selectAll: { paddingHorizontal: 5 },
    list: { padding: 15, paddingBottom: 100 },
    card: { borderRadius: 18, borderWidth: 1, marginBottom: 15, overflow: 'hidden', flexDirection: 'row' },
    cardAccent: { width: 4 },
    cardMain: { flex: 1, padding: 15 },
    cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    checkbox: { marginRight: 10 },
    avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { fontWeight: '800', fontSize: 16 },
    headerInfo: { flex: 1 },
    customerName: { fontSize: 15, fontWeight: '800' },
    mobile: { fontSize: 12 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    statusText: { fontSize: 9, fontWeight: '900' },
    detailsBox: { borderRadius: 12, padding: 12, gap: 8 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
    detailLabel: { fontSize: 10, fontWeight: '700' },
    detailValue: { fontSize: 12, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: 10, marginTop: 15 },
    btn: { flex: 1, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    fullBtn: { height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 15, flexDirection: 'row' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { marginTop: 100, alignItems: 'center' },
    bulkBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    bulkBtn: { paddingHorizontal: 25, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }
});

export default AdminRequestsScreen;
