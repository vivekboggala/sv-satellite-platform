import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Dimensions, RefreshControl } from 'react-native';
import CustomAlert from '../../components/CustomAlert';
import useAlert from '../../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { firestore } from '../../services/firebase';
import { collection, onSnapshot, query, where, updateDoc, doc, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { calculateBCNRecharge } from '../../utils/bcnCalculator';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import notificationService from '../../services/notificationService';

const { width } = Dimensions.get('window');

// ── EXPIRY HELPERS ──
const getAPFiberExpiry = (baseDate, months = 1) => {
    const expiry = new Date(baseDate);
    expiry.setDate(expiry.getDate() + (30 * months));
    expiry.setHours(23, 59, 59, 999);
    return expiry;
};

const getHathwayExpiry = (baseDate, months = 1) => {
    const expiry = new Date(baseDate);
    expiry.setDate(expiry.getDate() + (30 * months));
    expiry.setHours(23, 59, 59, 999);
    return expiry;
};

const AdminPaymentsScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const { t } = useLanguage();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const isProcessing = useRef(false);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const { alertState, showAlert, hideAlert } = useAlert();

    const fetchPayments = useCallback(async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        const q = query(
            collection(firestore, "payments"),
            where("status", "==", "pending"),
            orderBy("timestamp", "desc")
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPayments(fetched);
            setLoading(false);
            setRefreshing(false);
        }, (error) => {
            console.error("Admin Payments Error:", error);
            setLoading(false);
            setRefreshing(false);
        });

        return unsub;
    }, []);

    useEffect(() => {
        let unsub;
        fetchPayments().then(u => unsub = u);
        return () => unsub?.();
    }, [fetchPayments]);

    const handleAction = (payment, action) => {
        showAlert({
            title: action === 'approve' ? "Approve Payment?" : "Reject Payment?",
            message: `Are you sure you want to ${action} the payment of ₹${payment.amount} from ${payment.user_name}?`,
            type: action === 'approve' ? 'confirm' : 'destructive',
            buttons: [
                { text: "Cancel", onPress: hideAlert },
                {
                    text: action === 'approve' ? "Approve" : "Reject",
                    onPress: () => {
                        hideAlert();
                        processAction(payment, action);
                    }
                }
            ]
        });
    };

    const processAction = async (payment, action) => {
        if (processingId || isProcessing.current) return;
        isProcessing.current = true; // Prevent double trigger
        setProcessingId(payment.id);
        try {
            await applyPaymentUpdate(payment, action);
            if (showAlert) {
                showAlert({ 
                    title: action === 'approve' ? "Success" : "Rejected", 
                    message: action === 'approve' ? "Payment approved and subscription updated." : "Payment has been rejected.", 
                    type: action === 'approve' ? 'success' : 'error', 
                    buttons: [{ text: 'OK', onPress: hideAlert }] 
                });
            }
        } catch (error) {
            console.error("Error updating payment:", error);
            showAlert({ title: "Error", message: "Failed to process payment.", type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
        } finally {
            setProcessingId(null);
            isProcessing.current = false;
        }
    };

    const applyPaymentUpdate = async (payment, action) => {
        await updateDoc(doc(firestore, "payments", payment.id), {
            status: action === 'approve' ? 'completed' : 'rejected',
            action_timestamp: serverTimestamp(),
            approved_at: action === 'approve' ? serverTimestamp() : null,
            processed_by: 'Super Admin'
        });

        if (action === 'approve' && payment.user_id) {
            const userRef = doc(firestore, "users", payment.user_id);
            const uDoc = await getDoc(userRef);
            const userDocData = uDoc.data();

            let updateData = {
                status: 'active',
                is_approved: true,
                last_recharge: serverTimestamp(),
                plan_name: payment.plan_name || userDocData?.plan_name,
                plan_id: payment.plan_id || userDocData?.plan_id,
                plan_speed: payment.plan_speed || userDocData?.plan_speed
            };

            const rawSt = (payment.service_type || userDocData?.service_type || '').toLowerCase().replace(/[^a-z]/g, '');
            const rawSp = (payment.service_provider || userDocData?.service_provider || '').toLowerCase().replace(/[^a-z]/g, '');
            const planName = (payment.plan_name || '').toLowerCase();
            const monthsToAdd = parseInt(payment.total_months || payment.duration || payment.months) || 1;

            const isAPFiber = rawSt.includes('apfiber') || rawSt.includes('apfibre') || (rawSt.includes('ap') && rawSt.includes('fiber')) || rawSp.includes('apfiber') || userDocData?.service_type?.toLowerCase().includes('ap_fiber');
            const isHathway = rawSt.includes('hathway') || rawSp.includes('hathway') || planName.includes('hathway');
            const isBCN = !isAPFiber && !isHathway && (rawSt.includes('bcn') || rawSt === 'cable' || rawSp.includes('bcn') || planName.includes('bcn'));

            // Use the Moment of Approval for expiry calculation
            const approvalMoment = new Date();
            let baseDate = new Date(approvalMoment);
            baseDate.setHours(0, 0, 0, 0);

            let newExpiry;
            if (isAPFiber) newExpiry = getAPFiberExpiry(baseDate, monthsToAdd);
            else if (isHathway) newExpiry = getHathwayExpiry(baseDate, monthsToAdd);
            else if (isBCN) {
                const info = calculateBCNRecharge(monthsToAdd);
                newExpiry = new Date(info.expiryDate);
                newExpiry.setHours(23, 59, 59, 999);
                updateData.last_recharge_amount = info.amount;
                updateData.bcn_calculation = info;
            } else newExpiry = getHathwayExpiry(baseDate, monthsToAdd);

            updateData.expiry_date = newExpiry;
            updateData.subscription_duration = monthsToAdd;
            updateData.approved_recharge_date = approvalMoment; // Explicitly store the approval time
            
            await updateDoc(userRef, updateData);

            notificationService.sendNotificationWithRetry(payment.user_id, "Payment Approved! ✅", `Your payment of ₹${payment.amount} for ${payment.plan_name} has been approved.`, { type: 'payment_approval' });
        } else if (action === 'reject') {
            notificationService.sendNotificationWithRetry(payment.user_id, "Payment Rejected", `Your payment of ₹${payment.amount} was rejected. Please contact support.`, { type: 'payment_rejection' });
        }
    };

    // ── Bulk ──
    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const selectAll = () => {
        if (selectedIds.length === payments.length) setSelectedIds([]);
        else setSelectedIds(payments.map(p => p.id));
    };

    const handleBulkApprove = () => {
        showAlert({
            title: `Approve ${selectedIds.length} Payments?`,
            message: `Are you sure you want to approve all selected revenue requests? This will update user subscriptions immediately.`,
            type: 'confirm',
            buttons: [
                { text: "Cancel", onPress: hideAlert },
                {
                    text: "Approve All",
                    onPress: async () => {
                        if (bulkProcessing || isProcessing.current) return;
                        hideAlert();
                        setBulkProcessing(true);
                        isProcessing.current = true;
                        try {
                            for (const id of selectedIds) {
                                const payment = payments.find(p => p.id === id);
                                if (payment) await applyPaymentUpdate(payment, 'approve');
                            }
                            setSelectedIds([]);
                            showAlert({ title: 'Done', message: 'All selected payments approved.', type: 'success', buttons: [{ text: 'OK', onPress: hideAlert }] });
                        } catch (e) {
                            console.error("Bulk Error:", e);
                            showAlert({ title: 'Error', message: 'Bulk approval failed.', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
                        } finally {
                            setBulkProcessing(false);
                            isProcessing.current = false;
                        }
                    }
                }
            ]
        });
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchPayments(true);
    };

    const PaymentItem = ({ item }) => {
        const isSelected = selectedIds.includes(item.id);
        const dynamicCheckbox = payments.length >= 2;

        return (
            <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => dynamicCheckbox ? toggleSelect(item.id) : null}
                style={[styles.paymentVoucher, { backgroundColor: themeColors.card, borderColor: isSelected ? themeColors.primary : themeColors.borderLight }]}
            >
                <View style={styles.voucherTop}>
                    <View style={styles.headerLeftRow}>
                        {dynamicCheckbox && (
                            <TouchableOpacity style={styles.checkbox} onPress={() => toggleSelect(item.id)}>
                                <Ionicons 
                                    name={isSelected ? "checkbox" : "square-outline"} 
                                    size={22} 
                                    color={isSelected ? themeColors.primary : themeColors.textSubtle} 
                                />
                            </TouchableOpacity>
                        )}
                        <View style={[styles.methodBadge, { backgroundColor: themeColors.primary + '15' }]}>
                            <Ionicons name="card-outline" size={14} color={themeColors.primary} />
                            <Text style={[styles.methodText, { color: themeColors.primary }]}>{item.payment_method?.toUpperCase()}</Text>
                        </View>
                    </View>
                    <Text style={[styles.timestamp, { color: themeColors.textSubtle }]}>
                        {item.timestamp ? new Date(item.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                    </Text>
                </View>

                <View style={styles.voucherMain}>
                    <View style={styles.subscriberBox}>
                        <Text style={[styles.subscriberName, { color: themeColors.textPrimary }]}>{item.user_name || 'Subscriber'}</Text>
                        <Text style={[styles.planChip, { color: themeColors.textSecondary, backgroundColor: themeColors.background }]}>
                            {item.plan_name} · {item.total_months || 1} mo
                        </Text>
                    </View>
                    <View style={styles.priceBox}>
                        <Text style={[styles.currency, { color: '#059669' }]}>₹</Text>
                        <Text style={[styles.amount, { color: '#059669' }]}>{item.amount}</Text>
                    </View>
                </View>

                <View style={[styles.voucherDetails, { borderColor: themeColors.borderLight }]}>
                    <View style={styles.detailItem}>
                        <Text style={[styles.detailLabel, { color: themeColors.textSubtle }]}>UTR / TRANSACTION ID</Text>
                        <Text style={[styles.detailValue, { color: themeColors.textPrimary }]}>{item.utr_number || 'N/A'}</Text>
                    </View>
                </View>

                {!dynamicCheckbox && (
                    <View style={styles.voucherActions}>
                        <TouchableOpacity
                            style={[styles.vActionBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2', borderColor: '#EF4444', borderWidth: isDark ? 1 : 0 }]}
                            onPress={() => handleAction(item, 'reject')}
                            disabled={processingId !== null}
                        >
                            <Text style={[styles.vActionText, { color: '#EF4444' }]}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.vActionBtn, { backgroundColor: '#059669' }]}
                            onPress={() => setSelectedPayment(item)}
                            disabled={processingId !== null}
                        >
                            {processingId === item.id ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[styles.vActionText, { color: '#FFF' }]}>Verify & Approve</Text>}
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <View style={[styles.header, { backgroundColor: themeColors.background, borderBottomColor: themeColors.borderLight }]}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu" size={26} color={themeColors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Payments Queue</Text>
                {payments.length >= 2 ? (
                    <TouchableOpacity onPress={selectAll}>
                        <Text style={{ color: themeColors.primary, fontWeight: '700' }}>
                            {selectedIds.length === payments.length ? 'None' : 'All'}
                        </Text>
                    </TouchableOpacity>
                ) : <View style={{ width: 40 }} />}
            </View>

            <View style={styles.content}>
                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color={themeColors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={payments}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => <PaymentItem item={item} />}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="wallet-outline" size={60} color="#059669" />
                                <Text style={[styles.emptyTitle, { color: themeColors.textPrimary, marginTop: 10 }]}>All Clear!</Text>
                            </View>
                        }
                    />
                )}
            </View>

            {selectedIds.length > 0 && (
                <View style={[styles.bulkBar, { backgroundColor: themeColors.card }]}>
                    <Text style={{ color: themeColors.textPrimary, fontWeight: '700' }}>{selectedIds.length} Selected</Text>
                    <TouchableOpacity style={[styles.bulkBtn, { backgroundColor: themeColors.primary }]} onPress={handleBulkApprove} disabled={bulkProcessing}>
                        {bulkProcessing ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: '800' }}>Approve Selected</Text>}
                    </TouchableOpacity>
                </View>
            )}

            <Modal visible={!!selectedPayment} transparent animationType="slide" onRequestClose={() => setSelectedPayment(null)}>
                <View style={styles.modalBackdrop}>
                    <View style={[styles.verificationModal, { backgroundColor: themeColors.card }]}>
                        <View style={[styles.verificationHeader, { borderBottomColor: themeColors.borderLight, borderBottomWidth: 1 }]}>
                            <Text style={[styles.verificationTitle, { color: themeColors.textPrimary }]}>Single Verification</Text>
                            <TouchableOpacity onPress={() => setSelectedPayment(null)}><Ionicons name="close" size={24} color={themeColors.textPrimary} /></TouchableOpacity>
                        </View>
                        <View style={[styles.vDetailCard, { backgroundColor: themeColors.background, borderColor: themeColors.borderLight }]}>
                            <Text style={[styles.vLabel, { color: themeColors.textSubtle }]}>SUBSCRIBER</Text>
                            <Text style={[styles.vValue, { color: themeColors.textPrimary, marginBottom: 15 }]}>{selectedPayment?.user_name}</Text>
                            <Text style={[styles.vLabel, { color: themeColors.textSubtle }]}>AMOUNT</Text>
                            <Text style={[styles.vAmount, { color: '#059669', marginBottom: 15 }]}>₹{selectedPayment?.amount}</Text>
                            <Text style={[styles.vLabel, { color: themeColors.textSubtle }]}>UTR</Text>
                            <Text style={[styles.vValue, { color: themeColors.textPrimary }]}>{selectedPayment?.utr_number}</Text>
                        </View>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: '#EF444415' }]} onPress={() => { handleAction(selectedPayment, 'reject'); setSelectedPayment(null); }}>
                                <Text style={{ color: '#EF4444', fontWeight: '800' }}>Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: '#059669' }]} onPress={() => { handleAction(selectedPayment, 'approve'); setSelectedPayment(null); }}>
                                <Text style={{ color: '#FFF', fontWeight: '800' }}>Approve</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
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
    headerLeftRow: { flexDirection: 'row', alignItems: 'center' },
    checkbox: { marginRight: 10 },
    content: { flex: 1 },
    listContent: { padding: 20, paddingBottom: 100 },
    paymentVoucher: { borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1.5 },
    voucherTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    methodBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    methodText: { fontSize: 10, fontWeight: '800' },
    timestamp: { fontSize: 12, fontWeight: '600' },
    voucherMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
    subscriberBox: { flex: 1, marginRight: 12 },
    subscriberName: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
    planChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontSize: 12, fontWeight: '700', overflow: 'hidden' },
    priceBox: { flexDirection: 'row', alignItems: 'flex-start' },
    currency: { fontSize: 16, fontWeight: '800', marginTop: 4, marginRight: 2 },
    amount: { fontSize: 32, fontWeight: '800' },
    voucherDetails: { paddingTop: 16, borderTopWidth: 1, borderStyle: 'dashed', marginBottom: 20 },
    detailItem: { flex: 1 },
    detailLabel: { fontSize: 10, fontWeight: '800', marginBottom: 4 },
    detailValue: { fontSize: 14, fontWeight: '700' },
    voucherActions: { flexDirection: 'row', gap: 12 },
    vActionBtn: { flex: 1, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    vActionText: { fontSize: 14, fontWeight: '800' },
    emptyState: { alignItems: 'center', marginTop: '30%' },
    emptyTitle: { fontSize: 20, fontWeight: '800' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    verificationModal: { width: '90%', borderRadius: 32, overflow: 'hidden' },
    verificationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
    verificationTitle: { fontSize: 18, fontWeight: '800' },
    vDetailCard: { margin: 24, padding: 20, borderRadius: 20, borderWidth: 1 },
    vLabel: { fontSize: 10, fontWeight: '800', marginBottom: 4 },
    vValue: { fontSize: 15, fontWeight: '700' },
    vAmount: { fontSize: 24, fontWeight: '900' },
    modalActions: { flexDirection: 'row', gap: 12, padding: 24, paddingTop: 0, paddingBottom: 40 },
    modalActionBtn: { flex: 1, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    bulkBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    bulkBtn: { paddingHorizontal: 25, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }
});

export default AdminPaymentsScreen;