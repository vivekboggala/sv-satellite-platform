import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import CustomAlert from '../../components/CustomAlert';
import useAlert from '../../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { firestore } from '../../services/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';

const AdminExportDataScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const [exporting, setExporting] = useState(false);
    const { alertState, showAlert, hideAlert } = useAlert();

    const exportToCSV = async (data, filename) => {
        try {
            if (data.length === 0) {
                showAlert({ title: 'No Data', message: 'There is no data to export', type: 'warning', buttons: [{ text: 'OK', onPress: hideAlert }] });
                return;
            }

            // Get headers from first object
            const headers = Object.keys(data[0]).join(',');

            // Convert data to CSV rows
            const rows = data.map(item =>
                Object.values(item).map(val =>
                    typeof val === 'string' && val.includes(',') ? `"${val}"` : val
                ).join(',')
            );

            const csv = [headers, ...rows].join('\n');

            // Save to file
            const fileUri = FileSystem.documentDirectory + filename;
            await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: 'utf8' });

            // Share file
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri);
            } else {
                showAlert({ title: 'Success', message: `File saved to: ${fileUri}`, type: 'success', buttons: [{ text: 'OK', onPress: hideAlert }] });
            }
        } catch (error) {
            console.error('Export error:', error);
            showAlert({ title: 'Error', message: 'Failed to export data: ' + error.message, type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
        }
    };

    const exportAllUsers = async () => {
        setExporting(true);
        try {
            const usersSnapshot = await getDocs(collection(firestore, 'users'));
            const users = [];

            usersSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.role !== 'admin') {
                    users.push({
                        Name: data.name || '',
                        Mobile: data.mobile || '',
                        Village: data.village || '',
                        Service: data.service_type || '',
                        Plan: data.plan_name || '',
                        BoxID: data.box_number || '',
                        Status: data.status || '',
                        Approved: data.is_approved ? 'Yes' : 'No',
                        LastRecharge: data.last_recharge ? (data.last_recharge.toDate ? data.last_recharge.toDate().toLocaleDateString() : new Date(data.last_recharge).toLocaleDateString()) : 'N/A',
                        ValidTill: data.expiry_date ? (data.expiry_date.toDate ? data.expiry_date.toDate().toLocaleDateString() : new Date(data.expiry_date).toLocaleDateString()) : 'N/A',
                    });
                }
            });

            await exportToCSV(users, `all_users_${Date.now()}.csv`);
        } catch (error) {
            console.error('Export error:', error);
            showAlert({ title: 'Error', message: 'Failed to export users', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
        } finally {
            setExporting(false);
        }
    };

    const exportVillageWise = async () => {
        setExporting(true);
        try {
            const usersSnapshot = await getDocs(collection(firestore, 'users'));
            const villageData = {};

            usersSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.role !== 'admin') {
                    const village = data.village || 'Unknown';
                    if (!villageData[village]) {
                        villageData[village] = [];
                    }
                    villageData[village].push({
                        Name: data.name || '',
                        Mobile: data.mobile || '',
                        Service: data.service_type || '',
                        Plan: data.plan_name || '',
                        BoxID: data.box_number || '',
                        Status: data.status || '',
                        LastRecharge: data.last_recharge ? (data.last_recharge.toDate ? data.last_recharge.toDate().toLocaleDateString() : new Date(data.last_recharge).toLocaleDateString()) : 'N/A',
                        ValidTill: data.expiry_date ? (data.expiry_date.toDate ? data.expiry_date.toDate().toLocaleDateString() : new Date(data.expiry_date).toLocaleDateString()) : 'N/A',
                    });
                }
            });

            // Export each village as separate file
            for (const [village, users] of Object.entries(villageData)) {
                await exportToCSV(users, `${village}_users_${Date.now()}.csv`);
            }

            showAlert({ title: 'Success', message: `Exported ${Object.keys(villageData).length} village files`, type: 'success', buttons: [{ text: 'OK', onPress: hideAlert }] });
        } catch (error) {
            console.error('Export error:', error);
            showAlert({ title: 'Error', message: 'Failed to export village data', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
        } finally {
            setExporting(false);
        }
    };

    const exportMonthlyRevenue = async () => {
        setExporting(true);
        try {
            const paymentsSnapshot = await getDocs(
                query(collection(firestore, 'payments'), where('status', '==', 'completed'))
            );
            const payments = [];

            paymentsSnapshot.forEach(doc => {
                const data = doc.data();
                payments.push({
                    Date: data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString() : '',
                    UserName: data.user_name || '',
                    Mobile: data.user_email || '',
                    Amount: data.amount || 0,
                    Plan: data.plan_name || '',
                    Duration: data.duration || '',
                    PaymentMethod: data.payment_method || '',
                    UTR: data.utr_number || '',
                });
            });

            await exportToCSV(payments, `revenue_report_${Date.now()}.csv`);
        } catch (error) {
            console.error('Export error:', error);
            showAlert({ title: 'Error', message: 'Failed to export revenue data', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
        } finally {
            setExporting(false);
        }
    };

    const exportActiveUsers = async () => {
        setExporting(true);
        try {
            const usersSnapshot = await getDocs(
                query(collection(firestore, 'users'), where('status', '==', 'active'))
            );
            const users = [];

            usersSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.role !== 'admin') {
                    users.push({
                        Name: data.name || '',
                        Mobile: data.mobile || '',
                        Village: data.village || '',
                        Service: data.service_type || '',
                        Plan: data.plan_name || '',
                        LastRecharge: data.last_recharge ? (data.last_recharge.toDate ? data.last_recharge.toDate().toLocaleDateString() : new Date(data.last_recharge).toLocaleDateString()) : 'N/A',
                        ValidTill: data.expiry_date ? (data.expiry_date.toDate ? data.expiry_date.toDate().toLocaleDateString() : new Date(data.expiry_date).toLocaleDateString()) : 'N/A',
                    });
                }
            });

            await exportToCSV(users, `active_users_${Date.now()}.csv`);
        } catch (error) {
            console.error('Export error:', error);
            showAlert({ title: 'Error', message: 'Failed to export active users', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
        } finally {
            setExporting(false);
        }
    };

    const ExportCard = ({ icon, title, description, onPress, color }) => (
        <TouchableOpacity
            style={[styles.exportCard, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}
            onPress={onPress}
            disabled={exporting}
            activeOpacity={0.7}
        >
            <View style={[styles.cardIconBox, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon} size={28} color={color} />
            </View>
            <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>{title}</Text>
                <Text style={[styles.cardDescription, { color: themeColors.textSubtle }]}>{description}</Text>
            </View>
            <Ionicons name="download-outline" size={24} color={themeColors.textSubtle} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: themeColors.background, borderBottomColor: themeColors.borderLight }]}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu" size={26} color={themeColors.textPrimary} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Export Data</Text>
                </View>

                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={[styles.infoCard, { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary }]}>
                    <Ionicons name="information-circle" size={24} color={themeColors.primary} />
                    <Text style={[styles.infoText, { color: themeColors.primary }]}>
                        Export data to CSV files for analysis or backup. Files will be saved to your device.
                    </Text>
                </View>

                <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Quick Exports</Text>

                <ExportCard
                    icon="people-outline"
                    title="All Users"
                    description="Export complete list of all registered users"
                    color="#3B82F6"
                    onPress={exportAllUsers}
                />

                <ExportCard
                    icon="checkmark-circle-outline"
                    title="Active Users Only"
                    description="Export only active subscribers with expiry dates"
                    color="#10B981"
                    onPress={exportActiveUsers}
                />

                <ExportCard
                    icon="location-outline"
                    title="Village-wise Report"
                    description="Export separate files for each village"
                    color="#8B5CF6"
                    onPress={exportVillageWise}
                />

                <ExportCard
                    icon="cash-outline"
                    title="Revenue Report"
                    description="Export all completed payment transactions"
                    color="#F59E0B"
                    onPress={exportMonthlyRevenue}
                />

                {exporting && (
                    <View style={[styles.exportingBox, { backgroundColor: themeColors.card }]}>
                        <ActivityIndicator size="large" color={themeColors.primary} />
                        <Text style={[styles.exportingText, { color: themeColors.textPrimary }]}>
                            Exporting data...
                        </Text>
                    </View>
                )}
            </ScrollView>
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
    menuButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        padding: 20,
    },
    infoCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 24,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
    },
    exportCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
        gap: 16,
    },
    cardIconBox: {
        width: 56,
        height: 56,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
    exportingBox: {
        alignItems: 'center',
        padding: 24,
        borderRadius: 16,
        marginTop: 20,
    },
    exportingText: {
        fontSize: 15,
        fontWeight: '600',
        marginTop: 12,
    },
});

export default AdminExportDataScreen;