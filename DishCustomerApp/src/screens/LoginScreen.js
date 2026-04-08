import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, KeyboardAvoidingView, Platform,
    ActivityIndicator, Modal, StatusBar, Dimensions
} from 'react-native';
import CustomAlert from '../components/CustomAlert';
import useAlert from '../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, firestore } from '../services/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { setOneSignalTags, setOneSignalExternalId } from '../services/onesignal';
import { useTheme } from '../context/ThemeContext';

const LoginSchema = Yup.object().shape({
    mobile: Yup.string()
        .matches(/^\d{10}$/, 'Enter a valid 10 digit number')
        .required('Mobile number is needed'),
    password: Yup.string()
        .min(6, 'At least 6 characters')
        .required('Password is needed'),
});

const LoginScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const { alertState, showAlert, hideAlert } = useAlert();

    const [forgotVisible, setForgotVisible] = useState(false);
    const [resetMobile, setResetMobile] = useState('');
    const [resetBoxId, setResetBoxId] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    const handleLogin = async (values) => {
        setLoading(true);
        try {
            const email = `${values.mobile}@dish.com`;
            const cred = await signInWithEmailAndPassword(auth, email, values.password);
            const user = cred.user;

            const userDoc = await getDoc(doc(firestore, 'users', user.uid));
            if (!userDoc.exists()) {
                await auth.signOut();
                showAlert({ title: 'Error', message: 'Account not found. Please contact support.', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
                setLoading(false);
                return;
            }

            const userData = userDoc.data();
            if (userData.status === 'pending' || userData.is_approved === false) {
                await auth.signOut();
                showAlert({ title: 'Account Pending', message: 'Your account is being checked by admin. You can log in after approval.', type: 'info', buttons: [{ text: 'OK', onPress: hideAlert }] });
                setLoading(false);
                return;
            }

            // Auth state change in App.js will automatically switch to AppNavigator
            try {
                setOneSignalExternalId(user.uid);
                if (userData.village && userData.service_type) {
                    setOneSignalTags({ village: userData.village, service_type: userData.service_type, status: userData.status });
                }
            } catch (e) { console.log('OneSignal:', e.message); }
        } catch (error) {
            console.error(error);
            showAlert({ title: 'Login Failed', message: 'Wrong mobile number or password. Please try again.', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!resetMobile || !resetBoxId) {
            showAlert({ title: 'Missing Info', message: 'Please fill both fields.', type: 'warning', buttons: [{ text: 'OK', onPress: hideAlert }] });
            return;
        }
        setResetLoading(true);
        try {
            await addDoc(collection(firestore, 'password_reset_requests'), {
                mobile: resetMobile, box_id: resetBoxId, status: 'pending', created_at: serverTimestamp(),
            });
            showAlert({ title: 'Request Sent', message: 'Admin will check and reset your password soon.', type: 'success', buttons: [{ text: 'OK', onPress: () => { hideAlert(); setForgotVisible(false); setResetMobile(''); setResetBoxId(''); } }] });
        } catch (error) {
            showAlert({ title: 'Error', message: 'Could not send request. Try again later.', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
        } finally { setResetLoading(false); }
    };

    // ── helpers ──
    const inputBg = isDark ? '#1E293B' : '#F1F5F9';
    const getBorderColor = (name, valid) => {
        if (focusedField === name) return '#2563EB';
        if (valid) return '#10B981';
        return isDark ? '#334155' : '#E2E8F0';
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={isDark ? ['#020617', '#0F172A', '#1E293B'] : ['#F8FAFC', '#EDF2F7', '#E2E8F0']} style={StyleSheet.absoluteFillObject} />
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

            <View style={[styles.glowCircle, { top: -60, right: -60, backgroundColor: '#3B82F6', opacity: isDark ? 0.12 : 0.08 }]} />
            <View style={[styles.glowCircle, { bottom: -100, left: -80, backgroundColor: '#7C3AED', opacity: isDark ? 0.08 : 0.04 }]} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
                    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <View style={styles.centerContent}>
                            <View style={styles.header}>
                                {/* Removed logoBox as per user request */}
                                <Text style={[styles.brand, { color: themeColors.textPrimary }]}>SV Satellite</Text>
                                <Text style={[styles.tagline, { color: themeColors.textSecondary }]}>Sign in to continue</Text>
                            </View>

                            {/* Form Card */}
                            <View style={[styles.card, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                                <Formik initialValues={{ mobile: '', password: '' }} validationSchema={LoginSchema} onSubmit={handleLogin}>
                                    {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => {
                                        const mobileValid = values.mobile.length === 10 && !errors.mobile;
                                        return (
                                            <>
                                                {/* Mobile */}
                                                <View style={styles.fieldGroup}>
                                                    <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Mobile Number</Text>
                                                    <View style={[styles.inputRow, {
                                                        backgroundColor: inputBg,
                                                        borderColor: touched.mobile && errors.mobile ? '#EF4444' : 'transparent', // Remove border unless error
                                                        borderWidth: 0 // Explicitly remove border width
                                                    }]}>
                                                        <TextInput style={[styles.textInput, { color: themeColors.textPrimary }]}
                                                            placeholder="Enter 10 digit number" placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                                            keyboardType="phone-pad" maxLength={10}
                                                            underlineColorAndroid="transparent"
                                                            onChangeText={handleChange('mobile')}
                                                            onFocus={() => setFocusedField('mobile')} onBlur={() => { handleBlur('mobile'); setFocusedField(null); }}
                                                            value={values.mobile}
                                                        />
                                                        {mobileValid && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
                                                    </View>
                                                    {touched.mobile && errors.mobile && <Text style={styles.errText}>{errors.mobile}</Text>}
                                                </View>

                                                {/* Password */}
                                                <View style={styles.fieldGroup}>
                                                    <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Password</Text>
                                                    <View style={[styles.inputRow, {
                                                        backgroundColor: inputBg,
                                                        borderColor: touched.password && errors.password ? '#EF4444' : 'transparent', // Remove border unless error
                                                        borderWidth: 0 // Explicitly remove border width
                                                    }]}>
                                                        <TextInput style={[styles.textInput, { color: themeColors.textPrimary }]}
                                                            placeholder="Enter your password" placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                                            secureTextEntry={!showPassword}
                                                            underlineColorAndroid="transparent"
                                                            onChangeText={handleChange('password')}
                                                            onFocus={() => setFocusedField('password')} onBlur={() => { handleBlur('password'); setFocusedField(null); }}
                                                            value={values.password}
                                                        />
                                                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                                            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={isDark ? '#475569' : '#94A3B8'} />
                                                        </TouchableOpacity>
                                                    </View>
                                                    {touched.password && errors.password && <Text style={styles.errText}>{errors.password}</Text>}
                                                </View>

                                                <TouchableOpacity onPress={() => setForgotVisible(true)} style={styles.forgotBtn}>
                                                    <Text style={styles.forgotText}>Forgot Password?</Text>
                                                </TouchableOpacity>

                                                {/* Sign In */}
                                                <TouchableOpacity activeOpacity={0.85} onPress={handleSubmit} disabled={loading}>
                                                    <LinearGradient colors={['#2563EB', '#1D4ED8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                                                        {loading ? <ActivityIndicator color="#FFF" /> : (
                                                            <View style={styles.btnInner}>
                                                                <Text style={styles.primaryBtnText}>Sign In</Text>
                                                            </View>
                                                        )}
                                                    </LinearGradient>
                                                </TouchableOpacity>
                                            </>
                                        );
                                    }}
                                </Formik>
                            </View>

                            {/* Register */}
                            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: isDark ? '#334155' : '#E2E8F0' }]} onPress={() => navigation.navigate('Register')}>
                                <Text style={styles.secondaryBtnText}>Create New Account</Text>
                            </TouchableOpacity>

                            <View style={[styles.infoChip, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}>
                                <Ionicons name="shield-checkmark" size={14} color="#2563EB" />
                                <Text style={[styles.infoChipText, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>New accounts need admin approval</Text>
                            </View>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </KeyboardAvoidingView>

            {/* Forgot Password Modal */}
            <Modal visible={forgotVisible} transparent animationType="slide" onRequestClose={() => setForgotVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
                        <View style={[styles.modalHandle, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
                        <View style={styles.modalTop}>
                            <View>
                                <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Reset Password</Text>
                                <Text style={[styles.modalSub, { color: themeColors.textSecondary }]}>Admin will reset it for you</Text>
                            </View>
                            <TouchableOpacity onPress={() => setForgotVisible(false)} style={[styles.closeBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                                <Ionicons name="close" size={18} color={themeColors.textSubtle} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.fieldLabel, { color: themeColors.textSecondary, marginTop: 20 }]}>Mobile Number</Text>
                        <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                            <TextInput style={[styles.textInput, { color: themeColors.textPrimary }]}
                                placeholder="10 digit number" placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                keyboardType="phone-pad" maxLength={10} value={resetMobile} onChangeText={setResetMobile} />
                        </View>

                        <Text style={[styles.fieldLabel, { color: themeColors.textSecondary, marginTop: 16 }]}>Box Number</Text>
                        <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                            <TextInput style={[styles.textInput, { color: themeColors.textPrimary }]}
                                placeholder="Written on your Set-Top Box" placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                value={resetBoxId} onChangeText={setResetBoxId} />
                        </View>

                        <TouchableOpacity activeOpacity={0.85} onPress={handleForgotPassword} disabled={resetLoading} style={{ marginTop: 24 }}>
                            <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.primaryBtn}>
                                {resetLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Send Request</Text>}
                            </LinearGradient>
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
    glowCircle: { position: 'absolute', width: 280, height: 280, borderRadius: 140 },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    centerContent: { width: '100%', alignItems: 'center' },

    header: { alignItems: 'center', marginBottom: 32 },
    logoBox: {
        width: 60, height: 60, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
        shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 10,
    },
    brand: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 },
    tagline: { fontSize: 15, fontWeight: '500' },

    // Card
    card: {
        width: '100%', borderRadius: 20, padding: 24, borderWidth: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4,
    },

    // Fields
    fieldGroup: { marginBottom: 20 },
    fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginLeft: 2 },
    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        height: 50, borderRadius: 12, paddingHorizontal: 16,
        borderWidth: 0, // Removed border width default
    },
    textInput: { flex: 1, fontSize: 15, fontWeight: '500' },
    errText: { color: '#EF4444', fontSize: 12, fontWeight: '600', marginTop: 4, marginLeft: 2 },

    forgotBtn: { alignSelf: 'flex-end', marginBottom: 24, marginTop: -4 },
    forgotText: { color: '#2563EB', fontSize: 13, fontWeight: '700' },

    primaryBtn: {
        height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
        shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
    },
    btnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    btnArrow: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },

    secondaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        height: 50, borderRadius: 14, borderWidth: 1.5, width: '100%', marginTop: 20,
    },
    secondaryBtnText: { color: '#2563EB', fontSize: 15, fontWeight: '700' },

    infoChip: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginTop: 20,
    },
    infoChipText: { fontSize: 12, fontWeight: '600' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
    modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    modalTitle: { fontSize: 20, fontWeight: '900' },
    modalSub: { fontSize: 13, fontWeight: '500', marginTop: 2 },
    closeBtn: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});

export default LoginScreen;
