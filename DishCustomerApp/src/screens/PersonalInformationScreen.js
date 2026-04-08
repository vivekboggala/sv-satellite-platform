import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { auth, firestore } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

const PersonalInformationScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const userDoc = await getDoc(doc(firestore, 'users', user.uid));
                if (userDoc.exists()) {
                    setUserData(userDoc.data());
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoading(false);
        }
    };

    const InfoBlock = ({ icon, label, value }) => (
        <View style={[styles.infoBlock, { backgroundColor: themeColors.card }]}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#FFF1' : '#F1F5F9' }]}>
                <Feather name={icon} size={20} color={themeColors.primary} />
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.infoLabel, { color: themeColors.textSubtle }]}>{label}</Text>
                <Text style={[styles.infoValue, { color: themeColors.textPrimary }]}>{value || 'Not provided'}</Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
                <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            {/* UNIFIED MESH BACKGROUND - FIXED */}
            <View style={styles.meshContainer}>
                <LinearGradient
                    colors={isDark ? ['#1E293B', '#0F172A'] : ['#F8FAFC', '#E2E8F0']}
                    style={StyleSheet.absoluteFill}
                />
                <View style={[styles.meshSpot1, { backgroundColor: themeColors.primary + '15' }]} />
                <View style={[styles.meshSpot2, { backgroundColor: '#8B5CF610' }]} />
            </View>

            <SafeAreaView edges={['top']} style={[styles.topNav, { backgroundColor: isDark ? themeColors.background : '#FFF' }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                        <MaterialIcons name="arrow-back" size={24} color={themeColors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.pageTitle, { color: themeColors.textPrimary }]}>Personal Info</Text>
                    <View style={{ width: 44 }} />
                </View>
            </SafeAreaView>
            <View style={[styles.headerShadow, { backgroundColor: isDark ? '#0002' : '#00000005' }]} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>

                <View style={styles.content}>
                    <View style={styles.headerSection}>
                        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Account Identity</Text>
                        <Text style={[styles.sectionDesc, { color: themeColors.textSubtle }]}>Verified details linked to your service subscription.</Text>
                    </View>

                    <InfoBlock icon="user" label="FULL NAME" value={userData?.name} />
                    <InfoBlock icon="phone" label="MOBILE NUMBER" value={userData?.mobile} />

                    <View style={styles.divider} />

                    <View style={styles.headerSection}>
                        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Location & Service</Text>
                    </View>

                    <InfoBlock icon="map-pin" label="VILLAGE / AREA" value={userData?.village} />
                    <InfoBlock icon="home" label="FULL ADDRESS" value={userData?.address} />
                    <InfoBlock icon="box" label="SERVICE IDENTIFIER" value={userData?.box_number} />
                    <InfoBlock icon="activity" label="PROVIDER TYPE" value={userData?.service_type} />

                    <View style={[styles.noticeBox, { backgroundColor: isDark ? '#3B82F615' : '#E0E7FF' }]}>
                        <Ionicons name="information-circle-outline" size={20} color={themeColors.primary} />
                        <Text style={[styles.noticeText, { color: themeColors.textPrimary }]}>
                            Contact support if you need to update restricted information like your mobile number or service address.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    meshContainer: { ...StyleSheet.absoluteFillObject, height: 400, overflow: 'hidden' },
    meshSpot1: { position: 'absolute', top: -100, left: -50, width: 300, height: 300, borderRadius: 150 },
    meshSpot2: { position: 'absolute', top: 50, right: -100, width: 350, height: 350, borderRadius: 175 },

    scrollContainer: { paddingBottom: 60 },
    topNav: { zIndex: 100 },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 60,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    pageTitle: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    headerShadow: { height: 1, width: '100%', zIndex: 100 },

    content: { padding: 24 },
    headerSection: { marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
    sectionDesc: { fontSize: 12, fontWeight: '600', marginBottom: 12 },

    infoBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 24,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5
    },
    iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    textContainer: { flex: 1 },
    infoLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
    infoValue: { fontSize: 15, fontWeight: '700' },

    divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 24 },

    noticeBox: { flexDirection: 'row', padding: 16, borderRadius: 20, gap: 12, marginTop: 24, alignItems: 'center' },
    noticeText: { flex: 1, fontSize: 11, fontWeight: '600', lineHeight: 16 }
});

export default PersonalInformationScreen;
