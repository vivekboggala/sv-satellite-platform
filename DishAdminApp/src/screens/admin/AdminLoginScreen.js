import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, KeyboardAvoidingView, Platform,
    ActivityIndicator, Modal, StatusBar
} from 'react-native';
import CustomAlert from '../../components/CustomAlert';
import useAlert from '../../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, firestore } from '../../services/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { setOneSignalExternalId, setOneSignalTags } from '../../services/onesignal';

const AdminLoginSchema = Yup.object().shape({
    mobileNumber: Yup.string()
        .matches(/^\d{10}$/, 'Mobile number must be 10 digits')
        .required('Mobile number is required'),
    password: Yup.string()
        .min(6, 'Password must be at least 6 characters')
        .required('Password is required'),
});

const AdminLoginScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const { alertState, showAlert, hideAlert } = useAlert();

    const handleAdminLogin = async (values) => {
        setLoading(true);
        try {
            const email = `${values.mobileNumber}@dish.com`;
            const userCredential = await signInWithEmailAndPassword(auth, email, values.password);
            const user = userCredential.user;

            const adminDoc = await getDoc(doc(firestore, 'admins', user.uid));
            if (adminDoc.exists()) {
                const adminData = adminDoc.data();
                if (adminData.role === 'admin' || adminData.role === 'owner') {
                    // Success!
                    try {
                        setOneSignalExternalId(user.uid);
                        setOneSignalTags({
                            user_type: 'admin',
                            role: adminData.role,
                            user_id: user.uid
                        });
                    } catch (e) {
                        console.log('OneSignal Admin registration error:', e);
                    }
                } else {
                    showAlert({ title: 'Access Denied', message: 'You do not have admin access.', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
                    await auth.signOut();
                }
            } else {
                showAlert({ title: 'Access Denied', message: 'Admin profile not found.', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
                await auth.signOut();
            }
        } catch (error) {
            console.error('Admin Login Error:', error);
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                showAlert({ title: 'Login Failed', message: 'Incorrect mobile number or password.', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
            } else {
                showAlert({ title: 'Login Failed', message: 'Something went wrong. Please try again.', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Premium Gradient Background */}
            <LinearGradient
                colors={isDark ? ['#020617', '#0F172A', '#1E293B'] : ['#F8FAFC', '#E2E8F0', '#CBD5E1']}
                style={StyleSheet.absoluteFillObject}
            />
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Subtle Glow Effects */}
            <View style={[styles.glowCircle, { top: -50, right: -50, backgroundColor: '#3B82F6', opacity: isDark ? 0.15 : 0.1 }]} />
            <View style={[styles.glowCircle, { bottom: -100, left: -100, backgroundColor: '#2563EB', opacity: isDark ? 0.1 : 0.05 }]} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <SafeAreaView style={{ flex: 1 }}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.content}>
                            {/* Polished Header */}
                            <View style={styles.headerContainer}>
                                {/* logoIcon removed for appropriateness */}
                                <Text style={[styles.title, { color: themeColors.textPrimary }]}>Welcome back</Text>
                                <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                                    Login to your admin dashboard
                                </Text>
                            </View>

                            {/* Elevated Login Card */}
                            <View style={[
                                styles.loginCard,
                                {
                                    backgroundColor: themeColors.card,
                                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                                }
                            ]}>
                                <Formik
                                    initialValues={{ mobileNumber: '', password: '' }}
                                    validationSchema={AdminLoginSchema}
                                    onSubmit={handleAdminLogin}
                                >
                                    {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                                        <View style={styles.form}>
                                            <View style={styles.inputWrapper}>
                                                <Text style={[styles.inputLabel, { color: themeColors.textPrimary }]}>Mobile Number</Text>
                                                <View style={[
                                                    styles.inputContainer,
                                                    {
                                                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                                        borderColor: focusedField === 'mobile' ? '#2563EB' : 'transparent',
                                                        borderWidth: 0
                                                    },
                                                    touched.mobileNumber && errors.mobileNumber && styles.inputError
                                                ]}>
                                                    <Ionicons
                                                        name="call-outline"
                                                        size={20}
                                                        color={focusedField === 'mobile' ? '#2563EB' : themeColors.textSubtle}
                                                    />
                                                    <TextInput
                                                        style={[styles.textInput, { color: themeColors.textPrimary }]}
                                                        placeholder="10-digit number"
                                                        placeholderTextColor={themeColors.textSubtle}
                                                        keyboardType="phone-pad"
                                                        maxLength={10}
                                                        underlineColorAndroid="transparent"
                                                        onChangeText={handleChange('mobileNumber')}
                                                        onFocus={() => setFocusedField('mobile')}
                                                        onBlur={() => {
                                                            handleBlur('mobileNumber');
                                                            setFocusedField(null);
                                                        }}
                                                        value={values.mobileNumber}
                                                    />
                                                </View>
                                                {touched.mobileNumber && errors.mobileNumber && (
                                                    <Text style={styles.errorText}>{errors.mobileNumber}</Text>
                                                )}
                                            </View>

                                            <View style={styles.inputWrapper}>
                                                <Text style={[styles.inputLabel, { color: themeColors.textPrimary }]}>Password</Text>
                                                <View style={[
                                                    styles.inputContainer,
                                                    {
                                                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                                        borderColor: focusedField === 'password' ? '#2563EB' : 'transparent',
                                                        borderWidth: 0
                                                    },
                                                    touched.password && errors.password && styles.inputError
                                                ]}>
                                                    <Ionicons
                                                        name="lock-closed-outline"
                                                        size={20}
                                                        color={focusedField === 'password' ? '#2563EB' : themeColors.textSubtle}
                                                    />
                                                    <TextInput
                                                        style={[styles.textInput, { color: themeColors.textPrimary }]}
                                                        placeholder="Your password"
                                                        placeholderTextColor={themeColors.textSubtle}
                                                        secureTextEntry={!showPassword}
                                                        underlineColorAndroid="transparent"
                                                        onChangeText={handleChange('password')}
                                                        onFocus={() => setFocusedField('password')}
                                                        onBlur={() => {
                                                            handleBlur('password');
                                                            setFocusedField(null);
                                                        }}
                                                        value={values.password}
                                                    />
                                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                                        <Ionicons
                                                            name={showPassword ? 'eye-off' : 'eye'}
                                                            size={20}
                                                            color={themeColors.textSubtle}
                                                        />
                                                    </TouchableOpacity>
                                                </View>
                                                {touched.password && errors.password && (
                                                    <Text style={styles.errorText}>{errors.password}</Text>
                                                )}
                                            </View>

                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                style={styles.loginButton}
                                                onPress={handleSubmit}
                                                disabled={loading}
                                            >
                                                <LinearGradient
                                                    colors={['#2563EB', '#1D4ED8']}
                                                    style={styles.loginGradient}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                >
                                                    {loading ? (
                                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                                    ) : (
                                                        <>
                                                            <Text style={styles.loginButtonText}>Login</Text>
                                                        </>
                                                    )}
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </Formik>
                            </View>

                            {/* Secure Footer */}
                            <View style={styles.footer}>
                                <Ionicons name="lock-closed" size={12} color={themeColors.textSubtle} />
                                <Text style={[styles.footerText, { color: themeColors.textSubtle }]}>
                                    Authorized Access Only
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </KeyboardAvoidingView>
            <CustomAlert {...alertState} onDismiss={hideAlert} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    glowCircle: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    content: {
        width: '100%',
        alignItems: 'center',
    },
    headerContainer: {
        marginBottom: 40,
        alignItems: 'center',
    },
    logoIcon: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    title: {
        fontSize: 30,
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '500',
        opacity: 0.8,
    },
    loginCard: {
        width: '100%',
        borderRadius: 30,
        padding: 28,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    form: {
        width: '100%',
    },
    inputWrapper: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 10,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 60,
        borderRadius: 16,
        paddingHorizontal: 16,
        borderWidth: 0,
    },
    inputError: {
        borderColor: '#EF4444',
    },
    textInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        fontWeight: '600',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 6,
        marginLeft: 8,
    },
    loginButton: {
        marginTop: 8,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    loginGradient: {
        height: 60,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 48,
        gap: 6,
        opacity: 0.7,
    },
    footerText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
});

export default AdminLoginScreen;