import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

const ActionButton = ({ text, icon, variant = 'primary', onPress }) => {
    if (variant === 'outline') {
        return (
            <TouchableOpacity style={styles.outlineBtn} onPress={onPress} activeOpacity={0.7}>
                <Text style={styles.outlineText}>{text}</Text>
            </TouchableOpacity>
        );
    }

    const gradientColors = variant === 'success'
        ? ['#14B8A6', '#0D9488']
        : ['#3B82F6', '#2563EB'];

    return (
        <TouchableOpacity style={[styles.button, shadows.small]} onPress={onPress} activeOpacity={0.8}>
            <LinearGradient colors={gradientColors} style={styles.gradient}>
                {icon && <MaterialIcons name={icon} size={20} color={colors.white} />}
                <Text style={styles.text}>{text}</Text>
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: borderRadius.medium,
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    gradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 10,
    },
    text: {
        color: colors.white,
        fontSize: typography.sizes.body,
        fontWeight: typography.weights.bold,
    },
    outlineBtn: {
        borderWidth: 2,
        borderColor: colors.primary,
        borderRadius: borderRadius.medium,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    outlineText: {
        color: colors.primary,
        fontSize: typography.sizes.body,
        fontWeight: typography.weights.bold,
    },
});

export default ActionButton;
