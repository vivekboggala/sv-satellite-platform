import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../theme';

const SplashScreen = ({ navigation }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();

        const timer = setTimeout(() => {
            // Navigate to Login after 2.5 seconds
            navigation.replace('Login');
        }, 2500);

        return () => clearTimeout(timer);
    }, [fadeAnim, navigation]);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {/* Placeholder for Logo - Using Icon for now or text */}
                <View style={styles.iconContainer}>
                    <Text style={{ fontSize: 50 }}>📡</Text>
                </View>

                <Text style={styles.appName}>SV ADMIN</Text>
                <Text style={styles.tagline}>Satellite & Digital Communications</Text>
            </Animated.View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
    },
    appName: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    tagline: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 16,
    },
});

export default SplashScreen;
