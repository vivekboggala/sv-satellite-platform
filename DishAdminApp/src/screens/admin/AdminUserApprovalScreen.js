import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { firestore } from '../../services/firebase';
import { collection, onSnapshot, query, where, updateDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import notificationService from '../../services/notificationService';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import CustomAlert from '../../components/CustomAlert';
import useAlert from '../../hooks/useAlert';

const AdminUserApprovalScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const { t } = useLanguage();
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const { alertState, showAlert, hideAlert } = useAlert();

    const fetchUsers = useCallback(async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);

        const q = query(
            collection(firestore, "users"),
            where("is_approved", "==", false)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const fetched = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.role !== 'admin' && data.status !== 'rejected') {
                    fetched.push({ id: doc.id, ...data });
                }
            });
            fetched.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
            setPendingUsers(fetched);
            setLoading(false);
            setRefreshing(false);
        }, (error) => {
            console.error("Admin Approval Error:", error);
            setLoading(false);
            setRefreshing(false);
        });

        return unsub;
    }, []);

    useEffect(() => {
        let unsub;
        fetchUsers().then(u => unsub = u);
        return () => unsub?.();
    }, [fetchUsers]);

    const handleAction = (user, approved) => {
        showAlert({
            title: approved ? "Approve User?" : "Decline User?",
            message: `Are you sure you want to ${approved ? 'approve' : 'decline'} the registration request for ${user.name || 'this user'}?`,
            type: approved ? 'confirm' : 'destructive',
            buttons: [
                { text: "Cancel", onPress: hideAlert },
                {
                    text: approved ? "Approve" : "Decline",
                    onPress: async () => {
                        if (processingId) return;
                        hideAlert();
                        setProcessingId(user.id);
                        try {
                            if (approved) {
                                await updateDoc(doc(firestore, "users", user.id), {
                                    is_approved: true,
                                    status: 'active',
                                    updated_at: serverTimestamp()
                                });
                                notificationService.sendNotificationWithRetry(user.id, "Registration Approved!", "Your account has been approved. Welcome to Dish Fiber.", { type: 'registration_approval', status: 'active' });
                                showAlert({ title: 'Success', message: `${user.name} has been approved.`, type: 'success', buttons: [{ text: 'OK', onPress: hideAlert }] });
                            } else {
                                await updateDoc(doc(firestore, "users", user.id), {
                                    status: 'rejected',
                                    updated_at: serverTimestamp()
                                });
                                notificationService.sendNotificationWithRetry(user.id, "Registration Update", "Your account registration was not approved.", { type: 'registration_rejection', status: 'rejected' });
                                showAlert({ title: 'Rejected', message: `${user.name}'s request has been rejected.`, type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
                            }
                        } catch (error) {
                            console.error("Error updating user status:", error);
                            showAlert({ title: 'Error', message: 'Action failed.', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
                        } finally {
                            setProcessingId(null);
                        }
                    }
                }
            ]
        });
    };

    // ── Bulk ──
    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const selectAll = () => {
        if (selectedIds.length === pendingUsers.length) setSelectedIds([]);
        else setSelectedIds(pendingUsers.map(u => u.id));
    };

    const handleBulkApprove = () => {
        showAlert({
            title: `Approve ${selectedIds.length} Users?`,
            message: `Are you sure you want to approve all selected users at once?`,
            type: 'confirm',
            buttons: [
                { text: "Cancel", onPress: hideAlert },
                {
                    text: "Approve All",
                    onPress: async () => {
                        hideAlert();
                        setBulkProcessing(true);
                        try {
                            const batch = writeBatch(firestore);
                            selectedIds.forEach(id => {
                                batch.update(doc(firestore, "users", id), {
                                    is_approved: true,
                                    status: 'active',
                                    updated_at: serverTimestamp()
                                });
                                notificationService.sendNotificationWithRetry(id, "Registration Approved!", "Your account has been approved in bulk. Welcome!", { type: 'registration_approval' });
                            });
                            await batch.commit();
                            setSelectedIds([]);
                            showAlert({ title: 'Done', message: 'All selected users approved.', type: 'success', buttons: [{ text: 'OK', onPress: hideAlert }] });
                        } catch (e) {
                            showAlert({ title: 'Error', message: 'Bulk approval failed.', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
                        } finally {
                            setBulkProcessing(false);
                        }
                    }
                }
            ]
        });
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers(true);
    };

    const ApprovalItem = ({ item }) => {
        const isSelected = selectedIds.includes(item.id);
        const dynamicCheckbox = pendingUsers.length >= 2;

        return (
            <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => dynamicCheckbox ? toggleSelect(item.id) : null}
                style={[styles.approvalCard, { backgroundColor: themeColors.card, borderColor: isSelected ? themeColors.primary : themeColors.borderLight }]}
            >
                <View style={styles.cardAccent} />
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        {dynamicCheckbox && (
                            <TouchableOpacity style={styles.checkbox} onPress={() => toggleSelect(item.id)}>
                                <Ionicons 
                                    name={isSelected ? "checkbox" : "square-outline"} 
                                    size={22} 
                                    color={isSelected ? themeColors.primary : themeColors.textSubtle} 
                                />
                            </TouchableOpacity>
                        )}
                        <View style={[styles.avatarBox, { backgroundColor: themeColors.primary + '15' }]}>
                            <Text style={[styles.avatarText, { color: themeColors.primary }]}>
                                {item.name?.charAt(0)?.toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={[styles.userName, { color: themeColors.textPrimary }]}>{item.name || 'New User'}</Text>
                            <Text style={[styles.userMeta, { color: themeColors.textSubtle }]}>
                                {item.mobile} • {item.village || 'No Village'}
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.detailsSection, { backgroundColor: themeColors.background }]}>
                        <View style={styles.detailItem}>
                            <Ionicons name="hardware-chip-outline" size={14} color={themeColors.textSubtle} />
                            <Text style={[styles.detailText, { color: themeColors.textSecondary }]}>
                                Box ID: <Text style={{ color: themeColors.textPrimary, fontWeight: '800' }}>{item.box_number || 'N/A'}</Text>
                            </Text>
                        </View>
                        <View style={[styles.detailItem, { marginTop: 6 }]}>
                            <Ionicons name="location-outline" size={14} color={themeColors.textSubtle} />
                            <Text style={[styles.detailText, { color: themeColors.textSecondary }]} numberOfLines={1}>
                                {item.address || 'No address provided'}
                            </Text>
                        </View>
                    </View>

                    {!dynamicCheckbox && (
                        <View style={styles.actionSection}>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF444415' }]} onPress={() => handleAction(item, false)}>
                                <Text style={{ color: '#EF4444', fontWeight: '700' }}>Decline</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: themeColors.primary }]} onPress={() => handleAction(item, true)}>
                                <Text style={{ color: '#FFF', fontWeight: '700' }}>Approve</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: themeColors.borderLight }]}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu" size={26} color={themeColors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>User Approvals</Text>
                {pendingUsers.length >= 2 ? (
                    <TouchableOpacity onPress={selectAll}>
                        <Text style={{ color: themeColors.primary, fontWeight: '700' }}>
                            {selectedIds.length === pendingUsers.length ? 'None' : 'All'}
                        </Text>
                    </TouchableOpacity>
                ) : <View style={{ width: 40 }} />}
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator size="large" color={themeColors.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={pendingUsers}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <ApprovalItem item={item} />}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="checkmark-done-circle" size={60} color={themeColors.success} />
                            <Text style={[styles.emptyTitle, { color: themeColors.textPrimary, marginTop: 10 }]}>All Clear!</Text>
                        </View>
                    }
                />
            )}

            {selectedIds.length > 0 && (
                <View style={[styles.bulkBar, { backgroundColor: themeColors.card }]}>
                    <Text style={{ color: themeColors.textPrimary, fontWeight: '700' }}>{selectedIds.length} Selected</Text>
                    <TouchableOpacity style={[styles.bulkBtn, { backgroundColor: themeColors.primary }]} onPress={handleBulkApprove} disabled={bulkProcessing}>
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 60, borderBottomWidth: 1 },
    menuButton: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800' },
    listContent: { padding: 20, paddingBottom: 100 },
    approvalCard: { borderRadius: 20, marginBottom: 16, borderWidth: 1, overflow: 'hidden', flexDirection: 'row' },
    cardAccent: { width: 6, backgroundColor: '#3B82F6' },
    cardContent: { flex: 1, padding: 16 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    checkbox: { marginRight: 10 },
    avatarBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { fontSize: 18, fontWeight: '700' },
    userInfo: { flex: 1 },
    userName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    userMeta: { fontSize: 13, fontWeight: '600' },
    detailsSection: { padding: 12, borderRadius: 12, marginBottom: 14 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    detailText: { fontSize: 13, fontWeight: '600', flex: 1 },
    actionSection: { flexDirection: 'row', gap: 12 },
    actionBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    emptyState: { alignItems: 'center', marginTop: '40%' },
    emptyTitle: { fontSize: 20, fontWeight: '800' },
    bulkBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    bulkBtn: { paddingHorizontal: 25, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }
});

export default AdminUserApprovalScreen;