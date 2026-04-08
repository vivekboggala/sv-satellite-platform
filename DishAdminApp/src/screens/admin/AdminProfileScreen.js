import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Modal, TextInput, ActivityIndicator } from 'react-native';
import CustomAlert from '../../components/CustomAlert';
import useAlert from '../../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { auth, firestore } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

const AdminProfileScreen = ({ navigation }) => {
    const { themeColors, isDark, toggleTheme } = useTheme();
    const [adminData, setAdminData] = useState(null);
    const [changePasswordVisible, setChangePasswordVisible] = useState(false);
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
    const [updating, setUpdating] = useState(false);
    const { alertState, showAlert, hideAlert } = useAlert();

    useEffect(() => {
        fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const adminDoc = await getDoc(doc(firestore, 'admins', user.uid));
                if (adminDoc.exists()) {
                    setAdminData(adminDoc.data());
                }
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleLogout = () => {
        showAlert({
            title: 'Logout',
            message: 'Are you sure you want to sign out?',
            type: 'confirm',
            buttons: [
                { text: 'Cancel', onPress: hideAlert },
                { text: 'Logout', style: 'destructive', onPress: async () => { hideAlert(); await signOut(auth); } }
            ]
        });
    };


    const handleChangePassword = async () => {
        if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
            showAlert({ title: 'Error', message: 'Please fill all fields', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
            return;
        }

        if (passwordData.new !== passwordData.confirm) {
            showAlert({ title: 'Error', message: 'New passwords do not match', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
            return;
        }

        if (passwordData.new.length < 6) {
            showAlert({ title: 'Error', message: 'Password must be at least 6 characters', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
            return;
        }

        setUpdating(true);
        try {
            const user = auth.currentUser;
            const credential = EmailAuthProvider.credential(user.email, passwordData.current);

            // Re-authenticate user
            await reauthenticateWithCredential(user, credential);

            // Update password
            await updatePassword(user, passwordData.new);

            showAlert({ title: 'Success', message: 'Password updated successfully', type: 'success', buttons: [{ text: 'OK', onPress: hideAlert }] });
            setChangePasswordVisible(false);
            setPasswordData({ current: '', new: '', confirm: '' });
        } catch (error) {
            console.error('Password Update Error:', error);
            if (error.code === 'auth/wrong-password') {
                showAlert({ title: 'Error', message: 'Current password is incorrect', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
            } else {
                showAlert({ title: 'Error', message: error.message, type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
            }
        } finally {
            setUpdating(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <View style={[styles.header, { backgroundColor: themeColors.background, borderBottomColor: themeColors.borderLight }]}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu" size={26} color={themeColors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Admin Profile</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.profileCard, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                    <View style={[styles.avatarContainer, { backgroundColor: themeColors.primary + '15' }]}>
                        <Text style={[styles.avatarText, { color: themeColors.primary }]}>
                            {adminData?.name?.charAt(0)?.toUpperCase() || 'A'}
                        </Text>
                    </View>
                    <Text style={[styles.adminName, { color: themeColors.textPrimary }]}>
                        {adminData?.name || 'Administrator'}
                    </Text>
                    <Text style={[styles.adminMobile, { color: themeColors.textSecondary }]}>
                        {adminData?.mobile || 'N/A'}
                    </Text>
                    <Text style={[styles.adminRole, { color: themeColors.primary }]}>
                        {adminData?.role?.toUpperCase() || 'ADMIN'}
                    </Text>
                </View>

                {/* Theme Toggle */}
                <TouchableOpacity
                    style={[styles.menuItem, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}
                    activeOpacity={1}
                >
                    <Ionicons name="moon-outline" size={22} color={themeColors.primary} />
                    <Text style={[styles.menuTitle, { color: themeColors.textPrimary }]}>Dark Mode</Text>
                    <Switch
                        value={isDark}
                        onValueChange={toggleTheme}
                        trackColor={{ false: themeColors.borderLight, true: themeColors.primary }}
                    />
                </TouchableOpacity>

                {/* Change Password */}
                <TouchableOpacity
                    style={[styles.menuItem, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}
                    onPress={() => setChangePasswordVisible(true)}
                >
                    <Ionicons name="lock-closed-outline" size={22} color={themeColors.primary} />
                    <Text style={[styles.menuTitle, { color: themeColors.textPrimary }]}>Change Password</Text>
                    <Ionicons name="chevron-forward" size={18} color={themeColors.textSubtle} />
                </TouchableOpacity>


                <TouchableOpacity
                    style={[styles.logoutButton, { backgroundColor: themeColors.error + '15', borderColor: themeColors.error }]}
                    onPress={handleLogout}
                >
                    <Ionicons name="log-out-outline" size={22} color={themeColors.error} />
                    <Text style={[styles.logoutText, { color: themeColors.error }]}>Logout</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Change Password Modal */}
            <Modal
                visible={changePasswordVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setChangePasswordVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Change Password</Text>
                            <TouchableOpacity onPress={() => setChangePasswordVisible(false)}>
                                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Current Password</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.textPrimary, borderColor: themeColors.borderLight }]}
                                    secureTextEntry
                                    value={passwordData.current}
                                    onChangeText={(text) => setPasswordData({ ...passwordData, current: text })}
                                    placeholder="Enter current password"
                                    placeholderTextColor={themeColors.textSubtle}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>New Password</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.textPrimary, borderColor: themeColors.borderLight }]}
                                    secureTextEntry
                                    value={passwordData.new}
                                    onChangeText={(text) => setPasswordData({ ...passwordData, new: text })}
                                    placeholder="At least 6 characters"
                                    placeholderTextColor={themeColors.textSubtle}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Confirm New Password</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.textPrimary, borderColor: themeColors.borderLight }]}
                                    secureTextEntry
                                    value={passwordData.confirm}
                                    onChangeText={(text) => setPasswordData({ ...passwordData, confirm: text })}
                                    placeholder="Repeat new password"
                                    placeholderTextColor={themeColors.textSubtle}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: themeColors.primary }]}
                                onPress={handleChangePassword}
                                disabled={updating}
                            >
                                {updating ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Update Password</Text>
                                )}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    menuButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    content: { padding: 20 },
    profileCard: {
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarText: { fontSize: 32, fontWeight: '700' },
    adminName: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
    adminMobile: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
    adminRole: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
        gap: 12,
    },
    menuTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    logoutText: { fontSize: 16, fontWeight: '700' },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    modalBody: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    input: {
        height: 52,
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    saveButton: {
        height: 54,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 12,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default AdminProfileScreen;