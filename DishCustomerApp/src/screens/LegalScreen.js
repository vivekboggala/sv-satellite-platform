import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

const LegalScreen = ({ navigation, route }) => {
    const { themeColors, isDark } = useTheme();
    const { t } = useLanguage();
    const { title, type } = route.params || { title: 'Legal', type: 'terms' };

    const getContent = () => {
        if (type === 'privacy') {
            return (
                <>
                    <Text style={[styles.sectionHeader, { color: themeColors.primary }]}>1. Data Collection</Text>
                    <Text style={[styles.text, { color: themeColors.textSecondary }]}>
                        We collect information necessary to provide our ISP services, including your name, address, contact details, and usage data.
                    </Text>

                    <Text style={[styles.sectionHeader, { color: themeColors.primary }]}>2. Usage of Information</Text>
                    <Text style={[styles.text, { color: themeColors.textSecondary }]}>
                        Your data is used for billing, service provision, technical support, and improving our network quality. We do not sell your personal data to third parties.
                    </Text>

                    <Text style={[styles.sectionHeader, { color: themeColors.primary }]}>3. Data Security</Text>
                    <Text style={[styles.text, { color: themeColors.textSecondary }]}>
                        We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, or disclosure.
                    </Text>
                </>
            );
        }
        return (
            <>
                <Text style={[styles.sectionHeader, { color: themeColors.primary }]}>1. Service Agreement</Text>
                <Text style={[styles.text, { color: themeColors.textSecondary }]}>
                    ByType agreeing to these terms, you agree to pay for the internet services provided by Dish Fiber according to the plan selected.
                </Text>

                <Text style={[styles.sectionHeader, { color: themeColors.primary }]}>2. Usage Policy</Text>
                <Text style={[styles.text, { color: themeColors.textSecondary }]}>
                    Users must not use the service for any illegal activities. Fair usage policy applies to "unlimited" plans to ensure network quality for all users.
                </Text>

                <Text style={[styles.sectionHeader, { color: themeColors.primary }]}>3. Payment & Billing</Text>
                <Text style={[styles.text, { color: themeColors.textSecondary }]}>
                    Bills generate on the 1st of every month. Service may be suspended if payment is not received by the 7th. A reconnection fee may apply.
                </Text>
            </>
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
                        <Text style={styles.headerTitle}>{title}</Text>
                        <View style={{ width: 44 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scrollArea} showsVerticalScrollIndicator={false}>
                <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                    <View style={styles.topDeco}>
                        <View style={[styles.decoLine, { backgroundColor: themeColors.primary + '30' }]} />
                    </View>

                    {getContent()}

                    <View style={[styles.footer, { borderTopColor: themeColors.borderLight }]}>
                        <Text style={[styles.footerText, { color: themeColors.textSubtle }]}>Last Updated: Feb 2026</Text>
                        <Text style={[styles.footerText, { color: themeColors.primary }]}>Dish Fiber Legal Compliance</Text>
                    </View>
                </View>
            </ScrollView>
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
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#FFF' },
    scrollArea: { padding: 20 },
    card: {
        borderRadius: 30,
        padding: 30,
        borderWidth: 1.5,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    topDeco: { alignItems: 'center', marginBottom: 20 },
    decoLine: { width: 40, height: 5, borderRadius: 3 },
    sectionHeader: { fontSize: 16, fontWeight: '900', marginBottom: 12, marginTop: 20 },
    text: { fontSize: 14, lineHeight: 26, fontWeight: '600', marginBottom: 16 },
    footer: { marginTop: 40, borderTopWidth: 1.5, paddingTop: 24, alignItems: 'center' },
    footerText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 }
});

export default LegalScreen;
