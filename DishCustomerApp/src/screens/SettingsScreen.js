import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Modal, Dimensions } from 'react-native';
import CustomAlert from '../components/CustomAlert';
import useAlert from '../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { auth } from '../services/firebase';
import { logoutOneSignal } from '../services/onesignal';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const SettingsScreen = ({ navigation }) => {
    const { isDark, themeColors, toggleTheme } = useTheme();
    const { language, changeLanguage, t } = useLanguage();
    const [langModal, setLangModal] = useState(false);
    const { alertState, showAlert, hideAlert } = useAlert();

    const handleLogout = async () => {
        showAlert({
            title: t('sign_out'),
            message: t('sign_out_confirm'),
            type: "confirm",
            buttons: [
                { text: t('cancel'), onPress: hideAlert },
                {
                    text: t('sign_out'), style: "destructive", onPress: async () => {
                        hideAlert();
                        await logoutOneSignal();
                        await auth.signOut();
                    }
                }
            ]
        });
    };

    const SettingRow = ({ icon, label, subtitle, hasSwitch, isDarkModeToggle, onPress, isLast }) => (
        <TouchableOpacity
            style={[styles.row, { borderBottomWidth: 0 }]}
            disabled={hasSwitch}
            onPress={isDarkModeToggle ? toggleTheme : onPress}
            activeOpacity={0.6}
        >
            <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: themeColors.primary + '10' }]}>
                    <Ionicons name={icon} size={20} color={themeColors.primary} />
                </View>
                <View>
                    <Text style={[styles.label, { color: themeColors.textPrimary }]}>{label}</Text>
                    {subtitle && <Text style={[styles.subtitle, { color: themeColors.textSubtle }]}>{subtitle}</Text>}
                </View>
            </View>
            {hasSwitch ? (
                <View style={styles.switchBox}>
                    <Switch
                        trackColor={{ false: isDark ? '#334155' : '#E2E8F0', true: themeColors.primary }}
                        thumbColor={"white"}
                        value={isDarkModeToggle ? isDark : true}
                        onValueChange={isDarkModeToggle ? toggleTheme : null}
                    />
                </View>
            ) : (
                <MaterialIcons name="chevron-right" size={20} color={themeColors.textSubtle} />
            )}
        </TouchableOpacity>
    );

    const languages = [
        { code: 'en', label: 'English', native: 'English', flag: '🇺🇸' },
        { code: 'te', label: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
    ];

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            <SafeAreaView edges={['top']} style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.backButton}>
                        <MaterialIcons name="menu" size={24} color={themeColors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: themeColors.textPrimary }]}>{t('settings')}</Text>
                    <View style={{ width: 44 }} />
                </View>
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
                {/* UNIFIED MESH BACKGROUND */}
                <View style={styles.meshContainer}>
                    <LinearGradient
                        colors={isDark ? ['#1E293B', '#0F172A'] : ['#F8FAFC', '#E2E8F0']}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={[styles.meshSpot1, { backgroundColor: themeColors.primary + '15' }]} />
                    <View style={[styles.meshSpot2, { backgroundColor: '#8B5CF610' }]} />
                </View>

                {/* SIMPLIFIED PAGE INTRO */}
                <View style={styles.introSection}>
                    <View style={[styles.introIcon, { backgroundColor: themeColors.primary }]}>
                        <Ionicons name="settings-sharp" size={32} color="#FFF" />
                    </View>
                    <Text style={[styles.introTitle, { color: themeColors.textPrimary }]}>{t('app_preferences')}</Text>
                    <Text style={[styles.introSub, { color: themeColors.textSubtle }]}>{t('app_preferences_sub')}</Text>
                </View>

                {/* UNIFIED CONTAINER FOR SETTINGS (NO BLACK LINES) */}
                <View style={styles.contentArea}>
                    <Text style={[styles.sectionTitle, { color: themeColors.textSubtle }]}>{t('app_preferences').toUpperCase()}</Text>
                    <View style={[styles.unifiedCard, { backgroundColor: themeColors.card }]}>
                        <SettingRow
                            icon="moon-outline"
                            label={t('dark_interface')}
                            subtitle={t('dark_interface_sub')}
                            hasSwitch={true}
                            isDarkModeToggle={true}
                        />
                        <SettingRow
                            icon="language-outline"
                            label={t('interface_language')}
                            subtitle={languages.find(l => l.code === language)?.label}
                            onPress={() => setLangModal(true)}
                        />
                        <SettingRow
                            icon="notifications-outline"
                            label={t('notification_settings')}
                            subtitle={t('notification_settings_sub')}
                            onPress={() => navigation.navigate('NotificationPreferences')}
                        />
                    </View>

                    <Text style={[styles.sectionTitle, { color: themeColors.textSubtle, marginTop: 24 }]}>{t('support_terms')}</Text>
                    <View style={[styles.unifiedCard, { backgroundColor: themeColors.card }]}>
                        <SettingRow icon="help-circle-outline" label={t('help_center')} subtitle={t('help_center_sub')} onPress={() => navigation.navigate('Support')} />
                        <SettingRow icon="shield-outline" label={t('security_privacy')} subtitle={t('privacy_security_sub')} onPress={() => navigation.navigate('ChangePassword')} />
                        <SettingRow icon="document-text-outline" label={t('legal_documents')} subtitle={t('legal_documents_sub')} onPress={() => navigation.navigate('Legal', { type: 'terms' })} />
                        <SettingRow icon="information-circle-outline" label={t('app_build')} subtitle="v4.0.0-PRO (52)" isLast />
                    </View>

                    <TouchableOpacity
                        style={[styles.logoutPill, { backgroundColor: isDark ? '#EF444415' : '#FEF2F2' }]}
                        onPress={handleLogout}
                    >
                        <Feather name="power" size={18} color="#EF4444" />
                        <Text style={styles.logoutPillText}>{t('sign_out_p')}</Text>
                    </TouchableOpacity>

                    <View style={styles.branding}>
                        <Text style={[styles.brandText, { color: themeColors.textSubtle }]}>{t('powered_by').toUpperCase()}</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Language Selection Bottom Sheet */}
            <Modal
                visible={langModal}
                transparent
                animationType="slide"
                onRequestClose={() => setLangModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.bottomSheet, { backgroundColor: themeColors.card }]}>
                        <View style={styles.dragBar} />
                        <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>{t('app_language')}</Text>

                        <View style={styles.langList}>
                            {languages.map(l => (
                                <TouchableOpacity
                                    key={l.code}
                                    style={[
                                        styles.langOption,
                                        { backgroundColor: isDark ? '#FFF05' : '#F8FAFC' },
                                        language === l.code && { borderColor: themeColors.primary, borderWidth: 2, backgroundColor: themeColors.primary + '10' }
                                    ]}
                                    onPress={() => { changeLanguage(l.code); setLangModal(false); }}
                                >
                                    <View style={styles.langLeft}>
                                        <Text style={styles.flag}>{l.flag}</Text>
                                        <Text style={[styles.langText, { color: themeColors.textPrimary }]}>{l.native}</Text>
                                    </View>
                                    {language === l.code && <Ionicons name="checkmark-circle" size={24} color={themeColors.primary} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={[styles.modalClose, { backgroundColor: isDark ? '#FFF1' : '#F1F5F9' }]} onPress={() => setLangModal(false)}>
                            <Text style={[styles.closeLabel, { color: themeColors.textPrimary }]}>{t('cancel')}</Text>
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
    header: { zIndex: 10 },
    headerContent: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
    backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '900' },

    meshContainer: { ...StyleSheet.absoluteFillObject, height: 400, overflow: 'hidden', zIndex: -1 },
    meshSpot1: { position: 'absolute', top: -100, left: -50, width: 300, height: 300, borderRadius: 150 },
    meshSpot2: { position: 'absolute', top: 50, right: -100, width: 350, height: 350, borderRadius: 175 },

    scrollBody: { paddingBottom: 60 },
    introSection: { alignItems: 'center', marginTop: 24, paddingHorizontal: 40, marginBottom: 32 },
    introIcon: { width: 64, height: 64, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    introTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    introSub: { fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20, opacity: 0.7 },

    contentArea: { paddingHorizontal: 24 },
    sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 16, marginLeft: 6 },
    unifiedCard: { borderRadius: 36, padding: 8, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 15, marginBottom: 12, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    label: { fontSize: 16, fontWeight: '700' },
    subtitle: { fontSize: 12, opacity: 0.6, marginTop: 2 },
    switchBox: { transform: [{ scale: 0.85 }] },

    logoutPill: { marginTop: 40, height: 64, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, elevation: 2 },
    logoutPillText: { color: '#EF4444', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
    branding: { marginTop: 40, alignItems: 'center' },
    brandText: { fontSize: 10, fontWeight: '800', opacity: 0.4 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    bottomSheet: { borderTopLeftRadius: 48, borderTopRightRadius: 48, padding: 32, paddingBottom: 40 },
    dragBar: { width: 50, height: 6, borderRadius: 3, backgroundColor: '#cbd5e144', alignSelf: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 22, fontWeight: '900', marginBottom: 24 },
    langList: { gap: 14 },
    langOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 22, borderRadius: 32, borderWidth: 2, borderColor: 'transparent' },
    langLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    flag: { fontSize: 24 },
    langText: { fontSize: 18, fontWeight: '800' },
    modalClose: { marginTop: 24, height: 60, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    closeLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 1 }
});

export default SettingsScreen;
