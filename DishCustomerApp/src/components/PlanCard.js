import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const PlanCard = ({ name, price, features = [], onSelect }) => {
    const { themeColors, isDark } = useTheme();

    return (
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
            <View style={styles.cardHeader}>
                <View style={styles.titleBox}>
                    <Text style={[styles.name, { color: themeColors.textPrimary }]}>{name}</Text>
                    <Text style={[styles.billingCycle, { color: themeColors.textSubtle }]}>Standard Billing Cycle</Text>
                </View>
                <View style={styles.priceBadge}>
                    <LinearGradient
                        colors={['#6366F1', '#4F46E5']}
                        style={styles.priceGradient}
                    >
                        <Text style={styles.priceText}>₹{price} / PM</Text>
                    </LinearGradient>
                </View>
            </View>

            <View style={styles.featureList}>
                {features.map((feature, idx) => (
                    <View key={idx} style={styles.featureItem}>
                        <View style={[styles.checkCircle, { backgroundColor: '#4ADE8020' }]}>
                            <Ionicons name="checkmark" size={12} color="#4ADE80" />
                        </View>
                        <Text style={[styles.featureText, { color: themeColors.textPrimary }]}>{feature}</Text>
                    </View>
                ))}
            </View>

            <TouchableOpacity style={styles.selectBtn} onPress={onSelect}>
                <View style={[styles.selectBadge, { backgroundColor: '#4ADE8020' }]}>
                    <Text style={styles.selectBtnText}>SELECT PLAN</Text>
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 32,
        padding: 24,
        marginBottom: 20,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)'
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    titleBox: { flex: 1 },
    name: { fontSize: 20, fontWeight: '900', marginBottom: 4 },
    billingCycle: { fontSize: 11, fontWeight: '600' },
    priceBadge: { borderRadius: 12, overflow: 'hidden' },
    priceGradient: { paddingHorizontal: 16, paddingVertical: 8, justifyContent: 'center', alignItems: 'center' },
    priceText: { color: '#FFF', fontSize: 13, fontWeight: '900' },

    featureList: { gap: 12, marginBottom: 24 },
    featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    checkCircle: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
    featureText: { fontSize: 13, fontWeight: '700' },

    selectBtn: { alignSelf: 'flex-start' },
    selectBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    selectBtnText: { color: '#4ADE80', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
});

export default PlanCard;
