import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import CustomAlert from '../components/CustomAlert';
import useAlert from '../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { auth, firestore } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const { language, t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const { alertState, showAlert, hideAlert } = useAlert();

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
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        showAlert({
            title: t('sign_out'),
            message: t('sign_out_confirm'),
            type: 'confirm',
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
                            showAlert({ title: 'Error', message: 'Logout failed.', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
                        }
                    }
                }
            ]
        });
    };

    const MenuRow = ({ icon, title, subtitle, onPress, isLast }) => (
        <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={onPress}
            activeOpacity={0.6}
        >
            <View style={[styles.menuIconContainer, { backgroundColor: isDark ? '#FFF1' : '#F1F5F9' }]}>
                <Feather name={icon} size={18} color={themeColors.primary} />
            </View>
            <View style={styles.menuTextSection}>
                <Text style={[styles.menuTitle, { color: themeColors.textPrimary }]}>{title}</Text>
                {subtitle && <Text style={[styles.menuSubtitle, { color: themeColors.textSubtle }]}>{subtitle}</Text>}
            </View>
            <MaterialIcons name="chevron-right" size={20} color={themeColors.textSubtle} />
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
                <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            {/* UNIFIED MESH BACKGROUND */}
            <View style={styles.meshContainer}>
                <LinearGradient
                    colors={isDark ? ['#1E293B', '#0F172A'] : ['#F8FAFC', '#E2E8F0']}
                    style={StyleSheet.absoluteFill}
                />
                <View style={[styles.meshSpot1, { backgroundColor: themeColors.primary + '15' }]} />
                <View style={[styles.meshSpot2, { backgroundColor: '#8B5CF610' }]} />
            </View>

            <SafeAreaView edges={['top']} style={styles.topNav}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.headerBtn}>
                    <MaterialIcons name="menu" size={24} color={themeColors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.pageTitle, { color: themeColors.textPrimary }]}>{t('account')}</Text>
                <View style={{ width: 44 }} />
            </SafeAreaView>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>

                {/* BLUE IDENTITY CARD (MATCHES DASHBOARD) */}
                <View style={styles.cardWrapper}>
                    <LinearGradient
                        colors={['#1E40AF', '#3B82F6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.identityCard}
                    >
                        <View style={styles.cardHeader}>
                            <View style={styles.avatarBox}>
                                <View style={styles.avatarMain}>
                                    <Text style={styles.avatarText}>{userData?.name?.charAt(0) || 'U'}</Text>
                                </View>

                            </View>
                            <View style={styles.userInfo}>
                                <Text style={styles.userNameText}>{userData?.name || 'User Account'}</Text>
                                <View style={styles.statusBadge}>
                                    <View style={styles.dot} />
                                    <Text style={styles.statusText}>{t('active_account')}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.cardDivider} />

                        <View style={styles.cardDetails}>
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>{t('box_identifier')}</Text>
                                <Text style={styles.detailValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{userData?.box_number || '---'}</Text>
                            </View>
                            <View style={styles.detailSeparator} />
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>{t('phone_number')}</Text>
                                <Text style={styles.detailValue} numberOfLines={1}>{userData?.mobile || '---'}</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* SIMPLIFIED MENU SECTIONS (NO BLACK LINES) */}
                <View style={styles.menuContainer}>
                    <Text style={[styles.sectionHeader, { color: themeColors.textSubtle }]}>{t('app_preferences')}</Text>
                    <View style={[styles.menuBlock, { backgroundColor: themeColors.card }]}>
                        <MenuRow icon="user" title={t('personal_info')} subtitle={t('personal_info_sub')} onPress={() => navigation.navigate('PersonalInfo')} />
                        <MenuRow icon="bell" title={t('notification_settings')} subtitle={t('notification_settings_sub')} onPress={() => navigation.navigate('NotificationPreferences')} />
                        <MenuRow icon="lock" title={t('security_privacy')} subtitle={t('security_privacy_sub')} onPress={() => navigation.navigate('ChangePassword')} isLast />
                    </View>

                    <Text style={[styles.sectionHeader, { color: themeColors.textSubtle, marginTop: 24 }]}>{t('subscription_info')}</Text>
                    <View style={[styles.menuBlock, { backgroundColor: themeColors.card }]}>
                        <MenuRow icon="package" title={t('my_current_plan')} subtitle={t('usage_details')} onPress={() => navigation.navigate('MySubscription')} />
                        <MenuRow icon="history" title={t('history')} subtitle={t('payment_history_sub')} onPress={() => navigation.navigate('History')} isLast />
                    </View>

                    <TouchableOpacity
                        style={[styles.exitBtn, { backgroundColor: isDark ? '#EF444420' : '#FEF2F2' }]}
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                        <Text style={styles.exitTxt}>{t('sign_out_p')}</Text>
                    </TouchableOpacity>

                    <View style={styles.footerNote}>
                        <Text style={[styles.versionLabel, { color: themeColors.textSubtle }]}>{t('powered_by')}</Text>
                    </View>
                </View>
            </ScrollView>

            <CustomAlert {...alertState} onDismiss={hideAlert} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    meshContainer: { ...StyleSheet.absoluteFillObject, height: 400, overflow: 'hidden' },
    meshSpot1: { position: 'absolute', top: -100, left: -50, width: 300, height: 300, borderRadius: 150 },
    meshSpot2: { position: 'absolute', top: 50, right: -100, width: 350, height: 350, borderRadius: 175 },

    scrollContainer: { paddingBottom: 60 },
    topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
    headerBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    pageTitle: { fontSize: 20, fontWeight: '900' },

    cardWrapper: { paddingHorizontal: 24, marginTop: 16 },
    identityCard: {
        borderRadius: 32,
        padding: 24,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    avatarBox: { position: 'relative' },
    avatarMain: { width: 70, height: 70, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#FFF', fontSize: 32, fontWeight: '900' },
    editBtn: { position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: 8, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
    userInfo: { flex: 1 },
    userNameText: { color: '#FFF', fontSize: 22, fontWeight: '900' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
    statusText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

    cardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 20 },
    cardDetails: { flexDirection: 'row', alignItems: 'center' },
    detailItem: { flex: 1 },
    detailLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
    detailValue: { color: '#FFF', fontSize: 13, fontWeight: '800' },
    detailSeparator: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 15 },

    menuContainer: { padding: 24 },
    sectionHeader: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12, marginLeft: 6 },
    menuBlock: { borderRadius: 32, padding: 8, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, overflow: 'hidden' },
    menuRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    menuIconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    menuTextSection: { flex: 1 },
    menuTitle: { fontSize: 15, fontWeight: '700' },
    menuSubtitle: { fontSize: 12, fontWeight: '500', opacity: 0.7, marginTop: 1 },

    exitBtn: { marginTop: 32, height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    exitTxt: { color: '#EF4444', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
    footerNote: { marginTop: 40, alignItems: 'center' },
    versionLabel: { fontSize: 10, fontWeight: '800', opacity: 0.5 }
});

export default ProfileScreen;
