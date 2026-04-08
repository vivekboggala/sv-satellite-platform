import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { firestore } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const AdminChatListScreen = ({ navigation }) => {
    const { themeColors } = useTheme();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(firestore, "chat_rooms"), orderBy("last_timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = [];
            snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
            setRooms(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const ChatRoomItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.roomItem, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
            onPress={() => navigation.navigate('AdminChatDetail', { roomId: item.id, userName: item.user_name })}
        >
            <View style={[styles.avatar, { backgroundColor: themeColors.primary + '15' }]}>
                <Text style={[styles.avatarText, { color: themeColors.primary }]}>
                    {item.user_name?.charAt(0) || 'U'}
                </Text>
            </View>
            <View style={styles.roomInfo}>
                <View style={styles.roomHeader}>
                    <Text style={[styles.userName, { color: themeColors.textPrimary }]}>{item.user_name}</Text>
                    <Text style={[styles.timeStamp, { color: themeColors.textSubtle }]}>
                        {item.last_timestamp ? new Date(item.last_timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                </View>
                <Text style={[styles.lastMsg, { color: themeColors.textSecondary }]} numberOfLines={1}>
                    {item.last_message}
                </Text>
            </View>
            {item.unread_count_admin > 0 && (
                <View style={[styles.badge, { backgroundColor: themeColors.primary }]}>
                    <Text style={styles.badgeText}>{item.unread_count_admin}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <StatusBar style="light" />
            <SafeAreaView edges={['top']} style={{ backgroundColor: themeColors.primary }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.headerBtn}>
                        <MaterialIcons name="menu" size={28} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Support Center</Text>
                    <View style={{ width: 44 }} />
                </View>
            </SafeAreaView>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={themeColors.primary} />
                </View>
            ) : (
                <FlatList
                    data={rooms}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <ChatRoomItem item={item} />}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Ionicons name="chatbubbles-outline" size={64} color={themeColors.textSubtle} />
                            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No active conversations</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 60 },
    headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 20 },
    roomItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        ...shadows.small,
    },
    avatar: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    avatarText: { fontSize: 20, fontWeight: 'bold' },
    roomInfo: { flex: 1 },
    roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    userName: { fontSize: 15, fontWeight: '800' },
    timeStamp: { fontSize: 10, fontWeight: '600' },
    lastMsg: { fontSize: 13, fontWeight: '500' },
    badge: { minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
    badgeText: { color: 'white', fontSize: 10, fontWeight: '900' },
    emptyBox: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 16, fontWeight: '700', marginTop: 16 },
});

export default AdminChatListScreen;
