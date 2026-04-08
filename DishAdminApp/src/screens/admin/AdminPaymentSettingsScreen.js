import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import CustomAlert from '../../components/CustomAlert';
import useAlert from '../../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { firestore } from '../../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';

const AdminPaymentSettingsScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [upiId, setUpiId] = useState('');
    const [upiName, setUpiName] = useState('');
    const { alertState, showAlert, hideAlert } = useAlert();

    useEffect(() => {
        fetchPaymentSettings();
    }, []);

    const fetchPaymentSettings = async () => {
        try {
            const settingsDoc = await getDoc(doc(firestore, 'payment_settings', 'default'));
            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                setUpiId(data.upi_id || '');
                setUpiName(data.upi_name || '');
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!upiId.trim() || !upiName.trim()) {
            showAlert({ title: 'Error', message: 'Please fill all fields', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
            return;
        }

        setSaving(true);
        try {
            await setDoc(doc(firestore, 'payment_settings', 'default'), {
                upi_id: upiId.trim(),
                upi_name: upiName.trim(),
                updated_at: serverTimestamp(),
            });

            showAlert({ title: 'Success', message: 'Payment settings updated!', type: 'success', buttons: [{ text: 'OK', onPress: hideAlert }] });
        } catch (error) {
            console.error('Error saving:', error);
            showAlert({ title: 'Error', message: 'Failed to save', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <View style={[styles.header, { backgroundColor: themeColors.background, borderBottomColor: themeColors.borderLight }]}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu" size={26} color={themeColors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Payment Settings</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={themeColors.primary} style={{ marginTop: 40 }} />
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: themeColors.textPrimary }]}>UPI ID</Text>
                        <View style={[styles.inputBox, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                            <Ionicons name="at-outline" size={20} color={themeColors.textSubtle} />
                            <TextInput
                                style={[styles.input, { color: themeColors.textPrimary }]}
                                placeholder="example@paytm"
                                placeholderTextColor={themeColors.textSubtle}
                                value={upiId}
                                onChangeText={setUpiId}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: themeColors.textPrimary }]}>Account Name</Text>
                        <View style={[styles.inputBox, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                            <Ionicons name="person-outline" size={20} color={themeColors.textSubtle} />
                            <TextInput
                                style={[styles.input, { color: themeColors.textPrimary }]}
                                placeholder="Account holder name"
                                placeholderTextColor={themeColors.textSubtle}
                                value={upiName}
                                onChangeText={setUpiName}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: themeColors.primary }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                                <Text style={styles.saveButtonText}>Save Settings</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            )}
            <CustomAlert {...alertState} onDismiss={hideAlert} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    menuButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    content: { padding: 20 },
    inputGroup: { marginBottom: 24 },
    label: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        gap: 12,
    },
    input: { flex: 1, fontSize: 15, fontWeight: '500' },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
        marginTop: 12,
    },
    saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default AdminPaymentSettingsScreen;