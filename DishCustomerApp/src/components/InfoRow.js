import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';

const InfoRow = ({ icon, label, value, showDot, dotColor }) => {
    return (
        <View style={styles.container}>
            <View style={[styles.iconBox, { backgroundColor: colors.blueOverlay }]}>
                <MaterialIcons name={icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.content}>
                <Text style={styles.label}>{label}</Text>
                <View style={styles.valueRow}>
                    <Text style={styles.value}>{value}</Text>
                    {showDot && (
                        <View style={[styles.dot, { backgroundColor: dotColor }]} />
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        paddingBottom: spacing.md,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.medium,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    content: { flex: 1 },
    label: {
        fontSize: typography.sizes.label,
        color: colors.textSecondary,
        fontWeight: typography.weights.semibold,
        marginBottom: 2,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    value: {
        fontSize: typography.sizes.body,
        fontWeight: typography.weights.bold,
        color: colors.textPrimary,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginLeft: 8,
    },
});

export default InfoRow;
