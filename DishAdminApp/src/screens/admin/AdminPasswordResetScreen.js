import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, TextInput, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { firestore } from '../../services/firebase';
import {
    collection, onSnapshot, query, updateDoc,
    doc, serverTimestamp, writeBatch, deleteDoc
} from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import CustomAlert from '../../components/CustomAlert';
import useAlert from '../../hooks/useAlert';
import notificationService from '../../services/notificationService';

const STATUS_MAP = {
    pending:  { color: '#F59E0B', bg: '#F59E0B18', label: 'PENDING' },
    resolved: { color: '#10B981', bg: '#10B98118', label: 'RESOLVED' },
};

const AdminPasswordResetScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const { alertState, showAlert, hideAlert } = useAlert();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [resetting, setResetting] = useState(false);

    const subscribe = useCallback(() => {
        const q = query(collection(firestore, 'password_reset_requests'));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => {
                if (a.status === 'pending' && b.status !== 'pending') return -1;
                if (b.status === 'pending' && a.status !== 'pending') return 1;
                return (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0);
            });
            setRequests(data);
            setLoading(false);
            setRefreshing(false);
        }, () => { setLoading(false); setRefreshing(false); });
        return unsub;
    }, []);

    useEffect(() => {
        let unsub;
        unsub = subscribe();
        return () => unsub?.();
    }, [subscribe]);

    const onRefresh = () => { setRefreshing(true); subscribe(); };

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const selectAll = () => {
        const pending = requests.filter(r => r.status === 'pending');
        if (selectedIds.length === pending.length) setSelectedIds([]);
        else setSelectedIds(pending.map(r => r.id));
    };

    const handleBulkResolve = () => {
        showAlert({
            title: `Resolve ${selectedIds.length} Requests?`,
            message: `This will mark selected requests as resolved without changing their passwords.`,
            type: 'confirm',
            buttons: [
                { text: 'Cancel', onPress: hideAlert },
                {
                    text: 'Resolve All',
                    onPress: async () => {
                        hideAlert();
                        setBulkProcessing(true);
                        try {
                            const batch = writeBatch(firestore);
                            selectedIds.forEach(id => {
                                batch.update(doc(firestore, 'password_reset_requests', id), {
                                    status: 'resolved',
                                    resolved_at: serverTimestamp()
                                });
                            });
                            await batch.commit();
                            setSelectedIds([]);
                            showAlert({ title: 'Success', message: 'Selected requests resolved.', type: 'success', buttons: [{ text: 'OK', onPress: hideAlert }] });
                        } catch (e) {
                            showAlert({ title: 'Error', message: 'Bulk action failed.', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
                        } finally {
                            setBulkProcessing(false);
                        }
                    }
                }
            ]
        });
    };
    
    const handleWipeAll = () => {
        showAlert({
            title: 'Wipe Reset History?',
            message: 'This will permanently delete ALL password reset records from the system. This action cannot be undone.',
            type: 'confirm',
            buttons: [
                { text: 'Cancel', onPress: hideAlert },
                {
                    text: 'Wipe All',
                    style: 'destructive',
                    onPress: async () => {
                        hideAlert();
                        setLoading(true);
                        try {
                            const batch = writeBatch(firestore);
                            requests.forEach(r => {
                                batch.delete(doc(firestore, 'password_reset_requests', r.id));
                            });
                            await batch.commit();
                            showAlert({ title: 'System Wiped', message: 'All reset requests have been removed.', type: 'success', buttons: [{ text: 'OK', onPress: hideAlert }] });
                        } catch (e) {
                            showAlert({ title: 'Wipe Failed', message: 'Could not delete all records.', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        });
    };

    const openResetModal = (item) => {
        setSelectedRequest(item);
        setNewPassword('');
        setShowPw(false);
        setModalVisible(true);
    };

    const markResolved = (item) => {
        showAlert({
            title: 'Mark as Resolved?',
            message: 'Close this request without changing password?',
            type: 'confirm',
            buttons: [
                { text: 'Cancel', onPress: hideAlert },
                {
                    text: 'Mark Resolved',
                    onPress: async () => {
                        hideAlert();
                        setProcessingId(item.id);
                        try {
                            await updateDoc(doc(firestore, 'password_reset_requests', item.id), {
                                status: 'resolved',
                                resolved_at: serverTimestamp(),
                            });
                        } catch (e) {
                            showAlert({ title: 'Error', message: 'Update failed.', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
                        } finally {
                            setProcessingId(null);
                        }
                    }
                }
            ]
        });
    };

    const RequestCard = ({ item }) => {
        const isPending = item.status === 'pending';
        const isSelected = selectedIds.includes(item.id);
        const dynamicCheckbox = requests.filter(r => r.status === 'pending').length >= 2;
        const statusInfo = STATUS_MAP[item.status] || STATUS_MAP.pending;
        const color = isPending ? '#F59E0B' : '#10B981';

        return (
            <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={() => (isPending && dynamicCheckbox) ? toggleSelect(item.id) : null}
                style={[styles.card, { backgroundColor: themeColors.card, borderColor: isSelected ? themeColors.primary : themeColors.borderLight }]}
            >
                <View style={[styles.cardAccent, { backgroundColor: color }]} />
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        {isPending && dynamicCheckbox && (
                            <TouchableOpacity style={styles.checkbox} onPress={() => toggleSelect(item.id)}>
                                <Ionicons 
                                    name={isSelected ? "checkbox" : "square-outline"} 
                                    size={22} 
                                    color={isSelected ? themeColors.primary : themeColors.textSubtle} 
                                />
                            </TouchableOpacity>
                        )}
                        <View style={[styles.avatarBox, { backgroundColor: color + '15' }]}>
                            <Ionicons name="lock-closed-outline" size={18} color={color} />
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={[styles.userName, { color: themeColors.textPrimary }]}>{item.mobile}</Text>
                            <Text style={[styles.userMeta, { color: themeColors.textSubtle }]}>
                                {item.created_at ? new Date(item.created_at.toDate()).toLocaleDateString() : 'Today'}
                            </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                            <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                        </View>
                    </View>

                    <View style={[styles.detailsSection, { backgroundColor: themeColors.background }]}>
                        <View style={styles.detailItem}>
                            <Ionicons name="hardware-chip-outline" size={14} color={themeColors.textSubtle} />
                            <Text style={[styles.detailText, { color: themeColors.textSecondary }]}>Box ID: <Text style={{ color: themeColors.textPrimary, fontWeight: '800' }}>{item.box_id || 'N/A'}</Text></Text>
                        </View>
                    </View>

                    {isPending && !dynamicCheckbox && (
                        <View style={styles.actionSection}>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: themeColors.borderLight }]} onPress={() => markResolved(item)}>
                                <Text style={{ color: themeColors.textSecondary, fontWeight: '700' }}>Dismiss</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: themeColors.primary }]} onPress={() => openResetModal(item)}>
                                <Text style={{ color: '#FFF', fontWeight: '700' }}>Reset Password</Text>
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
                <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Password Resets</Text>
                <View style={styles.headerActions}>
                    {requests.length > 0 && (
                        <TouchableOpacity onPress={handleWipeAll} style={{ marginRight: 15 }}>
                            <Ionicons name="trash-outline" size={24} color="#EF4444" />
                        </TouchableOpacity>
                    )}
                    {requests.filter(r => r.status === 'pending').length >= 2 ? (
                        <TouchableOpacity onPress={selectAll}>
                            <Text style={{ color: themeColors.primary, fontWeight: '700' }}>
                                {selectedIds.length === requests.filter(r => r.status === 'pending').length ? 'None' : 'All'}
                            </Text>
                        </TouchableOpacity>
                    ) : <View style={{ width: 40 }} />}
                </View>
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator size="large" color={themeColors.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <RequestCard item={item} />}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="shield-checkmark-outline" size={60} color={themeColors.primary} />
                            <Text style={[styles.emptyTitle, { color: themeColors.textPrimary, marginTop: 10 }]}>All Clear!</Text>
                        </View>
                    }
                />
            )}

            {selectedIds.length > 0 && (
                <View style={[styles.bulkBar, { backgroundColor: themeColors.card }]}>
                    <Text style={{ color: themeColors.textPrimary, fontWeight: '700' }}>{selectedIds.length} Selected</Text>
                    <TouchableOpacity style={[styles.bulkBtn, { backgroundColor: themeColors.primary }]} onPress={handleBulkResolve} disabled={bulkProcessing}>
                        {bulkProcessing ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: '800' }}>Resolve Selected</Text>}
                    </TouchableOpacity>
                </View>
            )}

            {/* Modal placeholder (unchanged logic) */}
            <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalSheet, { backgroundColor: themeColors.card }]}>
                            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Set New Password</Text>
                            <TextInput
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder="Min. 6 characters"
                                placeholderTextColor={themeColors.textSubtle}
                                secureTextEntry={!showPw}
                                style={[styles.textInput, { color: themeColors.textPrimary, borderBottomWidth: 1, borderBottomColor: themeColors.borderLight, marginVertical: 20 }]}
                            />
                            <TouchableOpacity style={[styles.resetBtn, { backgroundColor: themeColors.primary }]} onPress={() => setModalVisible(false)}>
                                <Text style={{ color: '#FFF', fontWeight: '800' }}>Confirm Reset (Offline)</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <CustomAlert {...alertState} onDismiss={hideAlert} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 60, borderBottomWidth: 1 },
    menuButton: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800' },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    listContent: { padding: 20, paddingBottom: 100 },
    card: { borderRadius: 20, marginBottom: 16, borderWidth: 1, overflow: 'hidden', flexDirection: 'row' },
    cardAccent: { width: 6 },
    cardContent: { flex: 1, padding: 16 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    checkbox: { marginRight: 10 },
    avatarBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    userInfo: { flex: 1 },
    userName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    userMeta: { fontSize: 12 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '800' },
    detailsSection: { padding: 12, borderRadius: 12, marginBottom: 14 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    detailText: { fontSize: 13, fontWeight: '600', flex: 1 },
    actionSection: { flexDirection: 'row', gap: 10 },
    actionBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    emptyState: { alignItems: 'center', marginTop: '40%' },
    emptyTitle: { fontSize: 20, fontWeight: '800' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 20, fontWeight: '900' },
    textInput: { height: 50, fontSize: 15 },
    resetBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    bulkBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    bulkBtn: { paddingHorizontal: 25, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }
});

export default AdminPasswordResetScreen;
