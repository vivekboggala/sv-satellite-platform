import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, KeyboardAvoidingView, Platform,
    ActivityIndicator, StatusBar, Modal, Animated, Dimensions
} from 'react-native';
import CustomAlert from '../components/CustomAlert';
import useAlert from '../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dropdown } from 'react-native-element-dropdown';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, firestore } from '../services/firebase';
import { setDoc, doc, collection, getDocs, serverTimestamp, query, where } from 'firebase/firestore';
import notificationService from '../services/notificationService';
import { validateBoxNumber } from '../utils/validation';
import { useTheme } from '../context/ThemeContext';

const useDebounce = (val, ms) => {
    const [d, setD] = React.useState(val);
    React.useEffect(() => { const t = setTimeout(() => setD(val), ms); return () => clearTimeout(t); }, [val, ms]);
    return d;
};

// ── CONSTANTS ──
const INITIAL_VILLAGES = [
    "Gollapalle", "Kolamasanapalle", "Eragunde Palle", "Eguva Kalladu",
    "Nadimi Kalladu", "Diguva Kalladu", "Madhiga Kalladu", "Gundlapalle",
    "GutakaPalle", "Ayyamreddi Palle", "Nadimi Doddi Palle", "Moram",
    "Nakkapalle", "Cattle Farm", "Pathikonda", "Burisettipalle",
    "Belupalle", "Chikkanapalle", "Lakkanapalle", "C.C.Gunta"
].sort();

const KOLA_SUB_AREAS = ["Main Road", "Colony", "Komati Veedi", "Ega Veedi", "Diga Veedi", "RM Compound"];

const SERVICE_PROVIDERS = [
    { id: 'ap_fiber', label: 'APFiber (Net + TV)' },
    { id: 'hathway', label: 'Hathway Broadband' },
    { id: 'bcn_digital', label: 'BCN Digital Cable' },
];

const getBoxHint = (st) => {
    const h = { ap_fiber: '16 digit hex or DSNW + 8 chars', bcn_digital: '14-24 digits', hathway: 'T403231 + 6 digits' };
    return h[st] || '';
};

const checkUserExists = async (mobile) => {
    try {
        const q = query(collection(firestore, 'users'), where('mobile', '==', mobile));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const existing = snap.docs[0].data();
            console.log(`Registration blocked: Mobile ${mobile} exists. ID: ${snap.docs[0].id}, Status: ${existing.status}`);
            return { exists: true, status: existing.status, id: snap.docs[0].id };
        }
        return { exists: false };
    } catch (e) {
        console.error("CheckUserExists Error:", e);
        return { exists: false }; // Allow attempt if check fails
    }
};

// ── VALIDATION ──
const RegSchema = Yup.object().shape({
    fullName: Yup.string().min(3, 'At least 3 characters').required('Name is needed'),
    mobile: Yup.string().matches(/^\d{10}$/, 'Enter valid 10 digits').required('Needed'),
    password: Yup.string().min(6, 'At least 6 characters').required('Needed'),
    village: Yup.string().required('Pick your village'),
    subArea: Yup.string().when('village', { is: 'Kolamasanapalle', then: (s) => s.required('Pick your street'), otherwise: (s) => s.notRequired() }),
    serviceType: Yup.string().required('Pick your service'),
    boxNumber: Yup.string().required('Box number is needed')
        .test('box', 'Wrong format', function (v) {
            if (!v || !this.parent.serviceType) return true;
            const r = validateBoxNumber(this.parent.serviceType, v);
            return r.isValid || this.createError({ message: r.message || `Should be: ${getBoxHint(this.parent.serviceType)}` });
        }),
});

// ── FADE IN ──
const FadeIn = ({ visible, children }) => {
    const anim = useRef(new Animated.Value(0)).current;
    const [show, setShow] = useState(false);
    useEffect(() => {
        if (visible) { setShow(true); Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: true }).start(); }
        else Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setShow(false));
    }, [visible]);
    if (!show) return null;
    return <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>{children}</Animated.View>;
};

