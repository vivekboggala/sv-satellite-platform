import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

/**
 * CustomAlert - A themed alert dialog component.
 *
 * @param {boolean} visible - Whether the alert is visible
 * @param {string} title - Alert title
 * @param {string} message - Alert message body
 * @param {string} type - 'success' | 'error' | 'warning' | 'info' | 'confirm' | 'destructive'
 * @param {Array} buttons - Array of { text, onPress, style? } objects (max 2)
 * @param {function} onDismiss - Called when overlay is tapped (optional)
 */
const CustomAlert = ({ visible, title, message, type = 'info', buttons = [], onDismiss }) => {
    const { themeColors, isDark } = useTheme();

    const typeConfig = {
        success: { icon: 'checkmark-circle', color: '#10B981', bg: '#10B98115' },
        error: { icon: 'close-circle', color: '#EF4444', bg: '#EF444415' },
        warning: { icon: 'warning', color: '#F59E0B', bg: '#F59E0B15' },
        info: { icon: 'information-circle', color: '#3B82F6', bg: '#3B82F615' },
        confirm: { icon: 'help-circle', color: '#6366F1', bg: '#6366F115' },
        destructive: { icon: 'alert-circle', color: '#EF4444', bg: '#EF444415' },
    };

    const config = typeConfig[type] || typeConfig.info;

    const resolvedButtons = buttons.length > 0 ? buttons : [{ text: 'OK', onPress: onDismiss }];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onDismiss}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onDismiss}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    style={[styles.container, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
                >
                    {/* Icon */}
                    <View style={[styles.iconCircle, { backgroundColor: config.bg }]}>
                        <Ionicons name={config.icon} size={36} color={config.color} />
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                        {title}
                    </Text>

                    {/* Message */}
                    <Text style={[styles.message, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                        {message}
                    </Text>

                    {/* Buttons */}
                    <View style={[styles.buttonRow, resolvedButtons.length === 1 && styles.singleButtonRow]}>
                        {resolvedButtons.map((btn, idx) => {
                            const isLast = idx === resolvedButtons.length - 1;
                            const isPrimary = resolvedButtons.length === 1 || isLast;
                            const isDestructive = btn.style === 'destructive' || (type === 'destructive' && isPrimary);

                            let btnBg, btnTextColor, btnBorderColor;

                            if (isPrimary) {
                                if (isDestructive) {
                                    btnBg = '#EF4444';
                                    btnTextColor = '#FFF';
                                    btnBorderColor = '#EF4444';
                                } else {
                                    btnBg = config.color;
                                    btnTextColor = '#FFF';
                                    btnBorderColor = config.color;
                                }
                            } else {
                                // Secondary / cancel button
                                btnBg = 'transparent';
                                btnTextColor = isDark ? '#94A3B8' : '#64748B';
                                btnBorderColor = isDark ? '#334155' : '#E2E8F0';
                            }

                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        styles.button,
                                        {
                                            backgroundColor: btnBg,
                                            borderColor: btnBorderColor,
                                            borderWidth: isPrimary ? 0 : 1.5,
                                            flex: resolvedButtons.length > 1 ? 1 : undefined,
                                            width: resolvedButtons.length === 1 ? '100%' : undefined,
                                        }
                                    ]}
                                    onPress={btn.onPress}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.buttonText, { color: btnTextColor }]}>
                                        {btn.text}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    container: {
        width: width - 60,
        borderRadius: 28,
        paddingTop: 32,
        paddingBottom: 24,
        paddingHorizontal: 24,
        alignItems: 'center',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 10,
        letterSpacing: 0.2,
    },
    message: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
        paddingHorizontal: 4,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    singleButtonRow: {
        justifyContent: 'center',
    },
    button: {
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
});

export default CustomAlert;
