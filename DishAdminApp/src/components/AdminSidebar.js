import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import CustomAlert from './CustomAlert';
import useAlert from '../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth, firestore } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { colors, spacing, typography, borderRadius } from '../theme';
import { useTheme } from '../context/ThemeContext';

const AdminSidebar = (props) => {
    const { themeColors, isDark } = useTheme();
    const [adminName, setAdminName] = useState('Bhaskar Reddy');
    const [adminRole, setAdminRole] = useState('Administrator');
    const { alertState, showAlert, hideAlert } = useAlert();

    useEffect(() => {
        fetchAdminProfile();
    }, []);

    const fetchAdminProfile = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            const adminDoc = await getDoc(doc(firestore, "admins", user.uid));
            if (adminDoc.exists()) {
                const data = adminDoc.data();
                setAdminName(data.name || 'Admin');
                setAdminRole(data.role || 'Administrator');
            }
        } catch (e) {
            console.log("Admin sidebar fetch error:", e);
        }
    };

    const handleLogout = () => {
        showAlert({
            title: "Logout",
            message: "Are you sure you want to exit?",
            type: "confirm",
            buttons: [
                { text: "Cancel", onPress: hideAlert },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        hideAlert();
                        try {
                            await auth.signOut();
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }
            ]
        });
    };

    const NavItem = ({ icon, label, target }) => {
        const isActive = props.state.routes[props.state.index].name === target;
        return (
            <TouchableOpacity
                style={styles.navItem}
                onPress={() => props.navigation.navigate(target)}
                activeOpacity={0.7}
            >
                <View style={styles.navIconBox}>
                    <Ionicons
                        name={icon}
                        size={20}
                        color={isActive ? themeColors.primary : themeColors.textSecondary}
                    />
                </View>
                <Text style={[
                    styles.navText,
                    { color: isActive ? themeColors.primary : themeColors.textSecondary },
                    isActive && styles.activeNavText
                ]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: themeColors.card }]}>
            <SafeAreaView edges={['top']} style={[styles.header, { borderBottomColor: themeColors.borderLight }]}>
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatar, { backgroundColor: themeColors.primary + '15' }]}>
                            <Ionicons name="person" size={28} color={themeColors.primary} />
                        </View>
                        <View style={[styles.onlineStatus, { borderColor: themeColors.card }]} />
                    </View>
                    <View style={styles.adminInfo}>
                        <Text style={[styles.welcomeBack, { color: themeColors.textSubtle }]}>Welcome Back,</Text>
                        <Text style={[styles.adminName, { color: themeColors.textPrimary }]} numberOfLines={1}>{adminName}</Text>
                        <Text style={[styles.roleLabel, { color: themeColors.primary }]}>{adminRole}</Text>
                    </View>
                </View>
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.scrollArea} showsVerticalScrollIndicator={false}>
                <NavItem icon="grid-outline" label="Dashboard" target="Dashboard" />
                <NavItem icon="card-outline" label="Pending Payments" target="PendingPayments" />
                <NavItem icon="people-outline" label="Customers" target="Customers" />
                <NavItem icon="person-add-outline" label="New Registrations" target="NewRegistrations" />
                <NavItem icon="hardware-chip-outline" label="Box Changes" target="BoxRequests" />
                <NavItem icon="key-outline" label="Password Resets" target="PasswordResets" />
                <NavItem icon="chatbubbles-outline" label="Support Tickets" target="SupportTickets" />
                <NavItem icon="receipt-outline" label="Transaction Ledger" target="TransactionLedger" />
                <NavItem icon="bar-chart-outline" label="Reports And Analytics" target="Reports" />
                <NavItem icon="download-outline" label="Export Data" target="ExportData" />
                <NavItem icon="wallet-outline" label="Payment Settings" target="PaymentSettings" />
                <NavItem icon="person-circle-outline" label="Admin Profile" target="AdminProfile" />
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: themeColors.borderLight }]}>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color={themeColors.error} />
                    <Text style={[styles.logoutText, { color: themeColors.error }]}>Logout</Text>
                </TouchableOpacity>
            </View>
            <CustomAlert {...alertState} onDismiss={hideAlert} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        padding: 15,
        borderBottomWidth: 1,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    onlineStatus: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: colors.success,
        borderWidth: 2,
        borderColor: colors.white,
    },
    adminInfo: {
        flex: 1,
    },
    welcomeBack: {
        fontSize: typography.sizes.tiny,
        color: colors.textSubtle,
        fontWeight: typography.weights.semibold,
    },
    adminName: {
        fontSize: typography.sizes.body,
        fontWeight: typography.weights.black,
        color: colors.textPrimary,
    },
    roleLabel: {
        fontSize: 10,
        color: colors.primary,
        fontWeight: typography.weights.bold,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    scrollArea: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        gap: 2,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.medium,
        gap: spacing.md,
    },
    activeNavItem: {
        backgroundColor: colors.primary + '08',
    },
    navIconBox: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.small,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeIconBox: {
        backgroundColor: colors.primary + '10',
    },
    navText: {
        fontSize: typography.sizes.body,
        fontWeight: typography.weights.semibold,
        color: colors.textSecondary,
    },
    activeNavText: {
        color: colors.primary,
        fontWeight: typography.weights.bold,
    },
    footer: {
        padding: spacing.xl,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
    },
    logoutText: {
        fontSize: typography.sizes.body,
        fontWeight: typography.weights.bold,
        color: colors.error,
    },
});

export default AdminSidebar;
