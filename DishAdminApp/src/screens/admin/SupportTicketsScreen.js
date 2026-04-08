import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, RefreshControl, Image, Linking } from 'react-native';
import CustomAlert from '../../components/CustomAlert';
import useAlert from '../../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { firestore } from '../../services/firebase';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const SupportTicketsScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const { t } = useLanguage();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [response, setResponse] = useState('');
    const [sending, setSending] = useState(false);
    const [resolvedInfo, setResolvedInfo] = useState({}); // Cache for resolved user info
    const { alertState, showAlert, hideAlert } = useAlert();

    const onRefresh = async () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    };

    useEffect(() => {
        const q = query(
            collection(firestore, 'support_tickets'),
            orderBy('created_at', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTickets = [];
            snapshot.forEach((doc) => {
                fetchedTickets.push({ id: doc.id, ...doc.data() });
            });
            setTickets(fetchedTickets);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Resolve missing info for tickets
    useEffect(() => {
        const fetchMissingMetadata = async () => {
            const newResolved = { ...resolvedInfo };
            let updated = false;

            for (const ticket of tickets) {
                if (ticket.user_id && !resolvedInfo[ticket.user_id] && (!ticket.village || !ticket.customer_id)) {
                    try {
                        const uDoc = await getDoc(doc(firestore, "users", ticket.user_id));
                        if (uDoc.exists()) {
                            const uData = uDoc.data();
                            newResolved[ticket.user_id] = {
                                village: uData.village || uData.locality || 'N/A',
                                customer_id: uData.customer_id || uData.box_number || uData.mobile || 'N/A',
                                service_type: uData.service_type || 'GENERAL'
                            };
                            updated = true;
                        } else {
                            newResolved[ticket.user_id] = { village: 'N/A', customer_id: 'N/A', service_type: 'GENERAL' };
                            updated = true;
                        }
                    } catch (e) {
                        console.log("Error fetching user data for ticket resolution:", e);
                    }
                }
            }

            if (updated) {
                setResolvedInfo(newResolved);
            }
        };

        if (tickets.length > 0) {
            fetchMissingMetadata();
        }
    }, [tickets]);

    const handleRespond = () => {
        if (!response.trim()) {
            showAlert({ title: 'Error', message: 'Please enter a response', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
            return;
        }

        showAlert({
            title: 'Resolve Ticket?',
            message: 'Are you sure you want to resolve this ticket and send the response?',
            type: 'confirm',
            buttons: [
                { text: 'Cancel', onPress: hideAlert },
                {
                    text: 'Resolve',
                    onPress: async () => {
                        hideAlert();
                        setSending(true);
                        try {
                            await updateDoc(doc(firestore, 'support_tickets', selectedTicket.id), {
                                status: 'resolved',
                                admin_response: response,
                                resolved_at: serverTimestamp(),
                            });

                            // Notify User (Fire and Forget)
                            const { notificationService } = require('../../services/notificationService');
                            notificationService.sendNotificationWithRetry(
                                selectedTicket.user_id,
                                "Ticket Resolved!",
                                `Your support ticket about "${selectedTicket.subject || 'Technical Support'}" has been resolved.`,
                                { type: 'support', ticket_id: selectedTicket.id }
                            );

                            showAlert({ title: 'Success', message: 'Response sent and ticket resolved', type: 'success', buttons: [{ text: 'OK', onPress: hideAlert }] });
                            setSelectedTicket(null);
                            setResponse('');
                        } catch (error) {
                            console.error('Error sending response:', error);
                            showAlert({ title: 'Error', message: 'Failed to send response', type: 'error', buttons: [{ text: 'OK', onPress: hideAlert }] });
                        } finally {
                            setSending(false);
                        }
                    }
                }
            ]
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'open': return '#F59E0B';
            case 'in_progress': return '#3B82F6';
            case 'resolved': return '#10B981';
            case 'closed': return '#64748B';
            default: return '#F59E0B';
        }
    };

    const TicketItem = ({ item }) => {
        const fallback = resolvedInfo[item.user_id] || {};
        const village = item.village || fallback.village || 'N/A';
        const customer_id = item.customer_id || item.box_number || fallback.customer_id || 'N/A';
        const service_type = item.service_type || fallback.service_type || 'GENERAL';

        return (
            <TouchableOpacity
                style={[styles.supportCard, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight, padding: 18 }]}
                onPress={() => setSelectedTicket(item)}
            >
                <View style={styles.ticketMain}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                            <Text style={[styles.ticketSubject, { color: themeColors.textPrimary }]} numberOfLines={1}>
                                {item.subject || 'Technical Support'}
                            </Text>
                            {/* Status Badge - Next to Subject */}
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                    {item.status?.toUpperCase()}
                                </Text>
                            </View>
                        </View>

                        {/* Service Type Badge - Top Right */}
                        <View style={[styles.typeBadgeContainer, { backgroundColor: '#2563EB15' }]}>
                            <Text style={[styles.typeBadgeText, { color: '#2563EB' }]}>
                                {service_type.replace(/_/g, ' ').toUpperCase()}
                            </Text>
                        </View>
                    </View>
                    <Text style={[styles.customerInfo, { color: themeColors.textSubtle }]}>
                        {item.user_name} • ID: {customer_id}
                    </Text>
                </View>

                <View style={[styles.messagePreview, { backgroundColor: themeColors.background }]}>
                    <Ionicons name="chatbubble-outline" size={14} color={themeColors.textSubtle} />
                    <Text style={[styles.previewText, { color: themeColors.textSecondary }]} numberOfLines={1}>
                        {item.last_message || item.message || item.description || 'No message preview'}
                    </Text>
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.metaBox}>
                        <Ionicons name="time-outline" size={12} color={themeColors.textSubtle} />
                        <Text style={[styles.metaText, { color: themeColors.textSubtle }]}>
                            {item.created_at?.toDate ? new Date(item.created_at.toDate()).toLocaleDateString() : 'Today'}
                        </Text>
                    </View>
                    <View style={styles.metaBox}>
                        <Ionicons name="location-outline" size={12} color={themeColors.textSubtle} />
                        <Text style={[styles.metaText, { color: themeColors.textSubtle }]}>{village}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={themeColors.textSubtle} style={{ marginLeft: 'auto' }} />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <View style={[styles.header, { backgroundColor: themeColors.background, borderBottomColor: themeColors.borderLight }]}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu" size={26} color={themeColors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Support Desk</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color={themeColors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={tickets}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => <TicketItem item={item} />}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={[themeColors.primary]}
                                tintColor={themeColors.primary}
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <View style={[styles.emptyIconBox, { backgroundColor: '#F59E0B15' }]}>
                                    <Ionicons name="happy-outline" size={48} color="#F59E0B" />
                                </View>
                                <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>Inbox Clear!</Text>
                                <Text style={[styles.emptySubtitle, { color: themeColors.textSubtle }]}>
                                    All customer support tickets have been resolved.
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>

            <Modal
                visible={!!selectedTicket}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedTicket(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Ticket Details</Text>
                            <TouchableOpacity onPress={() => setSelectedTicket(null)}>
                                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {selectedTicket && (() => {
                            const fallback = resolvedInfo[selectedTicket.user_id] || {};
                            const village = selectedTicket.village || fallback.village || 'N/A';
                            const customer_id = selectedTicket.customer_id || selectedTicket.box_number || fallback.customer_id || 'N/A';
                            const service_type = selectedTicket.service_type || fallback.service_type || 'GENERAL';

                            return (
                                <FlatList
                                    data={[]}
                                    ListHeaderComponent={
                                        <>
                                            <View style={[styles.ticketDetails, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                                                <Text style={[styles.detailLabel, { color: themeColors.textSubtle }]}>Subject</Text>
                                                <Text style={[styles.detailValue, { color: themeColors.textPrimary, marginBottom: 12 }]}>
                                                    {selectedTicket.subject || 'Support Request'}
                                                </Text>

                                                <View style={{ flexDirection: 'row', gap: 20, marginBottom: 12 }}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.detailLabel, { color: themeColors.textSubtle }]}>ID</Text>
                                                        <Text style={[styles.detailValue, { color: themeColors.textPrimary }]}>{customer_id}</Text>
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.detailLabel, { color: themeColors.textSubtle }]}>Service</Text>
                                                        <Text style={[styles.detailValue, { color: themeColors.textPrimary }]}>{service_type.replace(/_/g, ' ').toUpperCase()}</Text>
                                                    </View>
                                                </View>

                                                <Text style={[styles.detailLabel, { color: themeColors.textSubtle }]}>Village</Text>
                                                <Text style={[styles.detailValue, { color: themeColors.textPrimary, marginBottom: 12 }]}>{village}</Text>

                                                <Text style={[styles.detailLabel, { color: themeColors.textSubtle }]}>Message</Text>
                                                <Text style={[styles.detailValue, { color: themeColors.textSecondary }]}>
                                                    {selectedTicket.message || selectedTicket.description || 'No message'}
                                                </Text>
                                            </View>

                                            {selectedTicket.status !== 'resolved' ? (
                                                <View style={styles.responseSection}>
                                                    <Text style={[styles.responseLabel, { color: themeColors.textPrimary }]}>Your Action</Text>
                                                    <TextInput
                                                        style={[styles.responseInput, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight, color: themeColors.textPrimary }]}
                                                        placeholder="Type resolution notes here..."
                                                        placeholderTextColor={themeColors.textSubtle}
                                                        value={response}
                                                        onChangeText={setResponse}
                                                        multiline
                                                        numberOfLines={4}
                                                        textAlignVertical="top"
                                                    />
                                                    <TouchableOpacity
                                                        style={[styles.sendButton, { backgroundColor: themeColors.primary }]}
                                                        onPress={handleRespond}
                                                        disabled={sending}
                                                    >
                                                        {sending ? (
                                                            <ActivityIndicator color="#FFF" />
                                                        ) : (
                                                            <>
                                                                <Ionicons name="checkmark-done" size={20} color="#FFF" />
                                                                <Text style={styles.sendButtonText}>Resolve Ticket</Text>
                                                            </>
                                                        )}
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <View style={[styles.resolvedBox, { backgroundColor: themeColors.success + '15' }]}>
                                                    <Ionicons name="checkmark-circle" size={24} color={themeColors.success} />
                                                    <Text style={[styles.resolvedText, { color: themeColors.success }]}>Ticket Resolved</Text>
                                                    {selectedTicket.admin_response && (
                                                        <Text style={[styles.adminNote, { color: themeColors.textSecondary }]}>
                                                            Note: {selectedTicket.admin_response}
                                                        </Text>
                                                    )}
                                                </View>
                                            )}
                                        </>
                                    }
                                    showsVerticalScrollIndicator={false}
                                />
                            );
                        })()}
                    </View>
                </View>
            </Modal>
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
        height: 60,
        borderBottomWidth: 1,
    },
    menuButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    content: { flex: 1 },
    listContent: { padding: 20 },
    supportCard: {
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusIndicator: {
        width: 4,
        height: 32,
        borderRadius: 2,
        marginRight: 12,
    },
    ticketMain: { flex: 1 },
    ticketSubject: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    customerInfo: { fontSize: 12, fontWeight: '600' },
    statusBadge: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusText: { fontSize: 9, fontWeight: '800' },
    typeBadgeContainer: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
    },
    typeBadgeText: { fontSize: 9, fontWeight: '800' },
    messagePreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 14,
        marginBottom: 12,
    },
    previewText: { fontSize: 13, fontWeight: '500', flex: 1 },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    metaBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: { fontSize: 11, fontWeight: '600' },
    emptyState: {
        alignItems: 'center',
        marginTop: '30%',
        paddingHorizontal: 40,
    },
    emptyIconBox: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
    emptySubtitle: { fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 22 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: { fontSize: 20, fontWeight: '800' },
    ticketDetails: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1,
    },
    detailLabel: { fontSize: 10, fontWeight: '800', marginBottom: 6, letterSpacing: 0.5 },
    detailValue: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
    responseSection: { marginBottom: 20 },
    responseLabel: { fontSize: 14, fontWeight: '800', marginBottom: 12 },
    responseInput: {
        borderRadius: 16,
        borderWidth: 1.5,
        padding: 16,
        fontSize: 15,
        fontWeight: '600',
        minHeight: 120,
        marginBottom: 20,
    },
    sendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 10,
    },
    sendButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    resolvedBox: {
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
    },
    resolvedText: { fontSize: 17, fontWeight: '800', marginTop: 10, marginBottom: 8 },
    adminNote: { fontSize: 14, fontWeight: '600', textAlign: 'center', opacity: 0.8 },
});

export default SupportTicketsScreen;