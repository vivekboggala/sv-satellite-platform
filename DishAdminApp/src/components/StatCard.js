import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

const StatCard = ({ icon, iconColor, label, value, onPress }) => {
    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.topRow}>
                <View style={[styles.iconContainer, { backgroundColor: `${iconColor}10` }]}>
                    <MaterialIcons name={icon} size={24} color={iconColor} />
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.textSubtle} />
            </View>
            <View style={styles.content}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value}</Text>
            </View>
        </TouchableOpacity>
    );
};

export default StatCard;

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.large,
        padding: spacing.lg,
        width: '47%',
        minHeight: 120,
        marginBottom: spacing.md,
        ...shadows.medium,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.small,
        justifyContent: 'center',
        alignItems: 'center',
    },
    label: {
        fontSize: typography.sizes.tiny,
        color: colors.textSecondary,
        fontWeight: typography.weights.bold,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: spacing.xs,
    },
    value: {
        fontSize: typography.sizes.display,
        color: colors.textPrimary,
        fontWeight: typography.weights.black,
    },
});
