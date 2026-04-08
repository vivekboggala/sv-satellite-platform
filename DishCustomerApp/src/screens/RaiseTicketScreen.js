import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Dimensions, Image } from 'react-native';
import CustomAlert from '../components/CustomAlert';
import useAlert from '../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { auth, firestore, storage } from '../services/firebase';
import notificationService from '../services/notificationService';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Service-specific issues
const BCN_ISSUES = [
    { label: 'No Entitlement', value: 'No Entitlement' },
    { label: 'No Signal', value: 'No Signal' },
];

const APFIBER_ISSUES = [
    { label: 'Pon Red', value: 'Pon Red' },
    { label: 'No Internet', value: 'No Internet' },
    { label: 'Youtube Not Playing', value: 'Youtube Not Playing' },
    { label: 'Wifi Issue', value: 'Wifi Issue' },
];

// Common for all service types
const COMMON_ISSUES = [
    { label: 'Box Defective', value: 'Box Defective' },
    { label: 'Power Issue', value: 'Power Issue' },
    { label: 'Channels Buffering (Low Signal)', value: 'Channels Buffering (Low Signal)' },
    { label: 'Others', value: 'Others' },
];

const getIssueCategories = (serviceType) => {
    switch (serviceType) {
        case 'bcn_digital': return [...BCN_ISSUES, ...COMMON_ISSUES];
        case 'ap_fiber': return [...APFIBER_ISSUES, ...COMMON_ISSUES];
        case 'hathway': return [...COMMON_ISSUES];
        default: return [...BCN_ISSUES, ...APFIBER_ISSUES, ...COMMON_ISSUES];
    }
};

const PRIORITY_OPTIONS = [
    { label: 'Normal', value: 'normal', color: '#2563EB' },
    { label: 'High', value: 'high', color: '#F59E0B' },
    { label: 'Urgent', value: 'urgent', color: '#EF4444' },
];

const RaiseTicketScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const [userData, setUserData] = useState(null);
    const [issueType, setIssueType] = useState('');
    const [priority, setPriority] = useState('normal');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const { alertState, showAlert, hideAlert } = useAlert();



    useEffect(() => {
        const fetchUser = async () => {
            const user = auth.currentUser;
            if (user) {
                const uDoc = await getDoc(doc(firestore, "users", user.uid));
                if (uDoc.exists()) setUserData(uDoc.data());
            }
        };
        fetchUser();
    }, []);

    const handleSubmit = async () => {
        if (!userData) {
            showAlert({ title: "Error", message: "Identifying information not loaded. Please wait a moment.", type: "error", buttons: [{ text: "OK", onPress: hideAlert }] });
            return;
        }
        if (!issueType) {
            showAlert({ title: "Missing Category", message: "Please select an issue category.", type: "warning", buttons: [{ text: "OK", onPress: hideAlert }] });
            return;
        }
        if (!description.trim()) {
            showAlert({ title: "Missing Details", message: "Please describe your issue.", type: "warning", buttons: [{ text: "OK", onPress: hideAlert }] });
            return;
        }

        setSubmitting(true);
        try {

            const user = auth.currentUser;
            await addDoc(collection(firestore, "support_tickets"), {
                user_id: user.uid,
                user_name: userData.name || 'Customer',
                // Prefer customer_id if exists, then box_number, then mobile
                customer_id: userData.customer_id || userData.box_number || userData.box_id || userData.mobile || 'NA',
                box_number: userData.box_number || userData.box_id || 'NA',
                village: userData.village || userData.locality || 'NA',
                service_type: userData.service_type || 'GENERAL',
                service_provider: userData.service_provider || 'NA',
                subject: issueType,
                description: description.trim(),
                category: issueType,
                status: "open",
                created_at: serverTimestamp(),
                priority: priority,
                updated_at: serverTimestamp(),
            });

            // Notify Admins (Fire and Forget - Non-blocking)
            notificationService.sendNotificationWithRetry(
                'admin',
                "New Support Ticket",
                `${userData?.name || 'Customer'} raised a ticket: ${issueType}.`,
                { type: 'support', user_id: user.uid, ticket_id: issueType }
            );

            showAlert({
                title: "Success",
                message: "Ticket raised successfully.",
                type: "success",
                buttons: [
                    { text: "OK", onPress: () => { hideAlert(); navigation.goBack(); } }
                ]
            });
        } catch (error) {
            showAlert({ title: "Error", message: "Failed to create ticket.", type: "error", buttons: [{ text: "OK", onPress: hideAlert }] });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.background : '#F8FAFC' }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            {/* HEADER - FIXED AT TOP */}
            <SafeAreaView edges={['top']} style={[styles.headerArea, { backgroundColor: isDark ? themeColors.card : '#FFF' }]}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <MaterialIcons name="arrow-back" size={24} color={isDark ? '#FFF' : '#0F172A'} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#0F172A' }]}>Raise Ticket</Text>
                    <View style={{ width: 44 }} />
                </View>
            </SafeAreaView>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.content}>
                    {/* TITLE SECTION */}
                    <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#0F172A' }]}>What's the issue?</Text>
                    <Text style={[styles.sectionDesc, { color: isDark ? themeColors.textSubtle : '#64748B' }]}>Select the category of your problem and describe it below.</Text>

                    {/* CATEGORY DROPDOWN */}
                    <Text style={[styles.fieldLabel, { color: isDark ? themeColors.textSubtle : '#64748B' }]}>ISSUE CATEGORY</Text>
                    <TouchableOpacity
                        style={[styles.dropdownBtn, { backgroundColor: isDark ? themeColors.card : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                        onPress={() => setShowDropdown(!showDropdown)}
                    >
                        <Ionicons name="list-outline" size={18} color={isDark ? themeColors.textSubtle : '#64748B'} />
                        <Text style={[styles.dropdownText, { color: issueType ? (isDark ? '#FFF' : '#0F172A') : (isDark ? themeColors.textSubtle : '#94A3B8') }]}>
                            {issueType || 'Select an issue category'}
                        </Text>
                        <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={18} color={isDark ? themeColors.textSubtle : '#64748B'} />
                    </TouchableOpacity>

                    {showDropdown && (
                        <View style={[styles.dropdownList, { backgroundColor: isDark ? themeColors.card : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                            {getIssueCategories(userData?.service_type).map((cat) => (
                                <TouchableOpacity
                                    key={cat.value}
                                    style={[
                                        styles.dropdownItem,
                                        issueType === cat.value && { backgroundColor: isDark ? '#2563EB20' : '#EFF6FF' }
                                    ]}
                                    onPress={() => {
                                        setIssueType(cat.value);
                                        setShowDropdown(false);
                                    }}
                                >
                                    <Text style={[styles.dropdownItemText, { color: issueType === cat.value ? '#2563EB' : (isDark ? '#FFF' : '#0F172A') }]}>{cat.label}</Text>
                                    {issueType === cat.value && (
                                        <Ionicons name="checkmark-circle" size={18} color="#2563EB" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* PRIORITY SELECTOR */}
                    <Text style={[styles.fieldLabel, { color: isDark ? themeColors.textSubtle : '#64748B', marginTop: 24 }]}>PRIORITY</Text>
                    <View style={styles.priorityRow}>
                        {PRIORITY_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.value}
                                style={[
                                    styles.priorityBtn,
                                    { backgroundColor: isDark ? themeColors.card : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
                                    priority === opt.value && { backgroundColor: opt.color + '15', borderColor: opt.color }
                                ]}
                                onPress={() => setPriority(opt.value)}
                            >
                                <View style={[styles.priorityDot, { backgroundColor: opt.color }]} />
                                <Text style={[
                                    styles.priorityText,
                                    { color: isDark ? '#CBD5E1' : '#64748B' },
                                    priority === opt.value && { color: opt.color, fontWeight: '800' }
                                ]}>{opt.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* DESCRIPTION */}
                    <Text style={[styles.fieldLabel, { color: isDark ? themeColors.textSubtle : '#64748B', marginTop: 24 }]}>DESCRIBE YOUR ISSUE</Text>
                    <View style={[styles.textAreaContainer, { backgroundColor: isDark ? themeColors.card : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <TextInput
                            style={[styles.textArea, { color: isDark ? '#FFF' : '#0F172A' }]}
                            placeholder="Explain the problem you are facing in detail..."
                            placeholderTextColor={isDark ? themeColors.textSubtle : '#94A3B8'}
                            multiline
                            numberOfLines={5}
                            value={description}
                            onChangeText={setDescription}
                            textAlignVertical="top"
                        />
                    </View>


                    {/* USER INFO DISPLAY */}
                    <View style={[styles.infoCard, { backgroundColor: isDark ? themeColors.card : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <View style={styles.infoRow}>
                            <Feather name="user" size={14} color={isDark ? themeColors.textSubtle : '#94A3B8'} />
                            <Text style={[styles.infoLabel, { color: isDark ? themeColors.textSubtle : '#94A3B8' }]}>Name</Text>
                            <Text style={[styles.infoValue, { color: isDark ? '#FFF' : '#0F172A' }]}>{userData?.name || '---'}</Text>
                        </View>
                        <View style={[styles.infoDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                        <View style={styles.infoRow}>
                            <Feather name="box" size={14} color={isDark ? themeColors.textSubtle : '#94A3B8'} />
                            <Text style={[styles.infoLabel, { color: isDark ? themeColors.textSubtle : '#94A3B8' }]}>Service ID</Text>
                            <Text style={[styles.infoValue, { color: isDark ? '#FFF' : '#0F172A' }]}>{userData?.box_number || '---'}</Text>
                        </View>
                        <View style={[styles.infoDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                        <View style={styles.infoRow}>
                            <Feather name="map-pin" size={14} color={isDark ? themeColors.textSubtle : '#94A3B8'} />
                            <Text style={[styles.infoLabel, { color: isDark ? themeColors.textSubtle : '#94A3B8' }]}>Locality</Text>
                            <Text style={[styles.infoValue, { color: isDark ? '#FFF' : '#0F172A' }]}>{userData?.village || '---'}</Text>
                        </View>
                    </View>

                    {/* SUBMIT */}
                    <TouchableOpacity
                        style={styles.submitBtnWrapper}
                        onPress={handleSubmit}
                        disabled={submitting}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={['#2563EB', '#1E40AF']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.submitBtn}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <View style={styles.btnContent}>
                                    <Ionicons name="paper-plane" size={18} color="#FFF" />
                                    <Text style={styles.submitText}>Submit Ticket</Text>
                                </View>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <CustomAlert {...alertState} onDismiss={hideAlert} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerArea: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    topBar: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '900' },

    scrollContent: { paddingBottom: 60 },
    content: { padding: 20 },

    sectionTitle: { fontSize: 24, fontWeight: '900', marginBottom: 6 },
    sectionDesc: { fontSize: 13, fontWeight: '600', lineHeight: 20, marginBottom: 28 },

    fieldLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 10, marginLeft: 4 },

    dropdownBtn: { flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, gap: 10, elevation: 1 },
    dropdownText: { flex: 1, fontSize: 14, fontWeight: '700' },

    dropdownList: { borderRadius: 16, borderWidth: 1, marginTop: 6, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
    dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.04)' },
    dropdownItemText: { fontSize: 14, fontWeight: '700' },

    priorityRow: { flexDirection: 'row', gap: 10 },
    priorityBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 14, borderWidth: 1, gap: 6 },
    priorityDot: { width: 8, height: 8, borderRadius: 4 },
    priorityText: { fontSize: 13, fontWeight: '700' },

    textAreaContainer: { borderRadius: 20, padding: 18, minHeight: 140, borderWidth: 1, elevation: 1 },
    textArea: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 22 },

    infoCard: { borderRadius: 20, padding: 16, borderWidth: 1, marginTop: 24, elevation: 1 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    infoLabel: { fontSize: 12, fontWeight: '700', width: 70 },
    infoValue: { flex: 1, fontSize: 14, fontWeight: '800', textAlign: 'right' },
    infoDivider: { height: 1, marginLeft: 24 },

    submitBtnWrapper: { borderRadius: 20, overflow: 'hidden', marginTop: 28, elevation: 4 },
    submitBtn: { height: 58, justifyContent: 'center', alignItems: 'center' },
    btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    submitText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
});

export default RaiseTicketScreen;
