import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { firestore } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const AdminChatDetailScreen = ({ navigation, route }) => {
    const { roomId, userName } = route.params;
    const { themeColors } = useTheme();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef();

    useEffect(() => {
        if (!roomId) return;

        // Reset unread count for admin
        const chatRoomRef = doc(firestore, "chat_rooms", roomId);
        updateDoc(chatRoomRef, { unread_count_admin: 0 }).catch(e => console.log("Reset count error:", e));

        const messagesRef = collection(chatRoomRef, "messages");
        const q = query(messagesRef, orderBy("timestamp", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = [];
            snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [roomId]);

    const sendMessage = async () => {
        if (input.trim() === '') return;

        const chatRoomRef = doc(firestore, "chat_rooms", roomId);
        const messagesRef = collection(chatRoomRef, "messages");

        const msgContent = input.trim();
        setInput('');

        try {
            await updateDoc(chatRoomRef, {
                last_message: msgContent,
                last_timestamp: serverTimestamp(),
            });

            await addDoc(messagesRef, {
                text: msgContent,
                sender_id: 'admin_1', // Simple admin id for demo
                sender_type: 'admin',
                timestamp: serverTimestamp(),
            });
        } catch (error) {
            console.log("Admin send message error:", error);
        }
    };

    const renderMessage = ({ item }) => {
        const isAdmin = item.sender_type === 'admin';
        return (
            <View style={[styles.messageRow, isAdmin ? styles.myMessageRow : styles.otherMessageRow]}>
                <View style={[
                    styles.bubble,
                    isAdmin ? { backgroundColor: themeColors.primary } : { backgroundColor: themeColors.card, borderColor: themeColors.border, borderWidth: 1 }
                ]}>
                    <Text style={[styles.messageText, isAdmin ? { color: 'white' } : { color: themeColors.textPrimary }]}>
                        {item.text}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <StatusBar style="light" />
            <SafeAreaView edges={['top']} style={{ backgroundColor: themeColors.primary }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                        <MaterialIcons name="arrow-back" size={28} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle}>{userName}</Text>
                        <Text style={styles.headerStatus}>Customer Support Chat</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>
            </SafeAreaView>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={themeColors.primary} />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.listContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                />
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={[styles.inputArea, { backgroundColor: themeColors.card, borderTopColor: themeColors.border }]}>
                    <TextInput
                        style={[styles.textInput, { backgroundColor: themeColors.background, color: themeColors.textPrimary }]}
                        placeholder="Reply to customer..."
                        placeholderTextColor={themeColors.textSubtle}
                        value={input}
                        onChangeText={setInput}
                        multiline
                    />
                    <TouchableOpacity style={[styles.sendBtn, { backgroundColor: themeColors.primary }]} onPress={sendMessage}>
                        <Ionicons name="send" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 60 },
    headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerInfo: { alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '800', color: '#FFF' },
    headerStatus: { fontSize: 10, color: '#FFF', opacity: 0.8, fontWeight: '700' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 20 },
    messageRow: { marginBottom: 12, flexDirection: 'row' },
    myMessageRow: { justifyContent: 'flex-end' },
    otherMessageRow: { justifyContent: 'flex-start' },
    bubble: { maxWidth: '80%', padding: 12, borderRadius: 20 },
    messageText: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
    inputArea: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingBottom: Platform.OS === 'ios' ? 30 : 12,
        borderTopWidth: 1,
    },
    textInput: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 10,
        fontSize: 14,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.small,
    },
});

export default AdminChatDetailScreen;
