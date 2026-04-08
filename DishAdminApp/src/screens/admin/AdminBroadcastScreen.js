import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform, ScrollView, Modal, FlatList } from 'react-native';
import CustomAlert from '../../components/CustomAlert';
import useAlert from '../../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { shadows } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import notificationService from '../../services/notificationService';
import { firestore } from '../../services/firebase';
import { collection, getDocs } from 'firebase/firestore';

const { width } = Dimensions.get('window');

const SERVICE_TYPES = [
    { id: 'all', label: 'All Services' },
    { id: 'ap_fiber', label: 'APFiber' },
    { id: 'hathway', label: 'Hathway' },
    { id: 'bcn_digital', label: 'BCN Digital' },
];

const AdminBroadcastScreen = ({ navigation }) => {
    const { isDark, themeColors } = useTheme();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const { alertState, showAlert, hideAlert } = useAlert();

    // Filters
    const [targetType, setTargetType] = useState('all'); // all, village, service
    const [villages, setVillages] = useState([]);
    const [selectedVillage, setSelectedVillage] = useState(null);
    const [selectedService, setSelectedService] = useState(null);

    // Modals
    const [villageModalVisible, setVillageModalVisible] = useState(false);
    const [serviceModalVisible, setServiceModalVisible] = useState(false);

    useEffect(() => {
        fetchVillages();
    }, []);

    const fetchVillages = async () => {
        try {
            const querySnapshot = await getDocs(collection(firestore, "villages"));
            const fetched = [];
            querySnapshot.forEach((doc) => { fetched.push(doc.data().name); });
            if (fetched.length > 0) setVillages(fetched.sort());
        } catch (error) {
            console.log("Error fetching villages:", error);
        }
    };

    const handleSend = async () => {
        if (!title || !message) {
            showAlert({ title: "Input Required", message: "Please specify both a subject and the broadcast message.", type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
            return;
        }

        let filters = null;
        let confirmMsg = "Sending to ALL users.";

        if (targetType === 'village') {
            if (!selectedVillage) { showAlert({ title: "Selection Required", message: "Please select a village.", type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] }); return; }
            filters = [{ field: "tag", key: "village", relation: "=", value: selectedVillage }];
            confirmMsg = `Sending to users in ${selectedVillage}.`;
        } else if (targetType === 'service') {
            if (!selectedService) { showAlert({ title: "Selection Required", message: "Please select a service type.", type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] }); return; }
            filters = [{ field: "tag", key: "service_type", relation: "=", value: selectedService.id }];
            confirmMsg = `Sending to users with ${selectedService.label}.`;
        }

        showAlert({
            title: "Confirm Broadcast",
            message: confirmMsg,
            type: 'confirm',
            buttons: [
                { text: "Cancel", onPress: hideAlert },
                {
                    text: "Send Now",
                    onPress: async () => {
                        hideAlert();
                        setSending(true);
                        try {
                            notificationService.sendNotificationWithRetry(filters || 'all', title, message, { type: 'broadcast' });
                            showAlert({ title: "Broadcast Success", message: "Notification has been dispatched.", type: 'success', buttons: [{ text: 'OK', onPress: hideAlert }] });
                            setTitle('');
                            setMessage('');
                        } catch (e) {
                            showAlert({ title: "Broadcast Failed", message: e.message, type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
                        } finally {
                            setSending(false);
                        }
                    }
                }
            ]
        });
    };

    const styles = getStyles(themeColors);

    const FilterChip = ({ label, active, onPress }) => (
        <TouchableOpacity style={[styles.filterChip, active && styles.activeChip]} onPress={onPress}>
            <Text style={[styles.filterChipText, active && styles.activeChipText]}>{label}</Text>
        </TouchableOpacity>
    );

    const SelectModal = ({ visible, title, data, onSelect, onClose }) => (
        <Modal
            animationType="slide"
            transparent
            visible={visible}
            onRequestClose={onClose}
            accessible={true}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalBox, shadows.medium]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={themeColors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={data}
                        keyExtractor={(item) => item.id || item}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.modalItem} onPress={() => onSelect(item)}>
                                <Text style={styles.modalItemText}>{item.label || item}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={styles.container}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <View style={[styles.topHeader, shadows.small]}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.openDrawer()}>
                            <Ionicons name="menu-outline" size={28} color={themeColors.headerText} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Broadcast Hub</Text>
                        <View style={{ width: 40 }} />
                    </View>
                </SafeAreaView>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoTitle}>Target Audience</Text>
                        <View style={styles.filterRow}>
                            <FilterChip label="All Users" active={targetType === 'all'} onPress={() => setTargetType('all')} />
                            <FilterChip label="By Village" active={targetType === 'village'} onPress={() => setTargetType('village')} />
                            <FilterChip label="By Service" active={targetType === 'service'} onPress={() => setTargetType('service')} />
                        </View>

                        {targetType === 'village' && (
                            <TouchableOpacity style={styles.dropdown} onPress={() => setVillageModalVisible(true)}>
                                <Text style={styles.dropdownText}>{selectedVillage || "Select Village"}</Text>
                                <Ionicons name="chevron-down" size={20} color={themeColors.textSecondary} />
                            </TouchableOpacity>
                        )}

                        {targetType === 'service' && (
                            <TouchableOpacity style={styles.dropdown} onPress={() => setServiceModalVisible(true)}>
                                <Text style={styles.dropdownText}>{selectedService?.label || "Select Service"}</Text>
                                <Ionicons name="chevron-down" size={20} color={themeColors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={[styles.inputCard, shadows.small]}>
                        <Text style={styles.fieldLabel}>MESSAGE SUBJECT</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput style={styles.textInput} placeholder="e.g. Maintenance Alert" placeholderTextColor={themeColors.subtle} value={title} onChangeText={setTitle} />
                        </View>

                        <Text style={[styles.fieldLabel, { marginTop: 25 }]}>MESSAGE CONTENT</Text>
                        <View style={styles.textAreaWrapper}>
                            <TextInput style={styles.textArea} placeholder="Type your message here..." placeholderTextColor={themeColors.subtle} value={message} onChangeText={setMessage} multiline numberOfLines={6} textAlignVertical="top" />
                        </View>

                        <TouchableOpacity style={[styles.dispatchBtn, sending && { opacity: 0.7 }]} onPress={handleSend} disabled={sending}>
                            <LinearGradient colors={isDark ? [themeColors.primary, themeColors.secondary] : ['#6366F1', '#4F46E5']} style={styles.gradientBtn}>
                                {sending ? <ActivityIndicator color="white" /> : <Text style={styles.dispatchText}>SEND BROADCAST</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <SelectModal visible={villageModalVisible} title="Select Village" data={villages} onSelect={(v) => { setSelectedVillage(v); setVillageModalVisible(false); }} onClose={() => setVillageModalVisible(false)} />
            <SelectModal visible={serviceModalVisible} title="Select Service" data={SERVICE_TYPES} onSelect={(s) => { setSelectedService(s); setServiceModalVisible(false); }} onClose={() => setServiceModalVisible(false)} />
            <CustomAlert {...alertState} onDismiss={hideAlert} />
        </View>
    );
};

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topHeader: { backgroundColor: colors.headerBg, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
    backBtn: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: colors.headerText, letterSpacing: 0.5 },

    scrollContent: { padding: 25, paddingBottom: 50 },
    infoCard: { marginBottom: 25 },
    infoTitle: { fontSize: 14, fontWeight: '800', marginBottom: 15, color: colors.textPrimary },
    filterRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 15 },

    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border },
    activeChip: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterChipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    activeChipText: { color: 'white' },

    dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    dropdownText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },

    inputCard: { backgroundColor: colors.card, borderRadius: 24, padding: 25, borderWidth: 1, borderColor: colors.border },
    fieldLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10, color: colors.textSecondary },
    inputWrapper: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 15, height: 50, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, justifyContent: 'center' },
    textInput: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    textAreaWrapper: { borderWidth: 1, borderRadius: 18, padding: 15, height: 140, borderColor: colors.inputBorder, backgroundColor: colors.inputBg },
    textArea: { flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 22, color: colors.textPrimary },

    dispatchBtn: { height: 55, borderRadius: 16, marginTop: 30, overflow: 'hidden', ...shadows.medium },
    gradientBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    dispatchText: { color: 'white', fontSize: 12, fontWeight: '900', letterSpacing: 1 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 25 },
    modalBox: { backgroundColor: colors.card, borderRadius: 20, padding: 20, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
    modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalItemText: { fontSize: 16, color: colors.textPrimary, fontWeight: '500' },
});

export default AdminBroadcastScreen;
