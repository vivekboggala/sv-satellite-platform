import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
    ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
    Animated, RefreshControl
} from 'react-native';
import CustomAlert from '../components/CustomAlert';
import useAlert from '../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, firestore } from '../services/firebase';
import { collection, addDoc, query, where, getDocs, onSnapshot, orderBy, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import notificationService from '../services/notificationService';
import { validateBoxNumber } from '../utils/validation';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

// Only 3 service types used in this app
const SERVICE_TYPES = [
    { label: 'AP Fiber', value: 'ap_fiber' },
    { label: 'BCN Digital', value: 'bcn_digital' },
    { label: 'Hathway', value: 'hathway' },
];

// Format hints matching RegistrationScreen
const getBoxHint = (st) => {
    const h = {
        ap_fiber: '16 digit hex or DSNW + 8 chars',
        bcn_digital: 'Exactly 18 digits',
        hathway: 'T403231 + 6 digits',
    };
    return h[st] || '';
};

// REQUEST MODES
const MODE_UPGRADE = 'upgrade';    // Upgrade existing box (same service)
const MODE_CHANGE = 'change';     // Change to a different service type

const BoxChangeRequestScreen = ({ navigation }) => {
    const { isDark, themeColors } = useTheme();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('new');

    // User data
    const [userProfile, setUserProfile] = useState(null);
    const [planBlocked, setPlanBlocked] = useState(true);
    const [pendingBlocked, setPendingBlocked] = useState(false);

    // Derived isBlocked
    const isBlocked = planBlocked || pendingBlocked;

    // Form state
    const [mode, setMode] = useState(MODE_UPGRADE);
    const [targetService, setTargetService] = useState('');
    const [showServiceDropdown, setShowServiceDropdown] = useState(false);
    const [newBoxNumber, setNewBoxNumber] = useState('');
    const [validationError, setValidationError] = useState('');

    // UI state
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { alertState, showAlert, hideAlert } = useAlert();
    const [requests, setRequests] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    // Animation for service section
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-10)).current;

    // Animate service section in/out when mode changes
    useEffect(() => {
        if (mode === MODE_CHANGE) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: -10, duration: 200, useNativeDriver: true }),
            ]).start();
            setTargetService('');
            setShowServiceDropdown(false);
        }
        // Reset box number when mode changes
        setNewBoxNumber('');
        setValidationError('');
    }, [mode]);

    useEffect(() => {
        let userUnsub;
        let requestsUnsub;

        const setupListeners = async () => {
            const user = auth.currentUser;
            if (!user) {
                setLoading(false);
                return;
            }

            // 1. User Profile Listener
            userUnsub = onSnapshot(doc(firestore, 'users', user.uid), (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    setUserProfile(data);

                    if (data.recharge_expiry) {
                        const expiryDate = data.recharge_expiry.toDate
                            ? data.recharge_expiry.toDate()
                            : new Date(data.recharge_expiry);
                        setPlanBlocked(expiryDate > new Date());
                    } else {
                        setPlanBlocked(false);
                    }
                }
                setLoading(false);
            }, (error) => {
                console.error('User listener error:', error);
                setLoading(false);
            });

            // 2. Requests History Listener
            const q = query(
                collection(firestore, 'box_change_requests'),
                where('user_id', '==', user.uid)
            );

            requestsUnsub = onSnapshot(q, (snapshot) => {
                const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                // Sort descending locally to avoid index requirement
                fetched.sort((a, b) => {
                    const tA = a.created_at?.seconds || 0;
                    const tB = b.created_at?.seconds || 0;
                    return tB - tA;
                });

                setRequests(fetched);
                // If there's a pending request, block new ones
                setPendingBlocked(fetched.some(r => r.status === 'pending'));
                setRefreshing(false);
            }, (error) => {
                console.error('Requests listener error:', error);
                setRefreshing(false);
            });
        };

        setupListeners();

        return () => {
            if (userUnsub) userUnsub();
            if (requestsUnsub) requestsUnsub();
        };
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        // Real-time listeners automatically update, but we keep the visual feedback
        setTimeout(() => setRefreshing(false), 800);
    };

    // Determine which service to validate against
    const getValidationService = () => {
        if (mode === MODE_CHANGE) return targetService;
        return userProfile?.service_type || '';
    };

    const handleBoxNumberChange = (text) => {
        setNewBoxNumber(text);
        const svc = getValidationService();
        if (svc) {
            const result = validateBoxNumber(svc, text);
            setValidationError(result.isValid ? '' : result.message);
        }
    };

    const handleServiceChange = (value) => {
        setTargetService(value);
        setShowServiceDropdown(false);
        setNewBoxNumber('');
        setValidationError('');
    };

    const handleSubmit = async () => {
        if (isBlocked) {
            showAlert({ title: 'Action not allowed', message: 'You cannot submit a request at this time.', type: 'warning', buttons: [{ text: 'OK', onPress: hideAlert }] });
            return;
        }

        const svc = getValidationService();
        if (!svc) {
            showAlert({ title: t('missing_input'), message: t('select_service_type'), type: 'warning', buttons: [{ text: 'OK', onPress: hideAlert }] });
            return;
        }

        if (!newBoxNumber.trim()) {
            showAlert({ title: t('missing_input'), message: t('enter_new_box'), type: 'warning', buttons: [{ text: 'OK', onPress: hideAlert }] });
            return;
        }

        const result = validateBoxNumber(svc, newBoxNumber.trim());
        if (!result.isValid) {
            setValidationError(result.message);
            showAlert({ title: t('validation_failed'), message: result.message, type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
            return;
        }

        if (mode === MODE_CHANGE) {
            showAlert({
                title: t('confirm_service_change'),
                message: t('confirm_service_change_msg'),
                type: 'confirm',
                buttons: [
                    { text: t('cancel'), onPress: hideAlert },
                    { text: t('confirm_change'), onPress: () => { hideAlert(); proceedWithSubmit(); } }
                ]
            });
        } else {
            proceedWithSubmit();
        }
    };

    const proceedWithSubmit = async () => {
        setSubmitting(true);
        try {
            const user = auth.currentUser;
            await addDoc(collection(firestore, 'box_change_requests'), {
                user_id: user.uid,
                customer_name: userProfile?.name || 'Unknown',
                mobile: userProfile?.mobile || 'Unknown',
                service_type: userProfile?.service_type,
                target_service_type: mode === MODE_CHANGE ? targetService : userProfile?.service_type,
                request_type: mode === MODE_UPGRADE ? 'Upgrade' : 'Service Change',
                old_box_number: userProfile?.box_number || 'N/A',
                new_box_number: newBoxNumber.trim(),
                status: 'pending',
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
            });

            // Notify Admins (Fire and Forget)
            notificationService.sendNotificationWithRetry(
                'admin',
                'Box Change Request',
                `${userProfile?.name || 'Customer'} requested a box ${mode === MODE_UPGRADE ? 'upgrade' : 'service change'}.`,
                { type: 'box_change', user_id: user.uid }
            );

            showAlert({
                title: t('success'),
                message: t('request_submitted_success'),
                type: 'success',
                buttons: [{ text: 'OK', onPress: hideAlert }]
            });
            setActiveTab('history');
            setNewBoxNumber('');
            setTargetService('');
            setMode(MODE_UPGRADE);
        } catch (error) {
            console.error('Submit error:', error);
            showAlert({ title: 'Error', message: 'Failed to submit request.', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
        } finally {
            setSubmitting(false);
        }
    };

    // ── Sub-components ──
    const StatusBadge = ({ status }) => {
        const map = {
            approved: { color: '#10B981', bg: '#10B98115' },
            rejected: { color: '#EF4444', bg: '#EF444415' },
            pending: { color: '#F59E0B', bg: '#F59E0B15' },
            completed: { color: '#3B82F6', bg: '#3B82F615' },
        };
        const { color, bg } = map[status] || { color: themeColors.textSubtle, bg: themeColors.borderLight };
        return (
            <View style={[styles.statusBadge, { backgroundColor: bg }]}>
                <Text style={[styles.statusText, { color }]}>{status?.toUpperCase()}</Text>
            </View>
        );
    };

    const renderHistoryItem = ({ item }) => (
        <View style={[styles.historyCard, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
            <View style={styles.historyRow}>
                <View style={styles.historyLeft}>
                    <Ionicons name="construct-outline" size={16} color={themeColors.primary} />
                    <Text style={[styles.historyType, { color: themeColors.textPrimary }]}>{item.request_type}</Text>
                </View>
                <StatusBadge status={item.status} />
            </View>
            {item.target_service_type && (
                <Text style={[styles.historyMeta, { color: themeColors.textSubtle }]}>
                    Service: {item.target_service_type.replace(/_/g, ' ')}
                </Text>
            )}
            <Text style={[styles.historyMeta, { color: themeColors.textSubtle }]}>
                Box: {item.new_box_number}
            </Text>
            <Text style={[styles.historyDate, { color: themeColors.textSubtle }]}>
                {item.created_at?.toDate ? item.created_at.toDate().toLocaleDateString() : 'Just now'}
            </Text>
        </View>
    );

    // ── Render ──
    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* ── Flat Header ── */}
            <SafeAreaView
                edges={['top']}
                style={[styles.header, { backgroundColor: themeColors.background, borderBottomColor: themeColors.borderLight }]}
            >
                <TouchableOpacity
                    onPress={() => navigation.openDrawer()}
                    style={styles.menuBtn}
                >
                    <Ionicons name="menu" size={28} color={themeColors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>{t('stb_management')}</Text>
                <View style={{ width: 40 }} />
            </SafeAreaView>

            {/* ── Segmented Control ── */}
            <View style={[styles.segmentWrap, { backgroundColor: themeColors.card }]}>
                {['new', 'history'].map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.segmentBtn, activeTab === tab && { backgroundColor: themeColors.primary + '18' }]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.segmentText, { color: activeTab === tab ? themeColors.primary : themeColors.textSubtle }]}>
                            {tab === 'new' ? t('new_request') : t('history')}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={themeColors.primary} style={{ marginTop: 60 }} />
            ) : (
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    {activeTab === 'new' ? (
                        <ScrollView
                            contentContainerStyle={styles.scroll}
                            keyboardShouldPersistTaps="handled"
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    colors={[themeColors.primary]}
                                    tintColor={themeColors.primary}
                                />
                            }
                        >

                            {/* ── Blocked Warning ── */}
                            {isBlocked && (
                                <View style={styles.warningBox}>
                                    <Ionicons name="alert-circle" size={20} color="#EF4444" />
                                    <Text style={styles.warningText}>
                                        {pendingBlocked
                                            ? t('pending_request_warning')
                                            : t('box_change_blocked_msg')}
                                    </Text>
                                </View>
                            )}

                            {/* ── Blue Info Card (matches ProfileScreen) ── */}
                            {userProfile && (
                                <View style={styles.cardWrapper}>
                                    <LinearGradient
                                        colors={['#1E40AF', '#3B82F6']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.blueCard}
                                    >
                                        {/* Decorative blobs */}
                                        <View style={styles.blob1} />
                                        <View style={styles.blob2} />

                                        <View style={styles.blueCardRow}>
                                            <View style={styles.blueCardItem}>
                                                <Text style={styles.blueCardLabel}>{t('current_service').toUpperCase()}</Text>
                                                <Text style={styles.blueCardValue}>
                                                    {SERVICE_TYPES.find(s => s.value === userProfile.service_type)?.label || userProfile.service_type || '—'}
                                                </Text>
                                            </View>
                                            <View style={styles.blueCardDivider} />
                                            <View style={styles.blueCardItem}>
                                                <Text style={styles.blueCardLabel}>{t('current_box').toUpperCase()}</Text>
                                                <Text style={styles.blueCardValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                                                    {userProfile.box_number || '—'}
                                                </Text>
                                            </View>
                                        </View>
                                    </LinearGradient>
                                </View>
                            )}

                            {/* ── Mode Selection ── */}
                            <Text style={[styles.sectionLabel, { color: themeColors.textSubtle }]}>WHAT WOULD YOU LIKE TO DO?</Text>

                            <TouchableOpacity
                                style={[
                                    styles.modeCard,
                                    { backgroundColor: themeColors.card, borderColor: mode === MODE_UPGRADE ? themeColors.primary : themeColors.borderLight }
                                ]}
                                onPress={() => !isBlocked && setMode(MODE_UPGRADE)}
                                disabled={isBlocked}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.radioCircle, { borderColor: mode === MODE_UPGRADE ? themeColors.primary : themeColors.textSubtle }]}>
                                    {mode === MODE_UPGRADE && <View style={[styles.radioDot, { backgroundColor: themeColors.primary }]} />}
                                </View>
                                <View style={styles.modeText}>
                                    <Text style={[styles.modeTitle, { color: themeColors.textPrimary }]}>{t('upgrade_box')}</Text>
                                    <Text style={[styles.modeSubtitle, { color: themeColors.textSubtle }]}>{t('upgrade_box_sub')}</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.modeCard,
                                    { backgroundColor: themeColors.card, borderColor: mode === MODE_CHANGE ? themeColors.primary : themeColors.borderLight }
                                ]}
                                onPress={() => !isBlocked && setMode(MODE_CHANGE)}
                                disabled={isBlocked}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.radioCircle, { borderColor: mode === MODE_CHANGE ? themeColors.primary : themeColors.textSubtle }]}>
                                    {mode === MODE_CHANGE && <View style={[styles.radioDot, { backgroundColor: themeColors.primary }]} />}
                                </View>
                                <View style={styles.modeText}>
                                    <Text style={[styles.modeTitle, { color: themeColors.textPrimary }]}>{t('change_service_type')}</Text>
                                    <Text style={[styles.modeSubtitle, { color: themeColors.textSubtle }]}>{t('change_service_type_sub')}</Text>
                                </View>
                            </TouchableOpacity>

                            {/* ── Animated: Target Service (only for MODE_CHANGE) ── */}
                            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                                {mode === MODE_CHANGE && (
                                    <View style={styles.serviceSection}>
                                        <Text style={[styles.sectionLabel, { color: themeColors.textSubtle }]}>TARGET SERVICE</Text>

                                        <TouchableOpacity
                                            style={[styles.dropdownTrigger, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}
                                            onPress={() => setShowServiceDropdown(v => !v)}
                                            disabled={isBlocked}
                                        >
                                            <Text style={{ color: targetService ? themeColors.textPrimary : themeColors.textSubtle, fontSize: 15, fontWeight: '500' }}>
                                                {SERVICE_TYPES.find(s => s.value === targetService)?.label || t('select_service')}
                                            </Text>
                                            <Ionicons
                                                name={showServiceDropdown ? 'chevron-up' : 'chevron-down'}
                                                size={18}
                                                color={themeColors.textSubtle}
                                            />
                                        </TouchableOpacity>

                                        {showServiceDropdown && (
                                            <View style={[styles.dropdownList, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                                                {SERVICE_TYPES.filter(s => s.value !== userProfile?.service_type).map((s, idx, arr) => (
                                                    <TouchableOpacity
                                                        key={s.value}
                                                        style={[
                                                            styles.dropdownItem,
                                                            idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: themeColors.borderLight },
                                                            targetService === s.value && { backgroundColor: themeColors.primary + '12' }
                                                        ]}
                                                        onPress={() => handleServiceChange(s.value)}
                                                    >
                                                        <Text style={[styles.dropdownItemText, { color: themeColors.textPrimary }]}>{s.label}</Text>
                                                        {targetService === s.value && (
                                                            <Ionicons name="checkmark" size={16} color={themeColors.primary} />
                                                        )}
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                )}
                            </Animated.View>

                            {/* ── New Box Number ── */}
                            <Text style={[styles.sectionLabel, { color: themeColors.textSubtle, marginTop: 20 }]}>NEW BOX NUMBER</Text>
                            <View style={[
                                styles.inputBox,
                                { backgroundColor: themeColors.card, borderColor: validationError ? '#EF4444' : themeColors.borderLight }
                            ]}>
                                <TextInput
                                    style={[styles.input, { color: themeColors.textPrimary }]}
                                    value={newBoxNumber}
                                    onChangeText={handleBoxNumberChange}
                                    placeholder="Enter Box ID / MAC Address"
                                    placeholderTextColor={themeColors.textSubtle}
                                    autoCapitalize="characters"
                                    editable={!isBlocked}
                                />
                                {newBoxNumber.length > 0 && !validationError && (
                                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                )}
                                {validationError ? <Ionicons name="warning" size={20} color="#EF4444" /> : null}
                            </View>
                            {validationError ? (
                                <Text style={styles.errorText}>{validationError}</Text>
                            ) : (
                                getBoxHint(getValidationService()) ? (
                                    <Text style={[styles.hintText, { color: themeColors.textSubtle }]}>
                                        Format: {getBoxHint(getValidationService())}
                                    </Text>
                                ) : null
                            )}

                            {/* ── Submit ── */}
                            <TouchableOpacity
                                style={[styles.submitBtn, { backgroundColor: isBlocked ? '#9CA3AF' : themeColors.primary }]}
                                onPress={handleSubmit}
                                disabled={isBlocked || submitting}
                                activeOpacity={0.85}
                            >
                                {submitting
                                    ? <ActivityIndicator color="#FFF" />
                                    : <Text style={styles.submitText}>{t('submit_request')}</Text>
                                }
                            </TouchableOpacity>

                        </ScrollView>
                    ) : (
                        <FlatList
                            data={requests}
                            renderItem={renderHistoryItem}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.listPad}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    colors={[themeColors.primary]}
                                    tintColor={themeColors.primary}
                                />
                            }
                            ListEmptyComponent={
                                <View style={styles.emptyWrap}>
                                    <Ionicons name="file-tray-outline" size={56} color={themeColors.textSubtle} />
                                    <Text style={[styles.emptyText, { color: themeColors.textSubtle }]}>{t('no_requests')}</Text>
                                </View>
                            }
                        />
                    )}
                </KeyboardAvoidingView>
            )}

            <CustomAlert {...alertState} onDismiss={hideAlert} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 14,
        borderBottomWidth: 1,
    },
    menuBtn: {
        width: 40, height: 40,
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '700' },

    // Segment
    segmentWrap: {
        flexDirection: 'row',
        margin: 16,
        borderRadius: 12,
        padding: 4,
        elevation: 1,
    },
    segmentBtn: {
        flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9,
    },
    segmentText: { fontWeight: '700', fontSize: 13 },

    // Scroll
    scroll: { padding: 16, paddingBottom: 50 },

    // Warning
    warningBox: {
        flexDirection: 'row', gap: 10, padding: 14,
        borderRadius: 12, borderWidth: 1,
        borderColor: '#FCA5A5', backgroundColor: '#FEF2F2',
        marginBottom: 16,
    },
    warningText: { flex: 1, fontSize: 13, color: '#B91C1C', lineHeight: 20 },

    // Info card (old plain card — replaced by blue card)
    cardWrapper: { marginBottom: 20 },
    blueCard: {
        borderRadius: 18,
        padding: 20,
        overflow: 'hidden',
    },
    blob1: {
        position: 'absolute', width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.07)', top: -30, right: -20,
    },
    blob2: {
        position: 'absolute', width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.05)', bottom: -20, left: 10,
    },
    blueCardRow: { flexDirection: 'row', alignItems: 'center' },
    blueCardItem: { flex: 1 },
    blueCardDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 16 },
    blueCardLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 0.8, marginBottom: 6 },
    blueCardValue: { fontSize: 15, fontWeight: '800', color: '#FFF' },

    // Section label
    sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginBottom: 10 },

    // Mode cards (radio)
    modeCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        padding: 16, borderRadius: 14, borderWidth: 1.5, marginBottom: 10,
    },
    radioCircle: {
        width: 20, height: 20, borderRadius: 10, borderWidth: 2,
        justifyContent: 'center', alignItems: 'center',
    },
    radioDot: { width: 10, height: 10, borderRadius: 5 },
    modeText: { flex: 1 },
    modeTitle: { fontSize: 15, fontWeight: '700' },
    modeSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 2 },

    // Service section
    serviceSection: { marginTop: 4 },

    // Dropdown trigger
    dropdownTrigger: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16,
    },

    // Dropdown list (inline, not absolute)
    dropdownList: {
        borderRadius: 12, borderWidth: 1, marginTop: 6, overflow: 'hidden',
        elevation: 3,
    },
    dropdownItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
    },
    dropdownItemText: { fontSize: 14, fontWeight: '600' },

    // Box number input
    inputBox: {
        flexDirection: 'row', alignItems: 'center',
        height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, gap: 8,
    },
    input: { flex: 1, fontSize: 14, fontWeight: '600' },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: 5, marginLeft: 4 },
    hintText: { fontSize: 11, fontWeight: '500', fontStyle: 'italic', marginTop: 4, marginLeft: 4 },

    // Submit
    submitBtn: {
        marginTop: 28, height: 52, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center', elevation: 4,
    },
    submitText: { color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

    // History
    listPad: { padding: 16 },
    historyCard: {
        padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 12,
    },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    historyType: { fontWeight: '700', fontSize: 14 },
    historyMeta: { fontSize: 12, fontWeight: '500', marginTop: 2 },
    historyDate: { fontSize: 11, marginTop: 8 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: '800' },

    // Empty
    emptyWrap: { alignItems: 'center', marginTop: 80 },
    emptyText: { marginTop: 12, fontSize: 15, fontWeight: '500' },
});

export default BoxChangeRequestScreen;
