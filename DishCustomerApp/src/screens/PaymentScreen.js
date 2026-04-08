import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Linking, Dimensions, Image } from 'react-native';
import CustomAlert from '../components/CustomAlert';
import useAlert from '../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, firestore, storage } from '../services/firebase';
import notificationService from '../services/notificationService';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

const getServiceProviderName = (st) => {
    switch (st) {
        case 'ap_fiber': return 'APFiber (Net + TV)';
        case 'hathway': return 'Hathway Broadband';
        case 'bcn_digital': return 'BCN Digital Cable';
        default: return 'BCN Digital Cable';
    }
};

const PaymentScreen = ({ route, navigation }) => {
    const { themeColors, isDark } = useTheme();
    const { paymentData } = route.params || {};
    const { amount, plan_name, months, total_months, base_months, bonus_months, service_type } = paymentData || {};
    const effectiveMonths = total_months || months || 1;
    const isPromo = total_months && base_months && total_months > base_months;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [payMethod, setPayMethod] = useState('online'); // 'online' or 'cash'
    const [utrNumber, setUtrNumber] = useState('');
    const [userData, setUserData] = useState(null);
    const { alertState, showAlert, hideAlert } = useAlert();
    const isSubmitting = useRef(false);


    const [upiSettings, setUpiSettings] = useState({
        upi_id: "9704664121@paytm", // Fallback
        upi_name: "Dish Fiber"
    });


    const fetchUserData = async () => {
        const user = auth.currentUser;
        if (user) {
            try {
                const uDoc = await getDoc(doc(firestore, "users", user.uid));
                if (uDoc.exists()) setUserData(uDoc.data());
            } catch (err) { console.log("User fetch error:", err); }
        }
    };

    const fetchSettings = async () => {
        try {
            const docRef = doc(firestore, 'payment_settings', 'default');
            const docSnap = await getDoc(docRef).catch(() => null);
            if (docSnap && docSnap.exists()) {
                setUpiSettings(docSnap.data());
            }
        } catch (error) {
            console.log("Error fetching payment settings:", error);
        }
    };

    useEffect(() => {
        const init = async () => {
            // Wait for both, but cap total wait time to 3 seconds for UI responsiveness
            const timeout = new Promise(res => setTimeout(res, 3000));
            try {
                await Promise.race([
                    Promise.all([fetchSettings(), fetchUserData()]),
                    timeout
                ]);
            } catch (e) {
                console.log("Init error:", e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const upiId = upiSettings.upi_id;
    const upiName = upiSettings.upi_name;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR&tn=Recharge`)}`;

    const handleAppPayment = async (app) => {
        const upiUrl = generateUPIUrl(app);
        const genericUrl = generateUPIUrl('generic');

        try {
            // On Android 11+, canOpenURL often returns false even if app exists 
            // unless queries are declared. We should try to open and catch errors.
            const result = await Linking.openURL(upiUrl).catch(async () => {
                // If specific app fails, try generic UPI chooser
                console.log(`Failed to open ${app}, falling back to generic chooser`);
                return await Linking.openURL(genericUrl);
            });
        } catch (error) {
            console.error('Error opening UPI app:', error);
            showAlert({
                title: 'Payment App Error',
                message: `Unable to launch ${app === 'phonepe' ? 'PhonePe' : 'Google Pay'}. Please use the QR code or copy the UPI ID manually.`,
                type: 'error',
                buttons: [{ text: 'OK', onPress: hideAlert }]
            });
        }
    };

    const generateUPIUrl = (app) => {
        const baseParams = `pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR&tn=Recharge`;
        if (app === 'phonepe') return `phonepe://pay?${baseParams}`;
        if (app === 'gpay') return `tez://upi/pay?${baseParams}`;
        return `upi://pay?${baseParams}`;
    };

    const calculateDaysRemaining = (expiryDate) => {
        if (!expiryDate) return 0;
        const expiry = expiryDate.toDate ? expiryDate.toDate() : new Date(expiryDate);
        if (isNaN(expiry.getTime())) return 0;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const expiryZero = new Date(expiry);
        expiryZero.setHours(0, 0, 0, 0);
        const diffTime = expiryZero.getTime() - now.getTime();
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    };

    const handleConfirmPayment = async (method) => {
        if (submitting || isSubmitting.current) return;
        isSubmitting.current = true;
        if (method === 'cash') {
            setSubmitting(true);
            try {
                const user = auth.currentUser;
                const userName = userData?.name || user.displayName || 'Subscriber';

                // Calculate total value (Old Balance + Recharge)
                const currentDays = calculateDaysRemaining(userData?.expiry_date);
                const oldBalance = currentDays * 10;
                const totalValue = oldBalance + parseFloat(amount || 0);


                await addDoc(collection(firestore, 'payments'), {
                    user_id: user.uid,
                    user_name: userName,
                    amount: parseFloat(amount) || 0,
                    old_balance: oldBalance,
                    valued_at: totalValue,
                    months: months || 1,
                    base_months: base_months || months || 1,
                    bonus_months: bonus_months || 0,
                    total_months: effectiveMonths,
                    duration: effectiveMonths, // Standardizing names
                    plan_name: plan_name || 'Manual Renewal',
                    plan_speed: paymentData?.plan_speed || '',
                    plan_id: paymentData?.plan_id || '',
                    service_type: service_type || userData?.service_type || 'bcn_digital',
                    service_provider: userData?.service_provider || getServiceProviderName(service_type || userData?.service_type),
                    payment_method: 'cash',
                    status: 'pending',
                    timestamp: serverTimestamp(),
                    utr_number: 'CASH-' + Math.random().toString(36).substr(2, 9).toUpperCase()
                });

                // Notify Admins (Fire and Forget)
                notificationService.sendNotificationWithRetry(
                    'admin',
                    'Cash Collection Request',
                    `${userName} requested cash collection of ₹${amount} for ${plan_name || 'Manual Renewal'}.`,
                    { type: 'cash_payment', user_id: user.uid }
                );

                showAlert({
                    title: 'Success',
                    message: 'Cash request sent! Contact operator for approval.',
                    type: 'success',
                    buttons: [{ text: 'Home', onPress: () => { hideAlert(); navigation.navigate('MainDrawer'); } }]
                });
            } catch (e) {
                showAlert({ title: 'Error', message: 'Failed to send request.', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
            } finally {
                setSubmitting(false);
            isSubmitting.current = false;
            }
        } else {
            if (!utrNumber.trim() || utrNumber.length !== 12) {
                showAlert({
                    title: 'Required',
                    message: 'Please enter your exactly 12-digit Transaction ID/UTR for verification.',
                    type: 'warning',
                    buttons: [{ text: 'OK', onPress: hideAlert }]
                });
                return;
            }
            setSubmitting(true);
            try {
                const user = auth.currentUser;
                const userName = userData?.name || user.displayName || 'Subscriber';

                // Calculate total value (Old Balance + Recharge)
                const currentDays = calculateDaysRemaining(userData?.expiry_date);
                const oldBalance = currentDays * 10;
                const totalValue = oldBalance + parseFloat(amount || 0);


                await addDoc(collection(firestore, 'payments'), {
                    user_id: user.uid,
                    user_name: userName,
                    amount: parseFloat(amount) || 0,
                    old_balance: oldBalance,
                    valued_at: totalValue,
                    months: months || 1,
                    base_months: base_months || months || 1,
                    bonus_months: bonus_months || 0,
                    total_months: effectiveMonths,
                    duration: effectiveMonths, // Standardizing names
                    plan_name: plan_name || 'Online Recharge',
                    plan_speed: paymentData?.plan_speed || '',
                    plan_id: paymentData?.plan_id || '',
                    service_type: service_type || userData?.service_type || 'bcn_digital',
                    service_provider: userData?.service_provider || getServiceProviderName(service_type || userData?.service_type),
                    payment_method: 'online_upi',
                    utr_number: utrNumber,
                    status: 'pending',
                    timestamp: serverTimestamp()
                });

                // Notify Admins (Fire and Forget)
                notificationService.sendNotificationWithRetry(
                    'admin',
                    'New Payment Received',
                    `${userName} submitted a payment of ₹${amount} for ${plan_name || 'Online Recharge'}.`,
                    { type: 'payment', user_id: user.uid }
                );

                showAlert({
                    title: 'Received',
                    message: 'Verification in progress. Service will start soon.',
                    type: 'success',
                    buttons: [{ text: 'Awesome', onPress: () => { hideAlert(); navigation.navigate('MainDrawer'); } }]
                });
            } catch (e) {
                showAlert({ title: 'Error', message: 'Submission failed.', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
            } finally {
                setSubmitting(false);
            isSubmitting.current = false;
            }
        }
    };

    const copyUpiId = async () => {
        await Clipboard.setStringAsync(upiId);
        showAlert({ title: 'Copied', message: 'UPI ID copied to clipboard', type: 'info', buttons: [{ text: 'OK', onPress: hideAlert }] });
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.background : '#F8FAFC' }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            <SafeAreaView edges={['top']} style={[styles.headerArea, { backgroundColor: isDark ? themeColors.card : '#FFF' }]}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <MaterialIcons name="arrow-back" size={24} color={isDark ? '#FFF' : '#0F172A'} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#0F172A' }]}>Make Payment</Text>
                    {/* Header Icons Removed as requested */}
                    <View style={{ width: 40 }} />
                </View>
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* METHOD TABS */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, { backgroundColor: isDark ? themeColors.card : '#FFF' }, payMethod === 'online' && styles.activeTab]}
                        onPress={() => setPayMethod('online')}
                    >
                        <MaterialIcons name="qr-code-2" size={24} color={payMethod === 'online' ? '#FFF' : (isDark ? themeColors.textSubtle : '#64748B')} />
                        <Text style={[styles.tabText, { color: isDark ? themeColors.textSubtle : '#64748B' }, payMethod === 'online' && styles.activeTabText]}>UPI / Online</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, { backgroundColor: isDark ? themeColors.card : '#FFF' }, payMethod === 'cash' && styles.activeTab]}
                        onPress={() => setPayMethod('cash')}
                    >
                        <MaterialIcons name="payments" size={24} color={payMethod === 'cash' ? '#FFF' : (isDark ? themeColors.textSubtle : '#64748B')} />
                        <Text style={[styles.tabText, { color: isDark ? themeColors.textSubtle : '#64748B' }, payMethod === 'cash' && styles.activeTabText]}>Paid Cash</Text>
                    </TouchableOpacity>
                </View>

                {payMethod === 'online' ? (
                    <View style={[styles.mainCard, { backgroundColor: isDark ? themeColors.card : '#FFF', shadowColor: isDark ? '#000' : '#000' }]}>
                        <Text style={[styles.scanLabel, { color: isDark ? themeColors.textSubtle : '#64748B' }]}>SCAN TO PAY WITH ANY UPI APP</Text>

                        <View style={[styles.qrWrapper, { borderColor: isDark ? '#334155' : '#F8FAFC' }]}>
                            <Image source={{ uri: qrUrl }} style={styles.qrCode} />
                        </View>

                        <Text style={[styles.orLabel, { color: isDark ? themeColors.textSubtle : '#64748B' }]}>Or Pay Directly via:</Text>

                        <View style={styles.btnRow}>
                            <TouchableOpacity style={[styles.appBtn, { borderColor: isDark ? '#334155' : '#E2E8F0' }]} onPress={() => handleAppPayment('phonepe')}>
                                <Image source={{ uri: 'https://img.icons8.com/color/48/phone-pe.png' }} style={styles.appIcon} />
                                <Text style={[styles.appBtnText, { color: isDark ? '#FFF' : '#0F172A' }]}>PhonePe</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.appBtn, { borderColor: isDark ? '#334155' : '#E2E8F0' }]} onPress={() => handleAppPayment('gpay')}>
                                <Image source={{ uri: 'https://img.icons8.com/color/48/google-pay.png' }} style={styles.appIcon} />
                                <Text style={[styles.appBtnText, { color: isDark ? '#FFF' : '#0F172A' }]}>GPay</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.appBtn, { borderColor: isDark ? '#334155' : '#E2E8F0' }]} onPress={() => handleAppPayment('generic')}>
                                <View style={[styles.otherIconCircle, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                    <MaterialIcons name="apps" size={24} color={isDark ? '#FFF' : '#64748B'} />
                                </View>
                                <Text style={[styles.appBtnText, { color: isDark ? '#FFF' : '#0F172A' }]}>Others</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.upiCopyRow} onPress={copyUpiId}>
                            <Text style={styles.upiIdText}>{upiId}</Text>
                        </TouchableOpacity>

                        <View style={styles.utrSection}>
                            <Text style={[styles.utrLabel, { color: isDark ? themeColors.textSubtle : '#94A3B8' }]}>ENTER TRANSACTION ID / UTR</Text>
                            <TextInput
                                style={[
                                    styles.utrInput,
                                    {
                                        borderColor: utrNumber.length === 12 ? '#10B981' : (utrNumber.length > 0 ? '#EF4444' : (isDark ? '#334155' : '#E2E8F0')),
                                        color: isDark ? '#FFF' : '#0F172A'
                                    }
                                ]}
                                placeholder="12 digit UTR number"
                                placeholderTextColor={isDark ? themeColors.textSubtle : '#94A3B8'}
                                value={utrNumber}
                                onChangeText={(text) => setUtrNumber(text.replace(/[^0-9]/g, '').slice(0, 12))}
                                keyboardType="number-pad"
                                maxLength={12}
                            />
                            {utrNumber.length > 0 && utrNumber.length < 12 && (
                                <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700', marginTop: -12, marginBottom: 12, textAlign: 'center' }}>
                                    UTR must be exactly 12 digits ({utrNumber.length}/12)
                                </Text>
                            )}


                            <TouchableOpacity
                                style={[styles.submitBtn, (utrNumber.length !== 12 || submitting) && { opacity: 0.6 }]}
                                onPress={() => handleConfirmPayment('online')}
                                disabled={submitting || utrNumber.length !== 12}
                            >
                                {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>CONFIRM PAYMENT</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={[styles.mainCard, { backgroundColor: isDark ? themeColors.card : '#FFF' }]}>
                        <View style={styles.cashInfo}>
                            <MaterialIcons name="info-outline" size={40} color="#2563EB" />
                            <Text style={[styles.cashTitle, { color: isDark ? '#FFF' : '#0F172A' }]}>Paid Cash to Operator?</Text>
                            <Text style={[styles.cashDesc, { color: isDark ? themeColors.textSubtle : '#64748B' }]}>If you have already paid the amount to your local operator in cash, click the button below to send a verification request.</Text>

                            <View style={[styles.summaryBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                                <Text style={[styles.summaryLabel, { color: isDark ? themeColors.textSubtle : '#64748B' }]}>Recharge Details</Text>
                                <Text style={[styles.summaryValue, { color: isDark ? '#FFF' : '#0F172A' }]}>₹{amount}</Text>
                                <Text style={[styles.summarySub, { color: '#2563EB' }]}>
                                    {isPromo ? `${effectiveMonths} Months (${base_months} + ${bonus_months} FREE)` : `${effectiveMonths} Month(s)`}
                                </Text>
                            </View>


                            <TouchableOpacity style={[styles.submitBtn, { width: '100%' }]} onPress={() => handleConfirmPayment('cash')} disabled={submitting}>
                                {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>SEND APPROVAL REQUEST</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <CustomAlert {...alertState} onDismiss={hideAlert} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerArea: { borderBottomWidth: 0 },
    topBar: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '800' },

    content: { padding: 20 },

    tabContainer: { flexDirection: 'row', gap: 16, marginBottom: 30 },
    tab: { flex: 1, height: 100, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    activeTab: { backgroundColor: '#2563EB' },
    activeTabText: { color: '#FFF' },
    tabText: { fontSize: 14, fontWeight: '800', marginTop: 8 },

    mainCard: { borderRadius: 32, padding: 30, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20 },
    scanLabel: { textAlign: 'center', fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 25 },

    qrWrapper: { width: 220, height: 220, alignSelf: 'center', borderWidth: 15, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
    qrCode: { width: 180, height: 180 },

    orLabel: { textAlign: 'center', fontSize: 13, fontWeight: '700', marginBottom: 20 },

    btnRow: { flexDirection: 'row', gap: 12, marginBottom: 30 },
    appBtn: { flex: 1, height: 80, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center', gap: 6 },
    appIcon: { width: 32, height: 32 },
    otherIconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    appBtnText: { fontSize: 11, fontWeight: '800' },

    upiCopyRow: { alignSelf: 'center', paddingVertical: 10 },
    upiIdText: { fontSize: 16, fontWeight: '800', color: '#2563EB', textDecorationLine: 'underline' },

    utrSection: { marginTop: 20 },
    utrLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 12, textAlign: 'center' },
    utrInput: { height: 56, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 20, fontSize: 16, fontWeight: '700', marginBottom: 16, textAlign: 'center' },

    submitBtn: { height: 60, borderRadius: 20, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center' },
    submitBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },

    cashInfo: { alignItems: 'center', paddingVertical: 10 },
    cashTitle: { fontSize: 20, fontWeight: '900', marginTop: 20, marginBottom: 12 },
    cashDesc: { textAlign: 'center', fontSize: 13, lineHeight: 20, marginBottom: 30 },

    summaryBox: { width: '100%', borderRadius: 20, padding: 24, marginBottom: 30, alignItems: 'center' },
    summaryLabel: { fontSize: 12, fontWeight: '800', marginBottom: 8 },
    summaryValue: { fontSize: 32, fontWeight: '900' },
    summarySub: { fontSize: 12, fontWeight: '800', marginTop: 4 },

});

export default PaymentScreen;
