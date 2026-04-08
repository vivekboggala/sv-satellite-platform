import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

const NotificationCard = ({ type, title, body, timestamp, isRead, onDelete }) => {
    const getIconProps = () => {
        switch (type) {
            case 'success': return { icon: 'check-circle', color: colors.success, bg: colors.greenOverlay };
            case 'warning': return { icon: 'warning', color: colors.warning, bg: colors.orangeOverlay };
            case 'error': return { icon: 'error', color: colors.error, bg: colors.redOverlay };
            default: return { icon: 'info', color: colors.primary, bg: colors.blueOverlay };
        }
    };

    const iconProps = getIconProps();

    return (
        <View style={styles.card}>
            <View style={[styles.iconCircle, { backgroundColor: iconProps.bg }]}>
                <MaterialIcons name={iconProps.icon} size={24} color={iconProps.color} />
            </View>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                    <TouchableOpacity onPress={onDelete}>
                        <MaterialIcons name="delete-outline" size={20} color={colors.textSubtle} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.body} numberOfLines={2}>{body}</Text>
                <View style={styles.footer}>
                    <Text style={styles.timestamp}>{timestamp}</Text>
                    {!isRead && <View style={styles.unreadDot} />}
                </View>
            </View>
        </View>
    );
};

export default NotificationCard;

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.medium,
        padding: spacing.md,
        flexDirection: 'row',
        marginBottom: spacing.md,
        ...shadows.small,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: typography.sizes.body,
        fontWeight: typography.weights.bold,
        color: colors.textPrimary,
    },
    body: {
        fontSize: typography.sizes.bodySmall,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: spacing.sm,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timestamp: {
        fontSize: typography.sizes.tiny,
        color: colors.textSubtle,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
    },
});
