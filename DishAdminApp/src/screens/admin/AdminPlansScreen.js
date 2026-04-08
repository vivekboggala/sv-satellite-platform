import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, Dimensions, ScrollView } from 'react-native';
import CustomAlert from '../../components/CustomAlert';
import useAlert from '../../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { shadows } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { firestore } from '../../services/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';

const { height } = Dimensions.get('window');

const AdminPlansScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const { alertState, showAlert, hideAlert } = useAlert();

    // Form States
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [type, setType] = useState('fiber'); // fiber, cable
    const [speed, setSpeed] = useState('');
    const [dataLimit, setDataLimit] = useState('Unlimited');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(firestore, "plans"));
            const fetched = [];
            querySnapshot.forEach((doc) => {
                fetched.push({ id: doc.id, ...doc.data() });
            });
            setPlans(fetched);
        } catch (error) {
            console.error("Error fetching plans:", error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (plan = null) => {
        if (plan) {
            setEditingPlan(plan);
            setName(plan.name);
            setPrice(plan.price.toString());
            setType(plan.type);
            setSpeed(plan.speed || '');
            setDataLimit(plan.data_limit || 'Unlimited');
            setDescription(plan.description || '');
        } else {
            setEditingPlan(null);
            setName('');
            setPrice('');
            setType('fiber');
            setSpeed('');
            setDataLimit('Unlimited');
            setDescription('');
        }
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!name || !price) {
            showAlert({ title: "Input Required", message: "Plan identification and pricing are mandatory fields.", type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
            return;
        }

        setSaving(true);
        const planData = {
            name,
            price: parseFloat(price),
            type,
            speed: (type === 'fiber' || type === 'hathway') ? speed : null,
            data_limit: (type === 'fiber' || type === 'hathway') ? dataLimit : null,
            description,
            updated_at: new Date()
        };

        try {
            if (editingPlan) {
                await updateDoc(doc(firestore, "plans", editingPlan.id), planData);
            } else {
                await addDoc(collection(firestore, "plans"), { ...planData, created_at: new Date() });
            }
            setModalVisible(false);
            fetchPlans();
        } catch (error) {
            console.error(error);
            showAlert({ title: "Operation Error", message: "System failed to commit plan changes to catalog.", type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id) => {
        showAlert({
            title: "Erase Plan",
            message: "Are you sure you want to permanently remove this offering from the catalog?",
            type: 'confirm',
            buttons: [
                { text: "Cancel", onPress: hideAlert },
                {
                    text: "Erase",
                    onPress: async () => {
                        hideAlert();
                        try {
                            await deleteDoc(doc(firestore, "plans", id));
                            fetchPlans();
                        } catch (e) {
                            console.error(e);
                            showAlert({ title: "Delete Failed", message: "Could not remove plan from system.", type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
                        }
                    }
                }
            ]
        });
    };

    const styles = getStyles(themeColors);

    const PlanCard = ({ item }) => {
        const type = item.type || 'fiber'; // Fallback
        return (
            <View style={[styles.planCard, shadows.small]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.typeBadge, {
                        backgroundColor: type === 'fiber' ? (isDark ? '#1E3A8A' : '#EEF2FF') :
                            type === 'hathway' ? (isDark ? '#371B58' : '#F3E8FF') :
                                (isDark ? '#78350F' : '#FFFBEB')
                    }]}>
                        <Text style={[styles.typeText, {
                            color: type === 'fiber' ? themeColors.primary :
                                type === 'hathway' ? '#A855F7' :
                                    themeColors.warning
                        }]}>{type.toUpperCase()}</Text>
                    </View>
                    <View style={styles.priceContainer}>
                        <Text style={styles.priceTag}>₹{item.price}</Text>
                        <Text style={styles.priceInterval}>/mo</Text>
                    </View>
                </View>

                <Text style={styles.planTitle}>{item.name}</Text>
                <Text style={styles.planDescription} numberOfLines={2}>{item.description}</Text>

                {(type === 'fiber' || type === 'hathway') && (
                    <View style={styles.specGrid}>
                        <View style={styles.specPill}>
                            <Ionicons name="speedometer-outline" size={14} color={themeColors.primary} />
                            <Text style={styles.specText}>{item.speed || 'N/A'}</Text>
                        </View>
                        <View style={styles.specPill}>
                            <Ionicons name="infinite-outline" size={14} color={themeColors.success} />
                            <Text style={styles.specText}>{item.data_limit || 'Unlimited'}</Text>
                        </View>
                    </View>
                )}

                <View style={styles.cardButtons}>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.trashBtn}>
                        <Ionicons name="trash-outline" size={18} color={themeColors.error} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openModal(item)} style={styles.editPlanBtn}>
                        <Ionicons name="create-outline" size={16} color="white" />
                        <Text style={styles.editPlanText}>EDIT CONFIG</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style={isDark ? "light" : "dark"} />

            {/* Header */}
            <View style={[styles.topHeader, shadows.small]}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.openDrawer()}>
                            <Ionicons name="menu-outline" size={28} color={themeColors.headerText} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Plan Catalog</Text>
                        <View style={{ width: 40 }} />
                    </View>
                    <View style={styles.headerDashboard}>
                        <View style={styles.dashItem}>
                            <Text style={styles.dashVal}>{plans.length}</Text>
                            <Text style={styles.dashLabel}>ACTIVE OFFERINGS</Text>
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            <TouchableOpacity
                style={styles.addOfferingBtn}
                onPress={() => openModal()}
            >
                <View style={styles.addIconCircle}>
                    <Ionicons name="add" size={24} color="white" />
                </View>
                <Text style={styles.addBtnText}>PROVISION NEW PLAN</Text>
            </TouchableOpacity>

            {loading ? (
                <View style={styles.loadingBox}><ActivityIndicator size="large" color={themeColors.primary} /></View>
            ) : (
                <FlatList
                    data={plans}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <PlanCard item={item} />}
                    contentContainerStyle={styles.listContainer}
                    onRefresh={fetchPlans}
                    refreshing={loading}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyBox}>
                            <View style={styles.emptyCircle}>
                                <Ionicons name="list-outline" size={70} color={themeColors.subtle} />
                            </View>
                            <Text style={styles.emptyTitle}>No Catalog Entries</Text>
                            <Text style={styles.emptySub}>The plan repository is currently unpopulated.</Text>
                        </View>
                    )}
                />
            )}

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
                accessible={true}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTag}>OFFERING CONFIGURATION</Text>
                                <Text style={styles.modalTitle}>
                                    {editingPlan ? 'Refine Catalog' : 'New Provision'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                            <Text style={styles.inputLabel}>PLAN IDENTIFIER</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="e.g. Fiber Premium Max"
                                placeholderTextColor={themeColors.subtle}
                                value={name}
                                onChangeText={setName}
                            />

                            <View style={styles.inputRow}>
                                <View style={{ flex: 1, marginRight: 15 }}>
                                    <Text style={styles.inputLabel}>MONTHLY RATE (₹)</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="999"
                                        placeholderTextColor={themeColors.subtle}
                                        value={price}
                                        onChangeText={setPrice}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>SERVICE CLASS</Text>
                                    <View style={styles.typeSwitcher}>
                                        <TouchableOpacity
                                            onPress={() => setType('fiber')}
                                            style={[styles.switcherBtn, type === 'fiber' && styles.switcherBtnActive]}
                                        >
                                            <Text style={[styles.switcherText, type === 'fiber' && styles.switcherTextActive]}>Fiber</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setType('hathway')}
                                            style={[styles.switcherBtn, type === 'hathway' && styles.switcherBtnActive]}
                                        >
                                            <Text style={[styles.switcherText, type === 'hathway' && styles.switcherTextActive]}>Hathway</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setType('cable')}
                                            style={[styles.switcherBtn, type === 'cable' && styles.switcherBtnActive]}
                                        >
                                            <Text style={[styles.switcherText, type === 'cable' && styles.switcherTextActive]}>Cable</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            {(type === 'fiber' || type === 'hathway') && (
                                <View style={styles.inputRow}>
                                    <View style={{ flex: 1, marginRight: 15 }}>
                                        <Text style={styles.inputLabel}>BANDWIDTH</Text>
                                        <TextInput
                                            style={styles.modalInput}
                                            placeholder="100 Mbps"
                                            placeholderTextColor={themeColors.subtle}
                                            value={speed}
                                            onChangeText={setSpeed}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.inputLabel}>DATA QUOTA</Text>
                                        <TextInput
                                            style={styles.modalInput}
                                            placeholder="Unlimited"
                                            placeholderTextColor={themeColors.subtle}
                                            value={dataLimit}
                                            onChangeText={setDataLimit}
                                        />
                                    </View>
                                </View>
                            )}

                            <Text style={styles.inputLabel}>DESCRIPTION & HIGHLIGHTS</Text>
                            <TextInput
                                style={[styles.modalInput, styles.textArea]}
                                placeholder="Key features..."
                                placeholderTextColor={themeColors.subtle}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />

                            <TouchableOpacity
                                onPress={handleSave}
                                style={[styles.savePlanBtn, saving && { opacity: 0.7 }]}
                                disabled={saving}
                            >
                                <LinearGradient
                                    colors={isDark ? [themeColors.primary, themeColors.secondary] : ['#6366F1', '#4F46E5']}
                                    style={styles.gradientBtn}
                                >
                                    {saving ? <ActivityIndicator color="white" /> : <Text style={styles.savePlanText}>COMMIT TO CATALOG</Text>}
                                </LinearGradient>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
            <CustomAlert {...alertState} onDismiss={hideAlert} />
        </View>
    );
};

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topHeader: { backgroundColor: colors.headerBg, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, marginBottom: 15 },
    backBtn: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: colors.headerText, letterSpacing: 0.5 },

    headerDashboard: { alignItems: 'center', paddingBottom: 5 },
    dashItem: { alignItems: 'center' },
    dashVal: { color: colors.primary, fontSize: 32, fontWeight: '900' },
    dashLabel: { color: colors.textSecondary, fontSize: 9, fontWeight: '800', letterSpacing: 2, marginTop: 4 },

    addOfferingBtn: { flexDirection: 'row', alignItems: 'center', margin: 25, padding: 12, borderRadius: 24, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.inputBg },
    addIconCircle: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15, backgroundColor: colors.primary },
    addBtnText: { fontSize: 13, fontWeight: '900', letterSpacing: 1, color: colors.primary },

    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContainer: { paddingHorizontal: 25, paddingBottom: 50 },

    planCard: { backgroundColor: colors.card, borderRadius: 24, padding: 22, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    typeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    typeText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    priceContainer: { flexDirection: 'row', alignItems: 'baseline' },
    priceTag: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
    priceInterval: { fontSize: 12, fontWeight: '600', marginLeft: 2, color: colors.textSecondary },

    planTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8, color: colors.textPrimary },
    planDescription: { fontSize: 13, lineHeight: 20, marginBottom: 20, color: colors.textSecondary },
    specGrid: { flexDirection: 'row', gap: 12, marginBottom: 25 },
    specPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    specText: { fontSize: 12, fontWeight: '700', marginLeft: 8, color: colors.textPrimary },

    cardButtons: { flexDirection: 'row', alignItems: 'center', paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.border },
    trashBtn: { width: 44, height: 44, borderRadius: 14, borderWidth: 1.5, borderColor: colors.error, justifyContent: 'center', alignItems: 'center', marginRight: 15, borderStyle: 'dashed' },
    editPlanBtn: { flex: 1, height: 44, backgroundColor: colors.info, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', ...shadows.small },
    editPlanText: { color: 'white', fontSize: 11, fontWeight: '900', marginLeft: 8, letterSpacing: 1 },

    emptyBox: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
    emptyCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.inputBg, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
    emptyTitle: { fontSize: 20, fontWeight: '900', marginBottom: 10, color: colors.textPrimary },
    emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22, color: colors.textSecondary },

    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalBox: { height: height * 0.85, borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, backgroundColor: colors.card, ...shadows.large },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
    modalTag: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 5, color: colors.textSecondary },
    modalTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
    closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.inputBg, justifyContent: 'center', alignItems: 'center' },

    modalScroll: { paddingBottom: 40 },
    inputLabel: { fontSize: 9, fontWeight: '900', color: colors.textSecondary, letterSpacing: 1.5, marginBottom: 10 },
    modalInput: { height: 50, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 15, fontSize: 15, fontWeight: '600', marginBottom: 25, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, color: colors.inputText },
    textArea: { height: 120, padding: 15 },
    inputRow: { flexDirection: 'row' },
    typeSwitcher: { flexDirection: 'row', backgroundColor: colors.inputBg, borderRadius: 12, padding: 4, height: 50, marginBottom: 25 },
    switcherBtn: { flex: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    switcherBtnActive: { backgroundColor: colors.card, ...shadows.small },
    switcherText: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },
    switcherTextActive: { color: colors.primary },
    savePlanBtn: { height: 55, borderRadius: 16, marginTop: 10, overflow: 'hidden', ...shadows.medium },
    gradientBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    savePlanText: { color: 'white', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
});

export default AdminPlansScreen;
