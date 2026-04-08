import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, ScrollView, Modal, NativeModules } from 'react-native';
import CustomAlert from '../components/CustomAlert';
import useAlert from '../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { auth, firestore } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import TransactionCard from '../components/TransactionCard';
import { saveToCache, getFromCache, CACHE_KEYS } from '../utils/cacheManager';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { imgSignature, imgBranding, imgStamp } from '../utils/invoiceAssets';
import { getExpiryForService, formatDate as formatBcnDate } from '../utils/bcnCalculator';

const FILTER_STATUSES = ['All', 'Completed', 'Pending', 'Rejected'];

// ✅ Single branding helper - used everywhere
const getCompanyBranding = (service_type, service_provider) => {
    const sType = service_type?.toLowerCase() || '';
    const sProv = service_provider?.toLowerCase() || '';

    if (sType.includes('ap_fiber') || sType.includes('ap fiber') || sProv.includes('ap_fiber')) {
        return { name: 'AP Fiber', tagline: 'Connecting Andhra Pradesh', prefix: 'APFiber' };
    } else if (sType.includes('hathway') || sProv.includes('hathway')) {
        return { name: 'Hathway', tagline: 'Ultra Fast Broadband', prefix: 'Hathway' };
    } else if (sType.includes('fiber') || sType.includes('broadband')) {
        return { name: 'Fiber Broadband', tagline: 'High Speed Internet', prefix: 'Fiber' };
    }
    return { name: 'BCN Digital', tagline: 'Your Trusted Digital Partner', prefix: 'BCN' };
};

const PaymentHistoryScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const { t } = useLanguage();

    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const { alertState, showAlert, hideAlert } = useAlert();

    useEffect(() => {
        fetchPaymentHistory();
    }, []);

    const fetchPaymentHistory = async (forceRefresh = false) => {
        if (!forceRefresh) setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                setLoading(false);
                setRefreshing(false);
                return;
            }

            if (!forceRefresh) {
                const cached = await getFromCache(CACHE_KEYS.PAYMENTS);
                if (cached) {
                    setPayments(cached);
                    setLoading(false);
                }
            }

            // No orderBy here — avoids the composite index requirement in Firestore
            const q = query(
                collection(firestore, "payments"),
                where("user_id", "==", user.uid)
            );

            const snapshot = await getDocs(q);
            const history = [];
            snapshot.forEach((doc) => {
                history.push({ id: doc.id, ...doc.data() });
            });

            // Sort descending by timestamp client-side
            history.sort((a, b) => {
                const tA = a.timestamp?.seconds || 0;
                const tB = b.timestamp?.seconds || 0;
                return tB - tA;
            });

            setPayments(history);
            await saveToCache(CACHE_KEYS.PAYMENTS, history);
        } catch (error) {
            console.log("Error fetching payment history:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };


    const filteredPayments = useMemo(() => {
        return payments.filter(item => {
            const matchesStatus = activeFilter === 'All' ||
                item.status?.toLowerCase() === activeFilter.toLowerCase() ||
                (activeFilter === 'Completed' && item.status?.toLowerCase() === 'approved');

            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery ||
                (item.plan_name || '').toLowerCase().includes(searchLower) ||
                (item.utr_number || item.utr || '').toLowerCase().includes(searchLower);

            return matchesStatus && matchesSearch;
        });
    }, [payments, activeFilter, searchQuery]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchPaymentHistory(true);
    };

    const handleDownload = async (item) => {
        try {
            let ExpoPrint, ExpoSharing, ExpoFileSystem;
            try {
                ExpoPrint = require('expo-print');
                ExpoSharing = require('expo-sharing');
                ExpoFileSystem = require('expo-file-system/legacy');
            } catch (e) {
                throw new Error("NATIVE_MISSING");
            }

            if (!ExpoPrint?.printToFileAsync || !ExpoSharing?.shareAsync) {
                throw new Error("NATIVE_MISSING");
            }

            const issueTimestamp = (item.status?.toLowerCase() === 'approved' || item.status?.toLowerCase() === 'completed') ? (item.approved_at || item.timestamp) : item.timestamp;
            const payDate = issueTimestamp?.toDate
                ? new Date(issueTimestamp.toDate()).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
                : '---';
            const invoiceNo = `INV-${(item.utr_number || item.utr || Date.now()).toString().slice(-8).toUpperCase()}`;
            const isCash = item.payment_method?.toLowerCase() === 'cash';
            const utrLabel = isCash ? 'Payment Method' : 'Reference (UTR)';
            const utrValue = isCash ? 'Paid by Cash' : (item.utr_number || item.utr || '---');
            const serviceType = item.service_type ? item.service_type.replace(/_/g, ' ').toUpperCase() : 'GENERAL';

            // ✅ Calculate Expiry Date for Invoice
            const expiryObj = item.expiry_date || getExpiryForService(item.service_type, item.timestamp?.toDate ? item.timestamp.toDate() : new Date(), item.months || 1);
            const expiryDateStr = formatBcnDate(expiryObj);

            // ✅ One clean branding call - no duplicates, no conflicts
            const { name: companyName, tagline, prefix: filePrefix } = getCompanyBranding(item.service_type, item.service_provider);

            const htmlContent = `
                <html>
                    <head>
                        <style>
                            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                            * { box-sizing: border-box; margin: 0; padding: 0; }
                            body { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #1E293B; }

                            /* ── LETTERHEAD ── */
                            .letterhead {
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                padding: 25px 40px;
                                background: #fff;
                                border-bottom: 3px solid #E2E8F0;
                                text-align: center;
                            }
                            .company-name { 
                                font-size: 24px; 
                                font-weight: 900; 
                                letter-spacing: 1px; 
                                color: #1E40AF;
                                margin-bottom: 5px;
                                text-transform: uppercase;
                            }
                            .cell-number { font-size: 15px; font-weight: 700; color: #64748B; }

                            /* ── INVOICE STRIP ── */
                            .invoice-strip {
                                background: #F8FAFC;
                                border-bottom: 3px solid #E2E8F0;
                                padding: 14px 40px;
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                            }
                            .invoice-word { font-size: 22px; font-weight: 900; color: #1E293B; letter-spacing: 3px; text-transform: uppercase; }
                            .invoice-no { font-size: 14px; font-weight: 700; color: #4F46E5; }

                            /* ── BODY ── */
                            .invoice-body { padding: 30px 40px; }

                            /* ── META TABLE ── */
                            .meta-table { width: 100%; margin-bottom: 30px; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; }
                            .meta-table td { padding: 14px 18px; font-size: 13px; vertical-align: top; }
                            .meta-table .meta-key { font-weight: 700; font-size: 10px; color: #64748B; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px; }
                            .meta-table .meta-val { font-weight: 800; font-size: 15px; color: #1E293B; }
                            .meta-table tr:nth-child(odd) { background: #F8FAFC; }

                            /* ── LINE ITEMS ── */
                            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                            .items-table thead tr { background: #1E40AF; color: #fff; }
                            .items-table th { padding: 13px 18px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-align: left; }
                            .items-table td { padding: 15px 18px; border-bottom: 1px solid #F1F5F9; font-size: 14px; color: #1E293B; }
                            .items-table tbody tr:last-child td { border-bottom: none; }
                            .items-table tbody { background: #fff; }
                            .items-table .amt { text-align: right; font-weight: 800; }
                            .items-wrapper { border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; margin-bottom: 16px; }

                            /* ── TOTAL ── */
                            .total-area { display: flex; justify-content: flex-end; margin-bottom: 20px; }
                            .total-box {
                                border-top: 2px solid #E2E8F0;
                                padding: 12px 0;
                                text-align: right;
                                width: 220px;
                            }
                            .total-lbl { font-size: 14px; font-weight: 700; color: #64748B; text-transform: uppercase; }
                            .total-num { font-size: 26px; font-weight: 900; color: #1E40AF; }
                            .status-line { text-align: right; font-size: 12px; font-weight: 800; color: #10B981; text-transform: uppercase; letter-spacing: 1px; }

                            /* ── SIGNATURE & STAMP ── */
                            .sign-area {
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                margin-top: 40px;
                                position: relative;
                                width: 220px;
                                margin-left: auto;
                            }
                            .sign-img {
                                max-height: 65px;
                                width: auto;
                                margin-bottom: 2px;
                                z-index: 2;
                            }
                            .sign-label { 
                                font-size: 13px; 
                                font-weight: 800; 
                                color: #64748B; 
                                margin-top: 4px;
                                margin-bottom: 10px;
                                width: 100%;
                                text-align: center;
                                text-transform: uppercase;
                                letter-spacing: 1px;
                            }
                            .stamp-container {
                                position: relative;
                                margin-top: 5px;
                                display: flex;
                                justify-content: center;
                                width: 100%;
                            }
                            .stamp-img {
                                max-height: 90px;
                                width: auto;
                                z-index: 1;
                            }

                            /* ── FOOTER ── */
                            .footer {
                                background: #F8FAFC;
                                border-top: 1px solid #E2E8F0;
                                padding: 16px 40px;
                                text-align: center;
                                font-size: 11px;
                                color: #94A3B8;
                                font-weight: 500;
                            }
                            .footer strong { color: #64748B; }
                        </style>
                    </head>
                    <body>

                        <div class="letterhead">
                            <div class="company-name">SRI VINAYAKA SATELLITE COMMUNICATIONS</div>
                            <div class="cell-number">Cell: 9704664121</div>
                        </div>

                        <!-- ── INVOICE STRIP ── -->
                        <div class="invoice-strip">
                            <div class="invoice-word">TAX INVOICE / RECEIPT</div>
                            <div class="invoice-no">#${invoiceNo}</div>
                        </div>

                        <!-- ── BODY ── -->
                        <div class="invoice-body">

                            <!-- ── META ── -->
                            <table class="meta-table">
                                <tr>
                                    <td>
                                        <span class="meta-key">Subscriber Name</span>
                                        <span class="meta-val">${item.user_name || 'Valued Subscriber'}</span>
                                    </td>
                                    <td>
                                        <span class="meta-key">Date of Issue</span>
                                        <span class="meta-val">${payDate}</span>
                                    </td>
                                    <td>
                                        <span class="meta-key">Expiry Date</span>
                                        <span class="meta-val" style="color: #E11D48;">${expiryDateStr}</span>
                                    </td>
                                    <td style="text-align:right;">
                                        <span class="meta-key">${utrLabel}</span>
                                        <span class="meta-val">${utrValue}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <span class="meta-key">Service Type</span>
                                        <span class="meta-val">${serviceType}</span>
                                    </td>
                                    <td>
                                        <span class="meta-key">Provider</span>
                                        <span class="meta-val">${companyName}</span>
                                    </td>
                                    ${!isCash ? `
                                    <td style="text-align:right;">
                                        <span class="meta-key">Payment</span>
                                        <span class="meta-val">Online Transfer</span>
                                    </td>` : '<td style="text-align:right;"></td>'}
                                </tr>
                            </table>

                            <!-- ── LINE ITEMS ── -->
                            <div class="items-wrapper">
                                <table class="items-table">
                                    <thead>
                                        <tr>
                                            <th>Description</th>
                                            <th style="text-align:right;">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>
                                                <strong>${item.plan_name || 'Service Recharge'}</strong><br>
                                                <span style="font-size:12px;color:#64748B;">Monthly Subscription Fee — ${serviceType}</span><br>
                                                <span style="font-size:11px;color:#94A3B8;">Billing Period / Duration: ${item.months || 1} Month(s)</span>
                                            </td>
                                            <td class="amt">&#8377;${item.amount || '0'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- ── TOTAL ── -->
                            <div class="total-area">
                                <div>
                                    <div class="total-box">
                                        <div class="total-lbl">Grand Total</div>
                                        <div class="total-num">&#8377;${item.amount || '0'}</div>
                                    </div>
                                    <div class="status-line">&#10003; Status: ${item.status || 'Completed'}</div>
                                </div>
                            </div>

                             <!-- ── SIGNATURE & STAMP ── -->
                             <div class="sign-area">
                                 <img src="${imgSignature}" class="sign-img" alt="Signature" />
                                 <div class="sign-label">Authorized Signature</div>
                                 <div class="stamp-container">
                                     <img src="${imgStamp}" class="stamp-img" alt="Stamp" />
                                 </div>
                             </div>
                        </div>

                        <!-- ── FOOTER ── -->
                        <div class="footer">
                            <p>Thank you for choosing <strong>Sri Vinayaka Satellite Communications</strong>. For support, call <strong>9704664121</strong>.</p>
                            <p style="margin-top:4px;">&copy; ${new Date().getFullYear()} S.V.S. Communications. All rights reserved.</p>
                        </div>

                    </body>
                </html>`;


            const { uri } = await ExpoPrint.printToFileAsync({ html: htmlContent });
            // ✅ Dynamic filename: APFiber_Receipt_INV-XXXX.pdf / BCN_Receipt_INV-XXXX.pdf etc.
            const fileName = `${filePrefix}_Receipt_${invoiceNo}.pdf`;
            const downloadDir = ExpoFileSystem.documentDirectory + fileName;
            await ExpoFileSystem.copyAsync({ from: uri, to: downloadDir });
            await ExpoSharing.shareAsync(downloadDir);

        } catch (error) {
            console.log("Download Error:", error);
            showAlert({
                title: "Native Build Required",
                message: "To enable PDF generation and downloading, please rebuild your app as a native build by running: \n\n'npx expo run:android'\n\nThis feature cannot run in basic Expo Go without those native modules.",
                type: "info",
                buttons: [{ text: "OK", onPress: hideAlert }]
            });
        }
    };

    const openReceipt = (item) => {
        setSelectedPayment(item);
        setShowReceipt(true);
    };

    const formatDate = (ts) => {
        if (!ts) return '---';
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        if (isNaN(date.getTime())) return '---';
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            <SafeAreaView edges={['top']} style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.backBtn}>
                        <MaterialIcons name="menu" size={28} color={themeColors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Payment History</Text>
                    <View style={{ width: 40 }} />
                </View>
            </SafeAreaView>

            <View style={styles.content}>
                {/* SEARCH BAR */}
                <View style={[styles.searchBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <Ionicons name="search" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                    <TextInput
                        style={[styles.searchInput, { color: themeColors.textPrimary }]}
                        placeholder="Search by UTR or plan name..."
                        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={isDark ? '#64748B' : '#94A3B8'} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* FILTER CHIPS */}
                <View style={styles.filtersContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        {FILTER_STATUSES.map((status) => (
                            <TouchableOpacity
                                key={status}
                                onPress={() => setActiveFilter(status)}
                                style={[
                                    styles.filterChip,
                                    { backgroundColor: activeFilter === status ? '#4F46E5' : (isDark ? '#1E293B' : '#F1F5F9') }
                                ]}
                            >
                                <Text style={[
                                    styles.filterText,
                                    { color: activeFilter === status ? '#FFF' : (isDark ? '#94A3B8' : '#64748B') }
                                ]}>
                                    {status}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {loading ? (
                    <View style={styles.loaderBox}>
                        <ActivityIndicator size="large" color="#4F46E5" />
                    </View>
                ) : (
                    <FlatList
                        data={filteredPayments}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TransactionCard
                                item={item}
                                planName={item.plan_name}
                                amount={item.amount}
                                valuedAt={item.valued_at}
                                timestamp={item.timestamp}
                                status={item.status}
                                reference={item.utr_number || item.utr}
                                paymentMethod={item.payment_method}
                                months={item.months || item.duration}
                                onDownload={() => openReceipt(item)}
                            />
                        )}
                        contentContainerStyle={styles.listArea}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <Ionicons name="receipt-outline" size={60} color={isDark ? '#334155' : '#CBD5E1'} />
                                <Text style={[styles.emptyText, { color: isDark ? '#64748B' : '#94A3B8' }]}>No transaction records found.</Text>
                            </View>
                        }
                    />
                )}
            </View>

            <Modal visible={showReceipt} transparent animationType="slide" onRequestClose={() => setShowReceipt(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.receiptBox, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                        <TouchableOpacity onPress={() => setShowReceipt(false)} style={styles.closeBtnAbsolute}>
                            <Ionicons name="close" size={24} color={themeColors.textPrimary} />
                        </TouchableOpacity>

                        {/* ✅ Dynamic brand name in modal */}
                        <Text style={[styles.subBrandText, { color: '#4F46E5' }]}>
                            {getCompanyBranding(selectedPayment?.service_type, selectedPayment?.service_provider).name}
                        </Text>
                        <Text style={[styles.receiptTitle, { color: themeColors.textPrimary }]}>Payment Receipt</Text>

                        <View style={[styles.receiptDetailBox, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#F8FAFC' }]}>
                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptLabel}>Plan Name</Text>
                                <Text style={[styles.receiptValue, { color: themeColors.textPrimary }]}>
                                    {selectedPayment?.plan_name || '---'}
                                </Text>
                            </View>
                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptLabel}>
                                    {selectedPayment?.payment_method?.toLowerCase() === 'cash' ? 'Payment Method' : 'Reference (UTR)'}
                                </Text>
                                <Text style={[styles.receiptValue, { color: themeColors.textPrimary }]}>
                                    {selectedPayment?.payment_method?.toLowerCase() === 'cash'
                                        ? 'Paid by Cash'
                                        : (selectedPayment?.utr_number || selectedPayment?.utr || '---')}
                                </Text>
                            </View>
                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptLabel}>Date</Text>
                                <Text style={[styles.receiptValue, { color: themeColors.textPrimary }]}>
                                    {formatDate((selectedPayment?.status?.toLowerCase() === 'approved' || selectedPayment?.status?.toLowerCase() === 'completed') ? (selectedPayment?.approved_at || selectedPayment?.timestamp) : selectedPayment?.timestamp)}
                                </Text>
                            </View>
                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptLabel}>Status</Text>
                                <Text style={[styles.receiptValue, { color: '#10B981' }]}>
                                    {selectedPayment?.status?.toUpperCase() || 'COMPLETED'}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.pdfButton, { backgroundColor: '#4F46E5' }]}
                            onPress={() => handleDownload(selectedPayment)}
                        >
                            <Ionicons name="cloud-download-outline" size={20} color="#FFF" />
                            <Text style={styles.pdfButtonText}>Download PDF</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <CustomAlert {...alertState} onDismiss={hideAlert} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { borderBottomWidth: 1, paddingBottom: 8 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 50 },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800' },
    content: { flex: 1, paddingTop: 16 },
    searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, paddingHorizontal: 16, height: 48, borderRadius: 14, marginBottom: 16 },
    searchInput: { flex: 1, marginHorizontal: 10, fontSize: 14, fontWeight: '500' },
    filtersContainer: { marginBottom: 16 },
    filterScroll: { paddingHorizontal: 16, gap: 10 },
    filterChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100, minWidth: 70, alignItems: 'center', justifyContent: 'center' },
    filterText: { fontSize: 13, fontWeight: '700' },
    listArea: { paddingHorizontal: 16, paddingBottom: 40 },
    loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 16, fontSize: 15, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    receiptBox: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingTop: 30, paddingBottom: 40 },
    closeBtnAbsolute: { position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    subBrandText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', textAlign: 'center', letterSpacing: 1, marginBottom: 2 },
    receiptTitle: { fontSize: 20, fontWeight: '900', marginBottom: 16, textAlign: 'center' },
    receiptDetailBox: { borderRadius: 20, padding: 16, marginBottom: 16 },
    receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    receiptLabel: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    receiptValue: { fontSize: 13, fontWeight: '800' },
    amountSection: { alignItems: 'center', marginBottom: 24 },
    totalLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 2 },
    totalValue: { fontSize: 36, fontWeight: '900' },
    pdfButton: { flexDirection: 'row', height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 10 },
    pdfButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default PaymentHistoryScreen;