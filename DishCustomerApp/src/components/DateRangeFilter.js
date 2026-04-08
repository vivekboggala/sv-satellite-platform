import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';

/**
 * Reusable Date Range Filter Component
 */
export const DateRangeFilter = ({ onDateRangeChange, onClear }) => {
    const [showPicker, setShowPicker] = useState(false);
    const [selectingStart, setSelectingStart] = useState(true);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const handleDateChange = (event, selectedDate) => {
        setShowPicker(false);
        if (selectedDate) {
            if (selectingStart) {
                setStartDate(selectedDate);
                onDateRangeChange(selectedDate, endDate);
            } else {
                setEndDate(selectedDate);
                onDateRangeChange(startDate, selectedDate);
            }
        }
    };

    const handleClear = () => {
        setStartDate(null);
        setEndDate(null);
        onClear();
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Filter by Date Range</Text>
            <View style={styles.dateRow}>
                <TouchableOpacity
                    style={styles.dateBtn}
                    onPress={() => {
                        setSelectingStart(true);
                        setShowPicker(true);
                    }}
                >
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                    <Text style={styles.dateText}>
                        {startDate ? startDate.toLocaleDateString() : 'Start Date'}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.separator}>→</Text>

                <TouchableOpacity
                    style={styles.dateBtn}
                    onPress={() => {
                        setSelectingStart(false);
                        setShowPicker(true);
                    }}
                >
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                    <Text style={styles.dateText}>
                        {endDate ? endDate.toLocaleDateString() : 'End Date'}
                    </Text>
                </TouchableOpacity>

                {(startDate || endDate) && (
                    <TouchableOpacity
                        style={styles.clearBtn}
                        onPress={handleClear}
                    >
                        <Ionicons name="close-circle" size={24} color={colors.error} />
                    </TouchableOpacity>
                )}
            </View>

            {showPicker && (
                <DateTimePicker
                    value={selectingStart ? (startDate || new Date()) : (endDate || new Date())}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: spacing.lg,
        backgroundColor: colors.card || '#FFFFFF',
        borderRadius: borderRadius.large,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight || '#E2E8F0',
    },
    label: {
        fontSize: 12,
        fontWeight: '900',
        color: colors.textSecondary || '#64748B',
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    dateBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        padding: spacing.md,
        backgroundColor: colors.background || '#F8FAFC',
        borderRadius: borderRadius.medium,
        borderWidth: 1,
        borderColor: colors.borderLight || '#E2E8F0',
    },
    dateText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textPrimary || '#1E293B',
    },
    separator: {
        fontSize: 16,
        color: colors.textSubtle || '#94A3B8',
        fontWeight: 'bold',
    },
    clearBtn: {
        padding: spacing.xs,
    },
});

export default DateRangeFilter;
