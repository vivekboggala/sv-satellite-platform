import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Clipboard, Dimensions } from 'react-native';
import CustomAlert from '../../components/CustomAlert';
import useAlert from '../../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { calculateDaysRemaining } from '../../utils/bcnCalculator';

const { width } = Dimensions.get('window');

const AdminUserDetailsScreen = ({ navigation, route }) => {
    const { user } = route.params || {};
    const { themeColors, isDark } = useTheme();
    const { t } = useLanguage();
    const { alertState, showAlert, hideAlert } = useAlert();

    if (!user) {
        return (
            <View style={[styles.container, { backgroundColor: themeColors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: themeColors.textPrimary }}>User data missing.</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
                    <Text style={{ color: themeColors.primary }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const copyToClipboard = (label, value) => {
        if (!value) return;
        Clipboard.setString(value);
        showAlert({ title: "Copied", message: `${label} copied to clipboard.`, type: 'success', buttons: [{ text: 'OK', onPress: hideAlert }] });
    };

    const DetailItem = ({ icon, label, value, canCopy }) => (
        <TouchableOpacity
            style={styles.detailItem}
            onPress={() => canCopy && copyToClipboard(label, value)}
            activeOpacity={canCopy ? 0.7 : 1}
        >
            <View style={[styles.iconBox, { backgroundColor: themeColors.primary + '10' }]}>
                <Ionicons name={icon} size={20} color={themeColors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.detailLabel, { color: themeColors.textSubtle }]}>{label}</Text>
                <Text style={[styles.detailValue, { color: themeColors.textPrimary }]}>{value || 'N/A'}</Text>
            </View>
            {canCopy && value && (
                <Ionicons name="copy-outline" size={16} color={themeColors.primary} />
            )}
        </TouchableOpacity>
    );

    const getStatusInfo = (user) => {
        if (!user.expiry_date) return { color: '#EF4444', label: 'EXPIRED' };

        const now = new Date();
        const expiryDate = user.expiry_date.toDate ? user.expiry_date.toDate() : new Date(user.expiry_date);

        if (expiryDate < now) return { color: '#EF4444', label: 'EXPIRED' };

        const diffDays = calculateDaysRemaining(user.expiry_date, user.service_type);
        if (diffDays <= 7 && diffDays > 0) return { color: '#F59E0B', label: 'EXPIRING SOON' };

        return { color: '#10B981', label: 'ACTIVE' };
    };

    const statusInfo = getStatusInfo(user);

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <StatusBar style="light" />

            <View style={[styles.modernHeader, { backgroundColor: themeColors.card, borderBottomColor: themeColors.borderLight }]}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                            <Ionicons name="chevron-back" size={26} color={themeColors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Subscriber Profile</Text>
                        <View style={{ width: 44 }} />
                    </View>

                    <View style={styles.profileHero}>
                        <View style={styles.avatarWrapper}>
                            <View style={[styles.avatar, { backgroundColor: themeColors.primary + '15' }]}>
                                <Text style={[styles.avatarText, { color: themeColors.primary }]}>{(user.name || 'U').charAt(0).toUpperCase()}</Text>
                            </View>
                            <View style={[styles.statusIndicator, { backgroundColor: statusInfo.color, borderColor: themeColors.card }]} />
                        </View>
                        <View style={styles.profileMeta}>
                            <Text style={[styles.userName, { color: themeColors.textPrimary }]}>{user.name}</Text>
                            <View style={styles.typeBadge}>
                                <Text style={styles.typeText}>{user.service_type?.replace('_', ' ').toUpperCase()}</Text>
                            </View>
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.statsRow, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                    <View style={styles.statBox}>
                        <Text style={[styles.statLabel, { color: themeColors.textSubtle }]}>STATUS</Text>
                        <Text style={[styles.statValue, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: themeColors.borderLight }]} />
                    <View style={styles.statBox}>
                        <Text style={[styles.statLabel, { color: themeColors.textSubtle }]}>DAYS LEFT</Text>
                        <Text style={[styles.statValue, { color: statusInfo.color }]}>
                            {calculateDaysRemaining(user.expiry_date, user.service_type)}
                        </Text>
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: themeColors.textSubtle }]}>IDENTITY & HARDWARE</Text>
                <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                    <DetailItem icon="phone-portrait-outline" label="Mobile Number" value={user.mobile} canCopy />
                    <View style={[styles.divider, { backgroundColor: themeColors.borderLight }]} />
                    <DetailItem icon="hardware-chip-outline" label="Box / MAC ID" value={user.box_number} canCopy />
                </View>

                {(user.village || user.subArea) && <Text style={[styles.sectionTitle, { color: themeColors.textSubtle }]}>INSTALLATION ADDRESS</Text>}
                <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }, user.village || user.subArea ? {} : { height: 0, opacity: 0, marginBottom: 0 }]}>
                    {user.village && <DetailItem icon="location-outline" label="Village / Area" value={user.village} />}
                    {user.village && user.subArea && <View style={[styles.divider, { backgroundColor: themeColors.borderLight }]} />}
                    {user.subArea && <DetailItem icon="map-outline" label="Sub-Area / Ward" value={user.subArea} />}
                </View>

                <Text style={[styles.sectionTitle, { color: themeColors.textSubtle }]}>SUBSCRIPTION DETAILS</Text>
                <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                    <DetailItem icon="calendar-outline" label="Current Plan" value={user.plan_name} />
                    {user.service_type?.toLowerCase().includes('fiber') || user.service_type?.toLowerCase().includes('hathway') ? (
                        <>
                            <View style={[styles.divider, { backgroundColor: themeColors.borderLight }]} />
                            <DetailItem icon="speedometer-outline" label="Plan Speed" value={user.plan_speed || 'N/A'} />
                        </>
                    ) : null}
                    <View style={[styles.divider, { backgroundColor: themeColors.borderLight }]} />
                    <DetailItem
                        icon="timer-outline"
                        label="Expiry Date"
                        value={user.expiry_date ? (user.expiry_date.toDate ? user.expiry_date.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date(user.expiry_date).toLocaleDateString()) : 'Not Active'}
                    />
                </View>



                <View style={{ height: 40 }} />
            </ScrollView>
            <CustomAlert {...alertState} onDismiss={hideAlert} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    modernHeader: {
        paddingBottom: 20,
        borderBottomWidth: 1,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        height: 56,
    },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
    profileHero: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 10,
    },
    avatarWrapper: { position: 'relative' },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: { fontSize: 32, fontWeight: '900' },
    statusIndicator: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 3,
    },
    profileMeta: { marginLeft: 16 },
    userName: { fontSize: 24, fontWeight: '900', marginBottom: 6 },
    typeBadge: {
        backgroundColor: '#3B82F615',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    typeText: { fontSize: 10, color: '#3B82F6', fontWeight: '900', letterSpacing: 0.5 },

    scrollContent: { padding: 20 },
    statsRow: {
        flexDirection: 'row',
        borderRadius: 24,
        padding: 22,
        marginBottom: 25,
        borderWidth: 1.5,
    },
    statBox: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, height: '70%', alignSelf: 'center' },
    statLabel: { fontSize: 10, fontWeight: '800', marginBottom: 5, letterSpacing: 1 },
    statValue: { fontSize: 20, fontWeight: '900' },

    card: { borderRadius: 24, padding: 22, marginBottom: 25, borderWidth: 1.5 },
    sectionTitle: { fontSize: 11, fontWeight: '900', marginBottom: 12, marginLeft: 5, letterSpacing: 1.5 },

    detailItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    detailLabel: { fontSize: 10, fontWeight: '800', marginBottom: 3, letterSpacing: 0.5 },
    detailValue: { fontSize: 15, fontWeight: '700' },
    divider: { height: 1, marginVertical: 4, marginLeft: 59 },

    actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    actionItem: {
        width: (width - 40) / 4,
        alignItems: 'center',
        marginBottom: 15,
    },
    actionIcon: {
        width: 60,
        height: 60,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionText: { fontSize: 11, fontWeight: '800' },
});

export default AdminUserDetailsScreen;
