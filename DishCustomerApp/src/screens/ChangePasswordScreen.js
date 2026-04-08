import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import CustomAlert from '../components/CustomAlert';
import useAlert from '../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { auth } from '../services/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

const { width } = Dimensions.get('window');

const ChangePasswordScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const { alertState, showAlert, hideAlert } = useAlert();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            showAlert({ title: 'Incomplete Form', message: 'Please fill in all fields to proceed.', type: 'warning', buttons: [{ text: 'OK', onPress: hideAlert }] });
            return;
        }

        if (newPassword.length < 6) {
            showAlert({ title: 'Weak Password', message: 'New password must be at least 6 characters.', type: 'warning', buttons: [{ text: 'OK', onPress: hideAlert }] });
            return;
        }

        if (newPassword !== confirmPassword) {
            showAlert({ title: 'Mismatch', message: 'New passwords do not match.', type: 'warning', buttons: [{ text: 'OK', onPress: hideAlert }] });
            return;
        }

        setLoading(true);
        try {
            const user = auth.currentUser;
            const credential = EmailAuthProvider.credential(user.email, currentPassword);

            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);

            showAlert({
                title: 'Success',
                message: 'Security key updated successfully.',
                type: 'success',
                buttons: [
                    { text: 'Great', onPress: () => { hideAlert(); navigation.goBack(); } }
                ]
            });
        } catch (error) {
            let errorMessage = 'Security update failed. Please try again.';
            if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect current password.';
            }
            showAlert({ title: 'Error', message: errorMessage, type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
        } finally {
            setLoading(false);
        }
    };

    const PasswordInput = ({ label, value, onChange, show, setShow, placeholder, icon }) => (
        <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.textSubtle }]}>{label}</Text>
            <View style={[styles.inputWrapper, {
                backgroundColor: themeColors.card,
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
            }]}>
                <Feather name={icon} size={18} color={themeColors.primary} />
                <TextInput
                    style={[styles.input, { color: themeColors.textPrimary }]}
                    value={value}
                    onChangeText={onChange}
                    secureTextEntry={!show}
                    placeholder={placeholder}
                    placeholderTextColor={themeColors.textSubtle}
                />
                <TouchableOpacity onPress={() => setShow(!show)} style={styles.eyeBtn}>
                    <Ionicons name={show ? "eye-off" : "eye"} size={20} color={themeColors.textSubtle} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            {/* UNIFIED MESH BACKGROUND - FIXED */}
            <View style={styles.meshContainer}>
                <LinearGradient
                    colors={isDark ? ['#1E293B', '#0F172A'] : ['#F8FAFC', '#E2E8F0']}
                    style={StyleSheet.absoluteFill}
                />
                <View style={[styles.meshSpot1, { backgroundColor: themeColors.primary + (isDark ? '25' : '35') }]} />
                <View style={[styles.meshSpot2, { backgroundColor: '#8B5CF6' + (isDark ? '20' : '30') }]} />
            </View>

            <SafeAreaView edges={['top']} style={[styles.topNav, { backgroundColor: isDark ? themeColors.background : '#FFF' }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.headerBtn, { backgroundColor: isDark ? '#FFF1' : '#F1F5F9' }]}>
                        <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.pageTitle, { color: themeColors.textPrimary }]}>Security</Text>
                    <View style={{ width: 44 }} />
                </View>
            </SafeAreaView>
            <View style={[styles.headerShadow, { backgroundColor: isDark ? '#0002' : '#00000005' }]} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>

                <View style={styles.content}>
                    <View style={styles.headerSection}>
                        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Manage Security Key</Text>
                        <Text style={[styles.sectionDesc, { color: themeColors.textSubtle }]}>A strong password ensures your data remains private and secure.</Text>
                    </View>

                    <View style={[styles.securityCard, { backgroundColor: themeColors.card }]}>
                        <PasswordInput
                            label="CURRENT PASSWORD"
                            icon="lock"
                            value={currentPassword}
                            onChange={setCurrentPassword}
                            show={showCurrent}
                            setShow={setShowCurrent}
                            placeholder="Enter current password"
                        />

                        <View style={styles.divider} />

                        <PasswordInput
                            label="NEW PASSWORD"
                            icon="shield"
                            value={newPassword}
                            onChange={setNewPassword}
                            show={showNew}
                            setShow={setShowNew}
                            placeholder="Minimum 6 characters"
                        />

                        <PasswordInput
                            label="CONFIRM PASSWORD"
                            icon="check-circle"
                            value={confirmPassword}
                            onChange={setConfirmPassword}
                            show={showConfirm}
                            setShow={setShowConfirm}
                            placeholder="Retype new password"
                        />

                        <TouchableOpacity
                            style={[styles.submitBtn, { backgroundColor: themeColors.primary }]}
                            onPress={handleChangePassword}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <View style={styles.btnContent}>
                                    <Feather name="save" size={18} color="#FFF" />
                                    <Text style={styles.submitText}>UPDATE PASSWORD</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.securityNotice, { backgroundColor: isDark ? '#FFF1' : '#F1F5F9' }]}>
                        <MaterialIcons name="verified-user" size={32} color={themeColors.primary + '80'} />
                        <Text style={[styles.noticeText, { color: themeColors.textSubtle }]}>
                            For your protection, password changes require re-authentication. Your session will remain active after the update.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <CustomAlert {...alertState} onDismiss={hideAlert} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    meshContainer: { ...StyleSheet.absoluteFillObject, height: 400, overflow: 'hidden' },
    meshSpot1: { position: 'absolute', top: -100, left: -50, width: 300, height: 300, borderRadius: 150 },
    meshSpot2: { position: 'absolute', top: 50, right: -100, width: 350, height: 350, borderRadius: 175 },

    scrollContainer: { paddingBottom: 60 },
    topNav: { zIndex: 100 },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 60,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pageTitle: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    headerShadow: { height: 1, width: '100%', zIndex: 100 },

    content: { padding: 24 },
    headerSection: { marginBottom: 24 },
    sectionTitle: { fontSize: 22, fontWeight: '900', marginBottom: 6 },
    sectionDesc: { fontSize: 13, fontWeight: '600', lineHeight: 20 },

    securityCard: {
        borderRadius: 32,
        padding: 24,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        paddingHorizontal: 16,
        height: 56,
        gap: 12,
        borderWidth: 1.5,
    },
    input: { flex: 1, fontSize: 15, fontWeight: '700' },
    eyeBtn: { padding: 8 },

    divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 20 },

    submitBtn: {
        height: 60,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    submitText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },

    securityNotice: { marginTop: 32, padding: 24, borderRadius: 28, alignItems: 'center', gap: 16 },
    noticeText: { textAlign: 'center', fontSize: 12, fontWeight: '600', lineHeight: 18, opacity: 0.8 }
});

export default ChangePasswordScreen;
