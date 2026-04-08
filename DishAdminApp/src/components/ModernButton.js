import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const ModernButton = ({
    title,
    onPress,
    variant = 'primary', // primary, success, danger, secondary
    icon,
    loading = false,
    disabled = false,
    style
}) => {
    const gradients = {
        primary: ['#6366F1', '#4F46E5'],
        success: ['#10B981', '#059669'],
        danger: ['#EF4444', '#DC2626'],
        secondary: ['#6B7280', '#4B5563'],
    };

    return (
        <TouchableOpacity
            style={[styles.button, disabled && styles.disabled, style]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            <LinearGradient colors={gradients[variant]} style={styles.gradient}>
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <View style={styles.content}>
                        {icon && <Ionicons name={icon} size={20} color="white" />}
                        <Text style={styles.text}>{title}</Text>
                    </View>
                )}
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    gradient: {
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    text: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    disabled: {
        opacity: 0.5,
    },
});

export default ModernButton;
