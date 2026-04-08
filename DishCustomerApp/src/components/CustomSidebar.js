import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { auth, firestore } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { calculateDaysRemaining } from '../utils/bcnCalculator';
import { checkPendingPayment } from '../utils/paymentUtils';
import CustomAlert from '../components/CustomAlert';
import useAlert from '../hooks/useAlert';

const CustomSidebar = ({ navigation, state }) => {
    const { themeColors, isDark } = useTheme();
    const { t } = useLanguage();
    const [userData, setUserData] = useState(null);
    const { alertState, showAlert, hideAlert } = useAlert();

    const activeRoute = state?.routeNames[state.index] || 'Home';

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const userDoc = await getDoc(doc(firestore, 'users', user.uid));
                if (userDoc.exists()) {
                    setUserData(userDoc.data());
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    const handleLogout = () => {
        showAlert({
            title: t('sign_out'),
            message: t('sign_out_confirm'),
            type: 'destructive',
            buttons: [
                { text: t('cancel'), onPress: hideAlert },
                {
                    text: t('sign_out'),
                    style: 'destructive',
                    onPress: async () => {
                        hideAlert();
                        try {
                            await signOut(auth);
                        } catch (error) {
                            console.error('Logout error:', error);
                        }
                    }
                }
            ]
        });
    };

    const MenuItem = ({ icon, label, target, type = 'ionicons' }) => {
        const isActive = activeRoute === target || (target === 'Home' && activeRoute === 'Dashboard');

        const renderIcon = () => {
            const color = isActive ? themeColors.primary : (isDark ? themeColors.textSecondary : '#64748B');
            if (type === 'material') {
                return <MaterialIcons name={icon} size={20} color={color} />;
            } else if (type === 'community') {
                return <MaterialCommunityIcons name={icon} size={20} color={color} />;
            } else if (type === 'feather') {
                return <Feather name={icon} size={20} color={color} />;
            }
            return <Ionicons name={icon} size={20} color={color} />;
        };

        const handlePress = async () => {
            if (target === 'Plans') {
                if (!userData) {
                    showAlert({ title: 'Error', message: 'User data not loaded. Please try again.', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
                    return;
                }

                // Check 1: Pending payment
                const hasPending = await checkPendingPayment(auth.currentUser?.uid);
                if (hasPending) {
                    showAlert({
                        title: 'Recharge Restricted',
                        message: 'You already have a pending payment request. Please wait for the admin to verify it before initiating a new one.',
                        type: 'warning',
                        buttons: [{ text: 'OK', onPress: hideAlert }]
                    });
                    return;
                }

                // Check 2: Expiry >= 7 days (only if a valid plan is active)
                const { getPlanDisplayValue } = require('../utils/bcnCalculator');
                const currentPlan = getPlanDisplayValue(userData);

                const daysLeft = calculateDaysRemaining(userData.expiry_date, userData);
                if (daysLeft >= 7 && currentPlan !== 'No Plan') {
                    showAlert({
                        title: t('recharge_restricted'),
                        message: t('recharge_restricted_days').replace('{days}', daysLeft),
                        type: 'warning',
                        buttons: [{ text: "OK", onPress: hideAlert }]
                    });
                    return;
                }
            }
            navigation.navigate(target);
        };

        return (
            <TouchableOpacity
                style={styles.menuItem}
                onPress={handlePress}
                activeOpacity={0.7}
            >
                <View style={styles.menuIconBox}>
                    {renderIcon()}
                </View>
                <Text style={[
                    styles.menuLabel,
                    {
                        color: isActive ? themeColors.primary : (isDark ? themeColors.textSecondary : '#334155'),
                        fontWeight: isActive ? '800' : '600'
                    }
                ]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    const userInitial = userData?.name?.charAt(0)?.toUpperCase() || 'U';
    const displayName = userData?.name || 'User';
    const displaySubtitle = userData?.village || userData?.box_number || 'Customer';

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.background : '#FFF' }]}>
            <SafeAreaView style={styles.safeContent} edges={['top', 'bottom']}>
                {/* HEADER — Gradient with user info */}
                <LinearGradient
                    colors={['#1E40AF', '#3B82F6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sidebarHeader}
                >
                    {/* Decorative circles */}
                    <View style={styles.decorCircle1} />
                    <View style={styles.decorCircle2} />

                    <View style={styles.headerContent}>
                        <View style={styles.avatarBox}>
                            <Text style={styles.avatarText}>{userInitial}</Text>
                        </View>
                        <View style={styles.headerInfo}>
                            <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
                            <View style={styles.subtitleRow}>
                                <View style={styles.onlineDot} />
                                <Text style={styles.userSubtitle} numberOfLines={1}>{displaySubtitle}</Text>
                            </View>
                        </View>
                    </View>
                </LinearGradient>

                {/* MENU LIST */}
                <ScrollView showsVerticalScrollIndicator={false} style={styles.menuScroll}>
                    <Text style={[styles.menuSectionLabel, { color: isDark ? themeColors.textSubtle : '#94A3B8' }]}>MAIN</Text>
                    <MenuItem icon="home-outline" label={t('dashboard')} target="Home" />
                    <MenuItem icon="notifications-none" label={t('notifications')} target="Notifications" type="material" />

                    <Text style={[styles.menuSectionLabel, { color: isDark ? themeColors.textSubtle : '#94A3B8' }]}>SUBSCRIPTION</Text>
                    <MenuItem icon="credit-card-outline" label={t('plans_recharge')} target="Plans" type="community" />
                    <MenuItem icon="package-variant-closed" label={t('your_plan')} target="MySubscription" type="community" />
                    <MenuItem icon="history" label={t('history')} target="History" type="material" />
                    <MenuItem icon="cpu" label={t('stb_management')} target="BoxRequest" type="feather" />

                    <Text style={[styles.menuSectionLabel, { color: isDark ? themeColors.textSubtle : '#94A3B8' }]}>HELP & ACCOUNT</Text>
                    <MenuItem icon="chatbubble-ellipses-outline" label={t('support')} target="Support" />
                    <MenuItem icon="person-outline" label={t('profile')} target="Profile" />
                    <MenuItem icon="settings-outline" label={t('settings')} target="Settings" />
                </ScrollView>

                {/* LOGOUT */}
                <View style={[styles.bottomSection, { borderTopColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <View style={[styles.logoutIconBox, { backgroundColor: isDark ? '#EF444420' : '#FEF2F2' }]}>
                            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                        </View>
                        <Text style={styles.logoutLabel}>{t('sign_out')}</Text>
                    </TouchableOpacity>
                </View>

                <CustomAlert {...alertState} onDismiss={hideAlert} />
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeContent: { flex: 1 },

    // Header
    sidebarHeader: {
        paddingHorizontal: 20,
        paddingTop: 28,
        paddingBottom: 20,
        overflow: 'hidden',
    },
    decorCircle1: {
        position: 'absolute', top: -30, right: -30,
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    decorCircle2: {
        position: 'absolute', bottom: -20, left: -10,
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    avatarBox: {
        width: 48, height: 48, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarText: { color: '#FFF', fontSize: 22, fontWeight: '900' },
    headerInfo: { flex: 1 },
    userName: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.3 },
    subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
    onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
    userSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },

    // Menu
    menuScroll: { flex: 1, paddingHorizontal: 12, paddingTop: 12 },
    menuSectionLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4, marginLeft: 16, marginTop: 12 },
    menuItem: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 10,
        marginVertical: 1, borderRadius: 14, gap: 10,
    },
    menuIconBox: {
        width: 34, height: 34, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center',
    },
    menuLabel: { fontSize: 14, flex: 1 },

    // Bottom
    bottomSection: { borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 8 },
    logoutIconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    logoutLabel: { color: '#EF4444', fontSize: 14, fontWeight: '800' },
});

export default CustomSidebar;
