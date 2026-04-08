import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

const DurationCard = ({ months, price, freeMonths, isSelected, onSelect }) => {
    return (
        <TouchableOpacity
            style={[
                styles.card,
                isSelected && styles.selectedCard
            ]}
            onPress={onSelect}
            activeOpacity={0.8}
        >
            {isSelected ? (
                <LinearGradient
                    colors={['#3B82F610', '#3B82F605']}
                    style={styles.gradient}
                >
                    <Content months={months} price={price} freeMonths={freeMonths} isSelected={isSelected} />
                </LinearGradient>
            ) : (
                <Content months={months} price={price} freeMonths={freeMonths} isSelected={isSelected} />
            )}

            {freeMonths > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>+{freeMonths} MONTH FREE</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const Content = ({ months, price, isSelected }) => (
    <View style={styles.container}>
        <Text style={[styles.months, isSelected && styles.selectedText]}>
            {months} {months === 1 ? 'Month' : 'Months'}
        </Text>
        <Text style={[styles.price, isSelected && styles.selectedPrice]}>
            ₹{price} Total
        </Text>
    </View>
);

export default DurationCard;

const styles = StyleSheet.create({
    card: {
        width: '47%',
        minHeight: 120,
        backgroundColor: colors.white,
        borderRadius: borderRadius.medium,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: spacing.md,
        overflow: 'hidden',
        justifyContent: 'center',
        ...shadows.small,
    },
    selectedCard: {
        borderColor: colors.primary,
        borderWidth: 2,
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
    },
    container: {
        padding: spacing.md,
        alignItems: 'center',
    },
    months: {
        fontSize: typography.sizes.bodyLarge,
        fontWeight: typography.weights.bold,
        color: colors.textPrimary,
        marginBottom: 4,
    },
    price: {
        fontSize: typography.sizes.bodySmall,
        color: colors.textSecondary,
    },
    selectedText: {
        color: colors.primary,
    },
    selectedPrice: {
        color: colors.primaryDark,
        fontWeight: typography.weights.semibold,
    },
    badge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: colors.success,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: borderRadius.small,
    },
    badgeText: {
        color: colors.white,
        fontSize: 9,
        fontWeight: typography.weights.black,
    },
});
