import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

const ActionButton = ({
    text,
    onPress,
    variant = 'primary',
    loading = false,
    icon,
    style,
    disabled = false
}) => {
    const isOutline = variant === 'outline';

    const getColors = () => {
        switch (variant) {
            case 'success': return [colors.teal, colors.successDark];
            case 'danger': return [colors.error, '#B91C1C'];
            default: return [colors.primary, colors.primaryDark];
        }
    };

    const Content = () => (
        <View style={styles.content}>
            {loading ? (
                <ActivityIndicator color={isOutline ? colors.primary : colors.white} />
            ) : (
                <>
                    <Text style={[
                        styles.text,
                        isOutline && { color: colors.primary }
                    ]}>
                        {text}
                    </Text>
                    {icon && (
                        <MaterialIcons
                            name={icon}
                            size={20}
                            color={isOutline ? colors.primary : colors.white}
                            style={styles.icon}
                        />
                    )}
                </>
            )}
        </View>
    );

    if (isOutline) {
        return (
            <TouchableOpacity
                style={[styles.button, styles.outline, style]}
                onPress={onPress}
                disabled={loading || disabled}
            >
                <Content />
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={[styles.button, style]}
            onPress={onPress}
            disabled={loading || disabled}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={getColors()}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradient}
            >
                <Content />
            </LinearGradient>
        </TouchableOpacity>
    );
};

export default ActionButton;

const styles = StyleSheet.create({
    button: {
        borderRadius: borderRadius.medium,
        overflow: 'hidden',
        height: 56,
        justifyContent: 'center',
        marginVertical: spacing.sm,
        ...shadows.medium,
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.primary,
        alignItems: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: colors.white,
        fontSize: typography.sizes.bodyLarge,
        fontWeight: typography.weights.bold,
    },
    icon: {
        marginLeft: spacing.sm,
    },
});