// ── SUCCESS MODAL ──
const SuccessModal = ({ visible, onClose, themeColors, isDark }) => (
    <Modal visible={visible} transparent animationType="fade">
        <View style={modalS.overlay}>
            <View style={[modalS.card, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0' }]}>

                {/* Green checkmark with circle rings */}
                <View style={modalS.iconRing}>
                    <View style={modalS.iconOuter}>
                        <View style={modalS.iconInner}>
                            <Ionicons name="checkmark" size={40} color="#10B981" />
                        </View>
                    </View>
                </View>

                {/* Title */}
                <Text style={[modalS.title, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>Registration Successful!</Text>

                {/* Description with orange "Pending Approval" */}
                <Text style={[modalS.desc, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Your account has been created and is{'\n'}currently{' '}
                    <Text style={{ color: '#F59E0B', fontWeight: '900' }}>Pending Approval</Text>.
                </Text>

                {/* Sub description */}
                <Text style={[modalS.subDesc, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                    Please wait for the administrator to activate{'\n'}your account. You will be able to login once{'\n'}approved.
                </Text>

                {/* Expected Wait Time box */}
                <View style={[modalS.waitBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                    <Ionicons name="time" size={24} color="#7C3AED" />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={[modalS.waitTitle, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>Expected Wait Time</Text>
                        <Text style={[modalS.waitSub, { color: isDark ? '#64748B' : '#94A3B8' }]}>Usually within 2-4 hours</Text>
                    </View>
                </View>

                {/* Back to Login button */}
                <TouchableOpacity activeOpacity={0.88} onPress={onClose} style={{ width: '100%', marginTop: 8 }}>
                    <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={modalS.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <Ionicons name="arrow-back" size={20} color="#FFF" style={{ marginRight: 10 }} />
                        <Text style={modalS.btnText}>Back to Login</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

const modalS = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    card: { borderRadius: 32, padding: 32, width: '100%', alignItems: 'center', borderWidth: 1, elevation: 25, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 30 },
    iconRing: { marginBottom: 28 },
    iconOuter: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(16, 185, 129, 0.12)', justifyContent: 'center', alignItems: 'center' },
    iconInner: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(16, 185, 129, 0.15)', justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 26, fontWeight: '900', marginBottom: 16, textAlign: 'center', letterSpacing: -0.5 },
    desc: { fontSize: 16, fontWeight: '500', textAlign: 'center', lineHeight: 26, marginBottom: 10 },
    subDesc: { fontSize: 14, fontWeight: '400', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
    waitBox: { width: '100%', borderRadius: 20, padding: 18, marginBottom: 24, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
    waitTitle: { fontSize: 15, fontWeight: '800' },
    waitSub: { fontSize: 12, fontWeight: '500', marginTop: 4 },
    btn: { height: 56, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    btnText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.2 },
});

// ── MAIN ──
const RegistrationScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const { alertState, showAlert, hideAlert } = useAlert();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const [villages, setVillages] = useState(INITIAL_VILLAGES);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const snap = await getDocs(collection(firestore, 'villages'));
                const f = []; snap.forEach(d => { if (d.data().name) f.push(d.data().name); });
                if (f.length > 0) setVillages(f.sort());
            } catch (e) { console.log('Using saved villages'); }
        })();
    }, []);

    const handleRegister = async (values) => {
        if (loading) return;
        setLoading(true);
        try {
            const result = await checkUserExists(values.mobile);
            if (result.exists) {
                const statusMsg = result.status ? ` (Status: ${result.status})` : '';
                showAlert({
                    title: 'Already Registered',
                    message: `Mobile ${values.mobile} is already in use${statusMsg}. If you previously registered, please wait for admin approval.`,
                    type: 'warning',
                    buttons: [
                        { text: 'Go to Login', onPress: () => { hideAlert(); navigation.replace('Login'); } },
                        { text: 'Cancel', onPress: hideAlert }
                    ]
                });
                setLoading(false); return;
            }

            const email = `${values.mobile}@dish.com`;
            let user;
            try {
                const cred = await createUserWithEmailAndPassword(auth, email, values.password);
                user = cred.user;
            } catch (err) {
                if (err.code === 'auth/email-already-in-use') {
                    try {
                        const { signInWithEmailAndPassword } = require('firebase/auth');
                        const cred = await signInWithEmailAndPassword(auth, email, values.password);
                        user = cred.user;
                    } catch (signInErr) {
                        try {
                            const API_KEY = 'AIzaSyD6biy7nQZupyAzSozJAzwUaKWDsB0IM9M';
                            const lookupRes = await fetch(
                                `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${API_KEY}`,
                                {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ identifier: email, continueUri: 'http://localhost' })
                                }
                            );
                            const lookupData = await lookupRes.json();
                            if (lookupData.registered) {
                                showAlert({
                                    title: 'Password Changed',
                                    message: 'An old account with this number exists with a different password. Please contact admin to fully delete your old account, or try registering with your previous password.',
                                    type: 'info',
                                    buttons: [
                                        { text: 'Go to Login', onPress: () => { hideAlert(); navigation.replace('Login'); } },
                                        { text: 'OK', onPress: hideAlert }
                                    ]
                                });
                                setLoading(false); return;
                            }
                        } catch (restErr) {
                            console.log('REST API check failed:', restErr.message);
                        }
                        showAlert({
                            title: 'Already Exists',
                            message: 'An account with this number already exists. Please contact admin.',
                            type: 'warning',
                            buttons: [
                                { text: 'Go to Login', onPress: () => { hideAlert(); navigation.replace('Login'); } },
                                { text: 'Cancel', onPress: hideAlert }
                            ]
                        });
                        setLoading(false); return;
                    }
                } else {
                    throw err;
                }
            }

            // Save user data to Firestore
            await setDoc(doc(firestore, 'users', user.uid), {
                id: user.uid, name: values.fullName, mobile: values.mobile, email: '',
                village: values.village, sub_area: values.village === 'Kolamasanapalle' ? values.subArea : null,
                service_type: values.serviceType, box_number: values.boxNumber.trim().toUpperCase(),
                customer_id: `DH${values.mobile.substring(6)}`,
                is_approved: false, status: 'pending',
                plan_id: null, plan_name: null, expiry_date: null,
                onesignal_player_id: null, created_at: serverTimestamp(),
            });

            // OneSignal logic (non-blocking)
            try {
                notificationService.login(user.uid);
                // notificationService.setTags({ user_type: 'customer', user_id: user.uid, status: 'active', village: values.village, service_type: values.serviceType });
            } catch (e) { console.log('OneSignal:', e.message); }

            // Fire-and-forget notification to admin
            notificationService.sendNotificationWithRetry(
                'admin',
                "New Registration",
                `${values.fullName} has registered from ${values.village}. Approval pending.`,
                { type: 'registration', user_id: user.uid }
            );

            // IMPORTANT: Stop loading and show success modal BEFORE signOut
            // signOut triggers auth listener which would navigate away and unmount this screen
            setLoading(false);
            setShowSuccess(true);

        } catch (error) {
            showAlert({ title: 'Failed', message: error.message, type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
            setLoading(false);
        }
    };

    // ── style helpers ──
    const inputBg = isDark ? '#1E293B' : '#F1F5F9';
    const bdrClr = (name, valid) => {
        if (focusedField === name) return '#2563EB';
        if (valid) return '#10B981';
        return isDark ? '#334155' : '#E2E8F0';
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={isDark ? ['#020617', '#0F172A', '#1E293B'] : ['#F8FAFC', '#EDF2F7', '#E2E8F0']} style={StyleSheet.absoluteFillObject} />
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

            <View style={[styles.glowCircle, { top: -80, left: -60, backgroundColor: '#3B82F6', opacity: isDark ? 0.12 : 0.08 }]} />
            <View style={[styles.glowCircle, { bottom: -100, right: -70, backgroundColor: '#7C3AED', opacity: isDark ? 0.08 : 0.04 }]} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
                    {/* Top bar */}
                    <View style={styles.topBar}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: isDark ? '#1E293B' : '#FFF' }]}>
                            <Ionicons name="arrow-back" size={18} color={themeColors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[styles.topTitle, { color: themeColors.textPrimary }]}>New Account</Text>
                        <View style={{ width: 36 }} />
                    </View>

                    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <View style={styles.centerContent}>
                            {/* Form Card */}
                            <View style={[styles.card, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                                <Formik initialValues={{ fullName: '', mobile: '', password: '', village: '', subArea: '', serviceType: '', boxNumber: '' }}
                                    validationSchema={RegSchema} onSubmit={handleRegister}>
                                    {({ handleChange, handleBlur, handleSubmit, setFieldValue, setFieldTouched, validateField, values, errors, touched }) => {
                                        const [boxInput, setBoxInput] = React.useState('');
                                        const debouncedBox = useDebounce(boxInput, 500);
                                        const boxVisible = !!values.serviceType;

                                        React.useEffect(() => {
                                            if (debouncedBox !== values.boxNumber) {
                                                setFieldValue('boxNumber', debouncedBox);
                                                setTimeout(() => validateField('boxNumber'), 50);
                                            }
                                        }, [debouncedBox]);

                                        return (
                                            <View>
                                                {/* ── Personal ── */}
                                                <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Personal Details</Text>

                                                {/* Full Name */}
                                                <View style={styles.fieldGroup}>
                                                    <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Full Name</Text>
                                                    <View style={[styles.inputRow, {
                                                        backgroundColor: inputBg,
                                                        borderColor: touched.fullName && errors.fullName ? '#EF4444'
                                                            : bdrClr('fullName', touched.fullName && !errors.fullName && values.fullName.length >= 3)
                                                    }]}>
                                                        <TextInput style={[styles.textInput, { color: themeColors.textPrimary }]}
                                                            placeholder="Enter your full name" placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                                            onChangeText={handleChange('fullName')} value={values.fullName}
                                                            onFocus={() => setFocusedField('fullName')} onBlur={() => { handleBlur('fullName'); setFocusedField(null); }}
                                                            editable={!loading}
                                                        />
                                                        {touched.fullName && !errors.fullName && values.fullName.length >= 3 && (
                                                            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                                                        )}
                                                    </View>
                                                    {touched.fullName && errors.fullName && <Text style={styles.errText}>{errors.fullName}</Text>}
                                                </View>

                                                {/* Mobile */}
                                                <View style={styles.fieldGroup}>
                                                    <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Mobile Number</Text>
                                                    <View style={[styles.inputRow, {
                                                        backgroundColor: inputBg,
                                                        borderColor: touched.mobile && errors.mobile ? '#EF4444'
                                                            : bdrClr('mobile', values.mobile.length === 10 && !errors.mobile)
                                                    }]}>
                                                        <TextInput style={[styles.textInput, { color: themeColors.textPrimary }]}
                                                            placeholder="10 digit number" placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                                            keyboardType="phone-pad" maxLength={10}
                                                            onChangeText={handleChange('mobile')} value={values.mobile}
                                                            onFocus={() => setFocusedField('mobile')} onBlur={() => { handleBlur('mobile'); setFocusedField(null); }}
                                                            editable={!loading}
                                                        />
                                                        {values.mobile.length === 10 && !errors.mobile && (
                                                            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                                                        )}
                                                    </View>
                                                    {touched.mobile && errors.mobile && <Text style={styles.errText}>{errors.mobile}</Text>}
                                                </View>

                                                {/* Password */}
                                                <View style={styles.fieldGroup}>
                                                    <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Password</Text>
                                                    <View style={[styles.inputRow, {
                                                        backgroundColor: inputBg,
                                                        borderColor: touched.password && errors.password ? '#EF4444'
                                                            : bdrClr('password', touched.password && !errors.password && values.password.length >= 6)
                                                    }]}>
                                                        <TextInput style={[styles.textInput, { color: themeColors.textPrimary }]}
                                                            placeholder="Min 6 characters" placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                                            secureTextEntry={!showPassword}
                                                            onChangeText={handleChange('password')} value={values.password}
                                                            onFocus={() => setFocusedField('password')} onBlur={() => { handleBlur('password'); setFocusedField(null); }}
                                                            editable={!loading}
                                                        />
                                                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                                            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={isDark ? '#475569' : '#94A3B8'} />
                                                        </TouchableOpacity>
                                                    </View>
                                                    {touched.password && errors.password && <Text style={styles.errText}>{errors.password}</Text>}
                                                    {values.password.length > 0 && (
                                                        <View style={styles.strengthRow}>
                                                            {[6, 8, 10].map((len, i) => (
                                                                <View key={i} style={[styles.strengthBar, { backgroundColor: values.password.length >= len ? '#10B981' : (isDark ? '#334155' : '#E2E8F0') }]} />
                                                            ))}
                                                            <Text style={[styles.strengthLabel, { color: values.password.length >= 6 ? '#10B981' : '#EF4444' }]}>
                                                                {values.password.length < 6 ? 'Weak' : values.password.length < 8 ? 'Fair' : 'Strong'}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>

                                                {/* ── Location ── */}
                                                <Text style={[styles.sectionTitle, { color: themeColors.textPrimary, marginTop: 6 }]}>Your Location</Text>

                                                {/* Village */}
                                                <View style={styles.fieldGroup}>
                                                    <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Village / Area</Text>
                                                    <Dropdown
                                                        style={[styles.dropdown, {
                                                            backgroundColor: inputBg,
                                                            borderColor: values.village ? '#10B981' : (touched.village && errors.village ? '#EF4444' : (isDark ? '#334155' : '#E2E8F0'))
                                                        }]}
                                                        placeholderStyle={[styles.ddPlaceholder, { color: isDark ? '#475569' : '#94A3B8' }]}
                                                        selectedTextStyle={[styles.ddSelected, { color: themeColors.textPrimary }]}
                                                        containerStyle={[styles.ddPopup, { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                                                        itemTextStyle={[styles.ddItemText, { color: themeColors.textPrimary }]}
                                                        itemContainerStyle={styles.ddItemRow}
                                                        activeColor={isDark ? '#334155' : '#EFF6FF'}
                                                        data={villages.map(v => ({ label: v, value: v }))}
                                                        maxHeight={220}
                                                        labelField="label" valueField="value"
                                                        placeholder="Pick your village" value={values.village}
                                                        onChange={(item) => { setFieldValue('village', item.value, true); setFieldValue('subArea', ''); }}
                                                        disable={loading}
                                                        renderRightIcon={() => (
                                                            values.village
                                                                ? <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                                                                : <Ionicons name="chevron-down" size={18} color={isDark ? '#475569' : '#94A3B8'} />
                                                        )}
                                                    />
                                                    {touched.village && errors.village && <Text style={styles.errText}>{errors.village}</Text>}
                                                </View>

                                                {/* Sub-area */}
                                                {values.village === 'Kolamasanapalle' && (
                                                    <View style={styles.fieldGroup}>
                                                        <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Street / Sub-area</Text>
                                                        <Dropdown
                                                            style={[styles.dropdown, {
                                                                backgroundColor: inputBg,
                                                                borderColor: values.subArea ? '#10B981' : (isDark ? '#334155' : '#E2E8F0')
                                                            }]}
                                                            placeholderStyle={[styles.ddPlaceholder, { color: isDark ? '#475569' : '#94A3B8' }]}
                                                            selectedTextStyle={[styles.ddSelected, { color: themeColors.textPrimary }]}
                                                            containerStyle={[styles.ddPopup, { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                                                            itemTextStyle={[styles.ddItemText, { color: themeColors.textPrimary }]}
                                                            itemContainerStyle={styles.ddItemRow}
                                                            activeColor={isDark ? '#334155' : '#EFF6FF'}
                                                            data={KOLA_SUB_AREAS.map(s => ({ label: s, value: s }))}
                                                            maxHeight={200} labelField="label" valueField="value"
                                                            placeholder="Pick your street" value={values.subArea}
                                                            onChange={(item) => { setFieldValue('subArea', item.value, true); }}
                                                            disable={loading}
                                                            renderRightIcon={() => (
                                                                values.subArea
                                                                    ? <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                                                                    : <Ionicons name="chevron-down" size={18} color={isDark ? '#475569' : '#94A3B8'} />
                                                            )}
                                                        />
                                                    </View>
                                                )}

                                                {/* ── Device ── */}
                                                <Text style={[styles.sectionTitle, { color: themeColors.textPrimary, marginTop: 6 }]}>Device Details</Text>

                                                {/* Service Type */}
                                                <View style={styles.fieldGroup}>
                                                    <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Service Type</Text>
                                                    <Dropdown
                                                        style={[styles.dropdown, {
                                                            backgroundColor: inputBg,
                                                            borderColor: values.serviceType ? '#10B981' : (isDark ? '#334155' : '#E2E8F0')
                                                        }]}
                                                        placeholderStyle={[styles.ddPlaceholder, { color: isDark ? '#475569' : '#94A3B8' }]}
                                                        selectedTextStyle={[styles.ddSelected, { color: themeColors.textPrimary }]}
                                                        containerStyle={[styles.ddPopup, { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                                                        itemTextStyle={[styles.ddItemText, { color: themeColors.textPrimary }]}
                                                        itemContainerStyle={styles.ddItemRow}
                                                        activeColor={isDark ? '#334155' : '#EFF6FF'}
                                                        data={SERVICE_PROVIDERS} maxHeight={200}
                                                        labelField="label" valueField="id" placeholder="Pick your service"
                                                        value={values.serviceType}
                                                        onChange={(item) => { setFieldValue('serviceType', item.id, true); setBoxInput(''); setFieldValue('boxNumber', ''); }}
                                                        disable={loading}
                                                        renderRightIcon={() => (
                                                            values.serviceType
                                                                ? <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                                                                : <Ionicons name="chevron-down" size={18} color={isDark ? '#475569' : '#94A3B8'} />
                                                        )}
                                                    />
                                                </View>

                                                {/* Box Number */}
                                                <FadeIn visible={boxVisible}>
                                                    <View style={styles.fieldGroup}>
                                                        <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Box Number (STB)</Text>
                                                        <View style={[styles.inputRow, {
                                                            backgroundColor: inputBg,
                                                            borderColor: touched.boxNumber && errors.boxNumber ? '#EF4444'
                                                                : bdrClr('boxNumber', touched.boxNumber && !errors.boxNumber && values.boxNumber.length > 0)
                                                        }]}>
                                                            <TextInput style={[styles.textInput, { color: themeColors.textPrimary }]}
                                                                placeholder="Enter box number" placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                                                autoCapitalize="characters"
                                                                onChangeText={(t) => setBoxInput(t.replace(/[^a-zA-Z0-9]/g, ''))}
                                                                onFocus={() => setFocusedField('boxNumber')} onBlur={() => { setFieldTouched('boxNumber', true); setFocusedField(null); }}
                                                                value={boxInput} editable={!loading}
                                                            />
                                                            {touched.boxNumber && !errors.boxNumber && values.boxNumber.length > 0 && (
                                                                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                                                            )}
                                                        </View>
                                                        {touched.boxNumber && errors.boxNumber && <Text style={styles.errText}>{errors.boxNumber}</Text>}
                                                        {!errors.boxNumber && values.serviceType && (
                                                            <Text style={[styles.hintText, { color: themeColors.textSubtle }]}>Format: {getBoxHint(values.serviceType)}</Text>
                                                        )}
                                                    </View>
                                                </FadeIn>

                                                {/* Admin notice */}
                                                <View style={[styles.noticeBar, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}>
                                                    <Ionicons name="shield-checkmark" size={16} color="#2563EB" />
                                                    <Text style={[styles.noticeText, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
                                                        Admin will check your details before activating.
                                                    </Text>
                                                </View>

                                                {/* Submit */}
                                                <TouchableOpacity activeOpacity={0.85} onPress={handleSubmit} disabled={loading}>
                                                    <LinearGradient colors={['#2563EB', '#1D4ED8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                                                        {loading ? <ActivityIndicator color="#FFF" /> : (
                                                            <View style={styles.btnInner}>
                                                                <Text style={styles.primaryBtnText}>Submit Registration</Text>
                                                            </View>
                                                        )}
                                                    </LinearGradient>
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    }}
                                </Formik>
                            </View>

                            {/* Login link */}
                            <View style={styles.loginRow}>
                                <Text style={[styles.loginText, { color: themeColors.textSecondary }]}>Already have an account? </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                    <Text style={styles.loginLink}>Sign In</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </KeyboardAvoidingView>

            <SuccessModal visible={showSuccess} onClose={async () => { setShowSuccess(false); try { await signOut(auth); } catch (e) { } navigation.replace('Login'); }} themeColors={themeColors} isDark={isDark} />

            <CustomAlert {...alertState} onDismiss={hideAlert} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    glowCircle: { position: 'absolute', width: 280, height: 280, borderRadius: 140 },
    scroll: { padding: 20, paddingTop: 4, paddingBottom: 40 },
    centerContent: { width: '100%', alignItems: 'center' },

    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 10,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
        elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
    },
    topTitle: { fontSize: 17, fontWeight: '800' },

    // Card
    card: {
        width: '100%', borderRadius: 20, padding: 20, borderWidth: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4,
    },

    // Sections
    sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 16, letterSpacing: -0.2 },

    // Fields
    fieldGroup: { marginBottom: 16 },
    fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginLeft: 2 },
    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        height: 50, borderRadius: 12, paddingHorizontal: 16,
        borderWidth: 1.5,
    },
    textInput: { flex: 1, fontSize: 15, fontWeight: '500' },
    errText: { color: '#EF4444', fontSize: 12, fontWeight: '600', marginTop: 4, marginLeft: 2 },
    hintText: { fontSize: 11, fontWeight: '500', fontStyle: 'italic', marginTop: 4, marginLeft: 2 },

    // Strength
    strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, marginLeft: 2 },
    strengthBar: { width: 28, height: 3, borderRadius: 2 },
    strengthLabel: { fontSize: 11, fontWeight: '800', marginLeft: 6 },

    // Dropdown
    dropdown: {
        height: 50, borderRadius: 12, paddingHorizontal: 16,
        borderWidth: 1.5,
    },
    ddPlaceholder: { fontSize: 15, fontWeight: '500' },
    ddSelected: { fontSize: 15, fontWeight: '600' },
    ddPopup: {
        borderRadius: 14, overflow: 'hidden', elevation: 8,
        marginTop: 4, borderWidth: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16,
    },
    ddItemText: { fontSize: 14, fontWeight: '500' },
    ddItemRow: { borderRadius: 8, marginHorizontal: 6, marginVertical: 1, paddingVertical: 2 },
    ddSearch: { height: 40, borderRadius: 10, fontSize: 14, paddingHorizontal: 12, borderWidth: 1 },

    // Notice
    noticeBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 14, marginTop: 4, marginBottom: 20 },
    noticeText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },

    // Button
    primaryBtn: {
        height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
        shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
    },
    btnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    btnArrow: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },

    loginRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 20 },
    loginText: { fontSize: 14, fontWeight: '500' },
    loginLink: { fontSize: 14, fontWeight: '800', color: '#2563EB' },
});

export default RegistrationScreen;
