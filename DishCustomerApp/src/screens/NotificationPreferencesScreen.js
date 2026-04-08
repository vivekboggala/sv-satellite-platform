import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import CustomAlert from '../components/CustomAlert';
import useAlert from '../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { auth, firestore } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

const NotificationPreferencesScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const { t } = useLanguage();
    const [preferences, setPreferences] = useState({
        payment_reminders: true,
        support_updates: true,
        broadcast_alerts: true,
        promotions: false,
    });
    const [loading, setLoading] = useState(true);
    const { alertState, showAlert, hideAlert } = useAlert();

    useEffect(() => {
        fetchPreferences();
    }, []);

    const fetchPreferences = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const docRef = doc(firestore, "user_preferences", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setPreferences(docSnap.data().notifications || preferences);
            }
        } catch (error) {
            console.log("Error fetching preferences:", error);
        } finally {
            setLoading(false);
        }
    };

    const togglePreference = async (key) => {
        const updated = { ...preferences, [key]: !preferences[key] };
        setPreferences(updated);

        try {
            const user = auth.currentUser;
            const docRef = doc(firestore, "user_preferences", user.uid);
            await setDoc(docRef, { notifications: updated }, { merge: true });
        } catch (error) {
            showAlert({ title: "Error", message: "Failed to save preference.", type: "error", buttons: [{ text: "OK", onPress: hideAlert }] });
            setPreferences(preferences); // Revert
        }
    };

    const PreferenceItem = ({ icon, label, description, value, onToggle, last }) => (
        <View style={[styles.item, { borderBottomColor: themeColors.border }, last && { borderBottomWidth: 0 }]}>
            <View style={[styles.iconContainer, { backgroundColor: themeColors.primary + '15' }]}>
                <Ionicons name={icon} size={22} color={themeColors.primary} />
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.label, { color: themeColors.textPrimary }]}>{label}</Text>
                <Text style={[styles.description, { color: themeColors.textSubtle }]}>{description}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: '#E2E8F0', true: themeColors.primary }}
                thumbColor={"#FFF"}
                ios_backgroundColor="#E2E8F0"
            />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            {/* FIXED HEADER */}
            <SafeAreaView edges={['top']} style={[styles.headerArea, { backgroundColor: isDark ? themeColors.card : '#FFF' }]}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <MaterialIcons name="arrow-back" size={24} color={themeColors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Alert Preferences</Text>
                    <View style={{ width: 44 }} />
                </View>
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={[styles.section, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Notification Channels</Text>
                        <Text style={[styles.sectionSub, { color: themeColors.textSecondary }]}>Choose how you want to be notified</Text>
                    </View>

                    <PreferenceItem
                        icon="card-outline"
                        label="Payment Reminders"
                        description="Billing dates and confirmations"
                        value={preferences.payment_reminders}
                        onToggle={() => togglePreference('payment_reminders')}
                    />
                    <PreferenceItem
                        icon="help-buoy-outline"
                        label="Service Updates"
                        description="Updates on support tickets"
                        value={preferences.support_updates}
                        onToggle={() => togglePreference('support_updates')}
                    />
                    <PreferenceItem
                        icon="megaphone-outline"
                        label="Critical Alerts"
                        description="Maintenance and node outages"
                        value={preferences.broadcast_alerts}
                        onToggle={() => togglePreference('broadcast_alerts')}
                    />
                    <PreferenceItem
                        icon="gift-outline"
                        label="Promotional Offers"
                        description="Updates on new deals and plans"
                        value={preferences.promotions}
                        onToggle={() => togglePreference('promotions')}
                        last
                    />
                </View>

                <View style={[styles.infoBox, { backgroundColor: isDark ? '#FFF1' : '#F1F5F9' }]}>
                    <Ionicons name="information-circle-outline" size={20} color={themeColors.textSubtle} />
                    <Text style={[styles.infoText, { color: themeColors.textSecondary }]}>
                        Critical security and account-related alerts will always be sent via SMS regardless of these settings.
                    </Text>
                </View>
            </ScrollView>

            <CustomAlert {...alertState} onDismiss={hideAlert} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    // Fixed Header Styles
    headerArea: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    topBar: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '900' },

    content: { padding: 24, paddingBottom: 50 },
    section: { borderRadius: 24, padding: 24, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
    sectionHeader: { marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
    sectionSub: { fontSize: 13, fontWeight: '600', opacity: 0.7 },

    item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1 },
    iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    textContainer: { flex: 1, marginRight: 10 },
    label: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
    description: { fontSize: 12, fontWeight: '600', opacity: 0.8 },

    infoBox: { flexDirection: 'row', alignItems: 'center', marginTop: 24, padding: 16, borderRadius: 16, gap: 12 },
    infoText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 18 },
});

export default NotificationPreferencesScreen;
