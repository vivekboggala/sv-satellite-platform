import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, firestore } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

const ChatScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const { t } = useLanguage();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const flatListRef = useRef();

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const chatRoomRef = doc(firestore, "chat_rooms", user.uid);
        const messagesRef = collection(chatRoomRef, "messages");
        const q = query(messagesRef, orderBy("timestamp", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = [];
            snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
            setLoading(false);
        });

        const fetchUserData = async () => {
            try {
                const uDoc = await getDoc(doc(firestore, "users", user.uid));
                if (uDoc.exists()) setUserData(uDoc.data());
            } catch (err) { console.log("User fetch error:", err); }
        };

        fetchUserData();
        return () => unsubscribe();
    }, []);

    const sendMessage = async () => {
        if (input.trim() === '') return;

        const user = auth.currentUser;
        const chatRoomRef = doc(firestore, "chat_rooms", user.uid);
        const messagesRef = collection(chatRoomRef, "messages");

        const msgContent = input.trim();
        setInput('');

        try {
            const userName = userData?.name || user.displayName || 'Subscriber';
            await setDoc(chatRoomRef, {
                last_message: msgContent,
                last_timestamp: serverTimestamp(),
                user_id: user.uid,
                user_name: userName,
                unread_count_admin: 1
            }, { merge: true });

            await addDoc(messagesRef, {
                text: msgContent,
                sender_id: user.uid,
                sender_type: 'customer',
                timestamp: serverTimestamp(),
            });
        } catch (error) {
            console.log("Send message error:", error);
        }
    };

    const renderMessage = ({ item }) => {
        const isMe = item.sender_type === 'customer';
        return (
            <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
                {!isMe && (
                    <View style={[styles.avatar, { backgroundColor: themeColors.primary + '20' }]}>
                        <Ionicons name="headset" size={14} color={themeColors.primary} />
                    </View>
                )}
                <View style={[
                    styles.bubble,
                    isMe ?
                        { backgroundColor: themeColors.primary, borderBottomRightRadius: 4 } :
                        { backgroundColor: themeColors.card, borderBottomLeftRadius: 4, borderColor: themeColors.borderLight, borderWidth: 1 }
                ]}>
                    <Text style={[styles.messageText, isMe ? { color: '#FFF' } : { color: themeColors.textPrimary }]}>
                        {item.text}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <StatusBar style="light" />

            <LinearGradient
                colors={[themeColors.primary, themeColors.primaryDark]}
                style={styles.headerArea}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <SafeAreaView edges={['top']}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                            <MaterialIcons name="chevron-left" size={32} color="#FFF" />
                        </TouchableOpacity>
                        <View style={styles.headerInfo}>
                            <Text style={styles.headerTitle}>{t('chat_support')}</Text>
                            <View style={styles.statusRow}>
                                <View style={styles.onlineDot} />
                                <Text style={styles.headerStatus}>Live Support</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.headerBtn}>
                            <Ionicons name="call-outline" size={22} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <View style={styles.flexOne}>
                {loading ? (
                    <View style={styles.loader}>
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
                        showsVerticalScrollIndicator={false}
                    />
                )}

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <View style={[styles.inputArea, { backgroundColor: themeColors.card, borderTopColor: themeColors.borderLight }]}>
                        <View style={[styles.inputWrapper, { backgroundColor: themeColors.background, borderColor: themeColors.borderLight }]}>
                            <TextInput
                                style={[styles.textInput, { color: themeColors.textPrimary }]}
                                placeholder="Write a message..."
                                placeholderTextColor={themeColors.textSubtle}
                                value={input}
                                onChangeText={setInput}
                                multiline
                            />
                            <TouchableOpacity style={styles.attachBtn}>
                                <Ionicons name="attach" size={24} color={themeColors.textSubtle} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={sendMessage}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[themeColors.primary, themeColors.primaryDark]}
                                style={styles.sendBtn}
                            >
                                <Ionicons name="send" size={20} color="white" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerArea: {
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        paddingBottom: 15,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        height: 70,
    },
    headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerInfo: { alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#FFF' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
    headerStatus: { fontSize: 11, color: '#FFF', fontWeight: '800', opacity: 0.9 },
    flexOne: { flex: 1 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 20, paddingBottom: 10 },
    messageRow: { marginBottom: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
    myMessageRow: { justifyContent: 'flex-end' },
    otherMessageRow: { justifyContent: 'flex-start' },
    avatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
    bubble: { maxWidth: '75%', padding: 14, borderRadius: 20 },
    messageText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
    inputArea: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: Platform.OS === 'ios' ? 35 : 12,
        borderTopWidth: 1.5,
        gap: 12,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderWidth: 1.5,
    },
    textInput: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        fontSize: 14,
        fontWeight: '600',
        paddingVertical: 10,
    },
    attachBtn: { padding: 4 },
    sendBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
});

export default ChatScreen;
