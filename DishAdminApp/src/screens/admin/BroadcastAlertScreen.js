import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Modal, FlatList, Image } from 'react-native';
import CustomAlert from '../../components/CustomAlert';
import useAlert from '../../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { firestore } from '../../services/firebase';
import { collection, addDoc, getDocs, onSnapshot, query, orderBy, serverTimestamp, limit } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { sendBroadcast } from '../../services/onesignal';
import { shadows } from '../../theme';

const { width } = Dimensions.get('window');

const ALERT_TYPES = [
    { id: 'info', label: 'Info', icon: 'information-circle-outline', color: '#3B82F6' },
    { id: 'warning', label: 'Warning', icon: 'warning-outline', color: '#F59E0B' },
    { id: 'urgent', label: 'Urgent', icon: 'alert-circle-outline', color: '#EF4444' },
    { id: 'update', label: 'Update', icon: 'cloud-upload-outline', color: '#10B981' },
];

const SERVICE_TYPES = [
    { id: 'ap_fiber', label: 'APFiber' },
    { id: 'hathway', label: 'Hathway' },
    { id: 'bcn_digital', label: 'BCN Digital' },
];

const INITIAL_VILLAGES = [
    "Gollapalle", "Kolamasanapalle", "Eragunde Palle", "Eguva Kalladu",
    "Nadimi Kalladu", "Diguva Kalladu", "Madhiga Kalladu", "Gundlapalle",
    "GutakaPalle", "Ayyamreddi Palle", "Nadimi Doddi Palle", "Moram",
    "Nakkapalle", "Cattle Farm", "Pathikonda", "Burisettipalle",
    "Belupalle", "Chikkanapalle", "Lakkanapalle", "C.C.Gunta"
].sort();

const BroadcastAlertScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();

    // Form State
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [alertType, setAlertType] = useState('info');
    const [audience, setAudience] = useState('all'); // 'all', 'service', 'village'
    const [selectedVillage, setSelectedVillage] = useState(null);
    const [selectedService, setSelectedService] = useState(null);
    const { alertState, showAlert, hideAlert } = useAlert();

    // Data State
    const [villages, setVillages] = useState(INITIAL_VILLAGES);
    const [loading, setLoading] = useState(false);

    // Modals
    const [villageModalVisible, setVillageModalVisible] = useState(false);
    const [serviceModalVisible, setServiceModalVisible] = useState(false);

    useEffect(() => {
        fetchVillages();
    }, []);

    const fetchVillages = async () => {
        try {
            const snapshot = await getDocs(collection(firestore, "villages"));
            const fetched = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.name) fetched.push(data.name);
            });
            if (fetched.length > 0) {
                setVillages(fetched.sort());
            }
        } catch (error) {
            console.log("Error fetching villages:", error);
        }
    };

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) {
            showAlert({ title: "Missing Fields", message: "Please add a title and message for the broadcast.", type: 'warning', buttons: [{ text: 'OK', onPress: hideAlert }] });
            return;
        }

        if (audience === 'village' && !selectedVillage) {
            showAlert({ title: "Selection Required", message: "Please select a target village.", type: 'warning', buttons: [{ text: 'OK', onPress: hideAlert }] });
            return;
        }

        if (audience === 'service' && !selectedService) {
            showAlert({ title: "Selection Required", message: "Please select a service type.", type: 'warning', buttons: [{ text: 'OK', onPress: hideAlert }] });
            return;
        }

        setLoading(true);
        try {
            let filters = null;
            let targetLabel = 'All Customers';

            if (audience === 'village') {
                filters = [{ field: "tag", key: "village", relation: "=", value: selectedVillage }];
                targetLabel = `Village: ${selectedVillage}`;
            } else if (audience === 'service') {
                filters = [{ field: "tag", key: "service_type", relation: "=", value: selectedService.id }];
                targetLabel = `Service: ${selectedService.label}`;
            }

            // Send via OneSignal (service handles Firestore persistence)
            await sendBroadcast(title.trim(), message.trim(), filters, { type: alertType });

            showAlert({ title: "Broadcast Sent", message: "Your notification has been pushed to the selected audience.", type: 'success', buttons: [{ text: 'OK', onPress: hideAlert }] });
            resetForm();
        } catch (error) {
            console.error(error);
            showAlert({ title: "Error", message: "Failed to send broadcast. Please try again.", type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setMessage('');
        setAlertType('info');
        setAudience('all');
        setSelectedVillage(null);
        setSelectedService(null);
    };

    // Components
    const SelectModal = ({ visible, title, data, onSelect, onClose }) => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={themeColors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={data}
                        keyExtractor={(item) => typeof item === 'string' ? item : item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.modalItem, { borderBottomColor: themeColors.borderLight }]}
                                onPress={() => onSelect(item)}
                            >
                                <Text style={[styles.modalItemText, { color: themeColors.textPrimary }]}>
                                    {typeof item === 'string' ? item : item.label}
                                </Text>
                                <Ionicons name="chevron-forward" size={18} color={themeColors.textSubtle} />
                            </TouchableOpacity>
                        )}
                        showsVerticalScrollIndicator={false}
                        style={{ maxHeight: 400 }}
                    />
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <SafeAreaView edges={['top']} style={[styles.header, { backgroundColor: themeColors.background }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={[styles.backButton, { backgroundColor: themeColors.card }]}
                    >
                        <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Broadcast Alert</Text>
                    <View style={{ width: 40 }} />
                </View>
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Hero Section */}
                <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroCard}
                >
                    <View style={styles.heroContent}>
                        <View style={styles.heroIconBox}>
                            <Ionicons name="megaphone-outline" size={32} color="#FFF" />
                        </View>
                        <View style={styles.heroTextContent}>
                            <Text style={styles.heroTitle}>Broadcast Alert</Text>
                            <Text style={styles.heroSubtitle}>
                                Send real-time notifications to your customers based on service type or location.
                            </Text>
                        </View>
                    </View>
                    <Image
                        source={require('../../../assets/adaptive-icon.png')}
                        style={styles.heroBgPattern}
                        resizeMode="contain"
                    />
                </LinearGradient>

                {/* Alert Content Section */}
                <View style={[styles.sectionCard, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="create-outline" size={20} color={themeColors.primary} />
                        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Alert Content</Text>
                    </View>

                    <TextInput
                        style={[styles.input, {
                            backgroundColor: themeColors.background,
                            borderColor: themeColors.borderLight,
                            color: themeColors.textPrimary
                        }]}
                        placeholder="Alert Title (e.g., Service Maintenance)"
                        placeholderTextColor={themeColors.textSubtle}
                        value={title}
                        onChangeText={setTitle}
                    />

                    <TextInput
                        style={[styles.textArea, {
                            backgroundColor: themeColors.background,
                            borderColor: themeColors.borderLight,
                            color: themeColors.textPrimary
                        }]}
                        placeholder="Message Body (Details about the issue or update...)"
                        placeholderTextColor={themeColors.textSubtle}
                        multiline
                        textAlignVertical="top"
                        value={message}
                        onChangeText={setMessage}
                    />

                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>ALERT TYPE</Text>
                    <View style={styles.alertTypesRow}>
                        {ALERT_TYPES.map(type => (
                            <TouchableOpacity
                                key={type.id}
                                style={[
                                    styles.alertTypeChip,
                                    { borderColor: themeColors.borderLight },
                                    alertType === type.id && { backgroundColor: type.color + '20', borderColor: type.color }
                                ]}
                                onPress={() => setAlertType(type.id)}
                            >
                                <Ionicons
                                    name={type.icon}
                                    size={16}
                                    color={alertType === type.id ? type.color : themeColors.textSubtle}
                                />
                                <Text style={[
                                    styles.alertTypeText,
                                    { color: themeColors.textSubtle },
                                    alertType === type.id && { color: type.color, fontWeight: '700' }
                                ]}>
                                    {type.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Target Audience Section */}
                <View style={[styles.sectionCard, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="people-outline" size={20} color={themeColors.primary} />
                        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Target Audience</Text>
                    </View>

                    <View style={styles.audienceGrid}>
                        <TouchableOpacity
                            style={[
                                styles.audienceCard,
                                { borderColor: themeColors.borderLight, backgroundColor: themeColors.background },
                                audience === 'all' && { borderColor: '#8B5CF6', backgroundColor: '#8B5CF6' + '15' }
                            ]}
                            onPress={() => setAudience('all')}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: audience === 'all' ? '#8B5CF6' : themeColors.borderLight }]}>
                                <Ionicons name="people" size={20} color={audience === 'all' ? '#FFF' : themeColors.textSubtle} />
                            </View>
                            <Text style={[styles.audienceTitle, { color: audience === 'all' ? '#8B5CF6' : themeColors.textPrimary }]}>All Customers</Text>
                            <Text style={[styles.audienceSub, { color: themeColors.textSubtle }]}>Across entire database</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.audienceCard,
                                { borderColor: themeColors.borderLight, backgroundColor: themeColors.background },
                                audience === 'service' && { borderColor: '#F59E0B', backgroundColor: '#F59E0B' + '15' }
                            ]}
                            onPress={() => setAudience('service')}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: audience === 'service' ? '#F59E0B' : themeColors.borderLight }]}>
                                <MaterialCommunityIcons name="cube-outline" size={20} color={audience === 'service' ? '#FFF' : themeColors.textSubtle} />
                            </View>
                            <Text style={[styles.audienceTitle, { color: audience === 'service' ? '#F59E0B' : themeColors.textPrimary }]}>By Service</Text>
                            <Text style={[styles.audienceSub, { color: themeColors.textSubtle }]}>Filter by provider</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.audienceCard,
                                { borderColor: themeColors.borderLight, backgroundColor: themeColors.background },
                                audience === 'village' && { borderColor: '#10B981', backgroundColor: '#10B981' + '15' }
                            ]}
                            onPress={() => setAudience('village')}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: audience === 'village' ? '#10B981' : themeColors.borderLight }]}>
                                <Ionicons name="location-outline" size={20} color={audience === 'village' ? '#FFF' : themeColors.textSubtle} />
                            </View>
                            <Text style={[styles.audienceTitle, { color: audience === 'village' ? '#10B981' : themeColors.textPrimary }]}>By Village</Text>
                            <Text style={[styles.audienceSub, { color: themeColors.textSubtle }]}>Target local area</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Conditional Dropdowns */}
                    {audience === 'village' && (
                        <TouchableOpacity
                            style={[styles.dropdown, { backgroundColor: themeColors.background, borderColor: themeColors.borderLight }]}
                            onPress={() => setVillageModalVisible(true)}
                        >
                            <Text style={[styles.dropdownText, { color: selectedVillage ? themeColors.textPrimary : themeColors.textSubtle }]}>
                                {selectedVillage || 'Select Village'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={themeColors.textSubtle} />
                        </TouchableOpacity>
                    )}

                    {audience === 'service' && (
                        <TouchableOpacity
                            style={[styles.dropdown, { backgroundColor: themeColors.background, borderColor: themeColors.borderLight }]}
                            onPress={() => setServiceModalVisible(true)}
                        >
                            <Text style={[styles.dropdownText, { color: selectedService ? themeColors.textPrimary : themeColors.textSubtle }]}>
                                {selectedService ? selectedService.label : 'Select Service Type'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={themeColors.textSubtle} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Bottom Spacer */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Sticky Send Button */}
            <View style={[styles.footer, { backgroundColor: themeColors.background, borderTopColor: themeColors.borderLight }]}>
                <TouchableOpacity
                    style={[styles.sendButton, { opacity: loading ? 0.7 : 1 }]}
                    onPress={handleSend}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={['#10B981', '#059669']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.sendButtonGradient}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Text style={styles.sendButtonText}>Push Alert to Audience</Text>
                                <Ionicons name="paper-plane-outline" size={20} color="#FFF" />
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Modals */}
            <SelectModal
                visible={villageModalVisible}
                title="Select Village"
                data={villages}
                onSelect={(v) => { setSelectedVillage(v); setVillageModalVisible(false); }}
                onClose={() => setVillageModalVisible(false)}
            />
            <SelectModal
                visible={serviceModalVisible}
                title="Select Service"
                data={SERVICE_TYPES}
                onSelect={(s) => { setSelectedService(s); setServiceModalVisible(false); }}
                onClose={() => setServiceModalVisible(false)}
            />
            <CustomAlert {...alertState} onDismiss={hideAlert} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingTop: 10,
        paddingBottom: 15,
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },
    scrollContent: {
        padding: 20,
    },
    heroCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        overflow: 'hidden',
        position: 'relative',
    },
    heroContent: {
        zIndex: 2,
    },
    heroIconBox: {
        marginBottom: 16,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 20,
    },
    heroBgPattern: {
        position: 'absolute',
        right: -20,
        bottom: -20,
        width: 150,
        height: 150,
        opacity: 0.1,
        transform: [{ rotate: '-15deg' }],
    },
    sectionCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    input: {
        height: 50,
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        marginBottom: 16,
        fontSize: 14,
        fontWeight: '500',
    },
    textArea: {
        height: 120,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        marginBottom: 20,
        fontSize: 14,
        fontWeight: '500',
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    alertTypesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    alertTypeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        gap: 6,
    },
    alertTypeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    audienceGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    audienceCard: {
        flex: 1,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 110,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    audienceTitle: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
        textAlign: 'center',
    },
    audienceSub: {
        fontSize: 10,
        textAlign: 'center',
    },
    dropdown: {
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    dropdownText: {
        fontSize: 14,
        fontWeight: '500',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        borderTopWidth: 1,
    },
    sendButton: {
        borderRadius: 16,
        overflow: 'hidden',
        ...shadows.medium,
    },
    sendButtonGradient: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    sendButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    modalItemText: {
        fontSize: 16,
        fontWeight: '500',
    },
});

export default BroadcastAlertScreen;
