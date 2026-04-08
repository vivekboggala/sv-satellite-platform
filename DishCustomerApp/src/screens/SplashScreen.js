import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { shadows } from '../theme';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 4,
                useNativeDriver: true,
            })
        ]).start();

        const timer = setTimeout(() => {
            navigation.replace('Login');
        }, 3000);

        return () => clearTimeout(timer);
    }, [fadeAnim, scaleAnim, navigation]);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient
                colors={['#1E293B', '#0F172A']}
                style={styles.background}
            >
                <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                    <View style={styles.logoOuter}>
                        <LinearGradient colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.1)']} style={styles.logoInner}>
                            <Ionicons name="speedometer" size={60} color="white" />
                        </LinearGradient>
                    </View>

                    <Text style={styles.appName}>SV SATELLITE</Text>
                    <View style={styles.divider} />
                    <Text style={styles.tagline}>PREMIUM DIGITAL EXPERIENCE</Text>

                    <View style={styles.loadingBarContainer}>
                        <Animated.View style={styles.loadingBar} />
                    </View>
                </Animated.View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>HIGH-SPEED CONNECTIVITY</Text>
                </View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { alignItems: 'center', width: '100%' },
    logoOuter: { width: 130, height: 130, borderRadius: 40, padding: 2, backgroundColor: 'rgba(255,255,255,0.3)', ...shadows.large, marginBottom: 30 },
    logoInner: { flex: 1, borderRadius: 38, justifyContent: 'center', alignItems: 'center' },

    appName: { color: '#FFFFFF', fontSize: 36, fontWeight: '900', letterSpacing: 3, marginBottom: 10 },
    divider: { width: 40, height: 4, backgroundColor: '#93C5FD', borderRadius: 2, marginBottom: 15 },
    tagline: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '800', letterSpacing: 2 },

    loadingBarContainer: { width: width * 0.4, height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 40, overflow: 'hidden' },
    loadingBar: { width: '100%', height: '100%', backgroundColor: '#FFFFFF' },

    footer: { position: 'absolute', bottom: 50, alignItems: 'center' },
    footerText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold', letterSpacing: 4 },
});

export default SplashScreen;
