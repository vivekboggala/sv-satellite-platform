import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { firestore } from '../../services/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const AdminReportsScreen = ({ navigation }) => {
    const { themeColors, isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [analytics, setAnalytics] = useState({
        totalRevenue: 0,
        totalUsers: 0,
        activeUsers: 0,
        revenueTrend: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], data: [0, 0, 0, 0, 0, 0] },
        serviceDist: [],
        topVillages: [],
    });

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            // Fetch users
            const usersSnapshot = await getDocs(collection(firestore, 'users'));
            const users = [];
            usersSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.role !== 'admin') {
                    users.push(data);
                }
            });

            // Fetch payments
            const paymentsSnapshot = await getDocs(
                query(collection(firestore, 'payments'), where('status', '==', 'completed'))
            );
            const payments = [];
            paymentsSnapshot.forEach(doc => {
                payments.push(doc.data());
            });

            // Calculate analytics
            const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            const activeUsers = users.filter(u => u.is_approved && u.status === 'active').length;

            // Monthly revenue (last 6 months)
            const monthlyData = calculateMonthlyRevenue(payments);

            // Service distribution
            const serviceData = calculateServiceDistribution(users);

            // Village distribution (top 5)
            const villageData = calculateVillageDistribution(users);

            setAnalytics({
                totalRevenue,
                totalUsers: users.length,
                activeUsers,
                revenueTrend: monthlyData,
                serviceDist: serviceData,
                topVillages: villageData,
            });
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchAnalytics();
    };

    const calculateMonthlyRevenue = (payments) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const data = [0, 0, 0, 0, 0, 0];

        payments.forEach(payment => {
            if (payment.timestamp && typeof payment.timestamp.toDate === 'function') {
                const date = payment.timestamp.toDate();
                const monthIndex = date.getMonth();
                const currentMonth = new Date().getMonth();
                const monthDiff = currentMonth - monthIndex;

                if (monthDiff >= 0 && monthDiff < 6) {
                    data[5 - monthDiff] += payment.amount || 0;
                }
            }
        });

        return { labels: months, data };
    };

    const calculateServiceDistribution = (users) => {
        const services = {};
        users.forEach(user => {
            const service = user.service_type || 'Unknown';
            services[service] = (services[service] || 0) + 1;
        });

        return Object.entries(services).map(([name, count]) => ({
            name: name.replace('_', ' '),
            population: count,
            color: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'][Math.floor(Math.random() * 4)],
            legendFontColor: isDark ? '#CBD5E1' : '#64748B',
        }));
    };

    const calculateVillageDistribution = (users) => {
        const villages = {};
        users.forEach(user => {
            const village = user.village || 'Unknown';
            villages[village] = (villages[village] || 0) + 1;
        });

        return Object.entries(villages)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, users: count }));
    };

    const chartConfig = {
        backgroundGradientFrom: themeColors.card,
        backgroundGradientTo: themeColors.card,
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        labelColor: (opacity = 1) => themeColors.textSecondary,
        strokeWidth: 2,
        decimalPlaces: 0,
        propsForDots: { r: '5', strokeWidth: '2', stroke: themeColors.primary },
    };

    const StatCard = ({ icon, label, value, color }) => (
        <View style={[styles.statCard, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
            <View style={[styles.statIconBox, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textSubtle }]}>{label}</Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.borderLight }]}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu" size={26} color={themeColors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Intelligence Center</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {loading && !refreshing ? (
                <View style={styles.loaderBox}>
                    <ActivityIndicator size="large" color={themeColors.primary} />
                    <Text style={[styles.loaderText, { color: themeColors.textSubtle }]}>Crunching latest data...</Text>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[themeColors.primary]}
                            tintColor={themeColors.primary}
                        />
                    }
                >
                    {/* Stats Grid - 2x2 */}
                    <View style={styles.statsGrid}>
                        <View style={[styles.statBox, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                            <View style={[styles.statIcon, { backgroundColor: '#10B98115' }]}>
                                <Ionicons name="cash-outline" size={20} color="#10B981" />
                            </View>
                            <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>₹{(analytics.totalRevenue || 0).toLocaleString()}</Text>
                            <Text style={[styles.statLabel, { color: themeColors.textSubtle }]}>Total Revenue</Text>
                        </View>
                        <View style={[styles.statBox, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                            <View style={[styles.statIcon, { backgroundColor: '#3B82F615' }]}>
                                <Ionicons name="people-outline" size={20} color="#3B82F6" />
                            </View>
                            <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{analytics.totalUsers}</Text>
                            <Text style={[styles.statLabel, { color: themeColors.textSubtle }]}>Total Users</Text>
                        </View>
                        <View style={[styles.statBox, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                            <View style={[styles.statIcon, { backgroundColor: '#8B5CF615' }]}>
                                <Ionicons name="sparkles-outline" size={20} color="#8B5CF6" />
                            </View>
                            <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{analytics.activeUsers}</Text>
                            <Text style={[styles.statLabel, { color: themeColors.textSubtle }]}>Active Pulse</Text>
                        </View>
                        <View style={[styles.statBox, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                            <View style={[styles.statIcon, { backgroundColor: '#F59E0B15' }]}>
                                <Ionicons name="trending-up-outline" size={20} color="#F59E0B" />
                            </View>
                            <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>+12%</Text>
                            <Text style={[styles.statLabel, { color: themeColors.textSubtle }]}>MoM Growth</Text>
                        </View>
                    </View>

                    {/* Revenue Trend Chart */}
                    <View style={[styles.chartCard, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                        <Text style={[styles.chartTitle, { color: themeColors.textPrimary }]}>Revenue Trajectory</Text>
                        <LineChart
                            data={{
                                labels: analytics.revenueTrend.labels,
                                datasets: [{ data: analytics.revenueTrend.data }]
                            }}
                            width={width - 72}
                            height={200}
                            chartConfig={{
                                backgroundColor: themeColors.card,
                                backgroundGradientFrom: themeColors.card,
                                backgroundGradientTo: themeColors.card,
                                decimalPlaces: 0,
                                color: (opacity = 1) => themeColors.primary,
                                labelColor: (opacity = 1) => themeColors.textSubtle,
                                style: { borderRadius: 16 },
                                propsForDots: { r: "4", strokeWidth: "2", stroke: themeColors.primary }
                            }}
                            bezier
                            style={styles.chart}
                        />
                    </View>

                    <View style={styles.bottomGrid}>
                        {/* Service Distribution */}
                        <View style={[styles.distCard, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                            <Text style={[styles.chartTitle, { color: themeColors.textPrimary }]}>Service Mix</Text>
                            <PieChart
                                data={analytics.serviceDist}
                                width={width - 72}
                                height={180}
                                chartConfig={{ color: (opacity = 1) => themeColors.textPrimary }}
                                accessor="population"
                                backgroundColor="transparent"
                                paddingLeft="15"
                                absolute
                            />
                        </View>

                        {/* Top Villages */}
                        <View style={[styles.distCard, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
                            <Text style={[styles.chartTitle, { color: themeColors.textPrimary }]}>Top Localities</Text>
                            {analytics.topVillages.map((village, index) => (
                                <View key={index} style={styles.villageRow}>
                                    <View style={[styles.rankDot, { backgroundColor: themeColors.primary + (20 * (5 - index)) }]} />
                                    <View style={styles.villageInfo}>
                                        <Text style={[styles.villageName, { color: themeColors.textPrimary }]}>{village.name}</Text>
                                        <View style={[styles.progressBar, { backgroundColor: themeColors.background }]}>
                                            <View style={[styles.progressFill, { backgroundColor: themeColors.primary, width: `${(village.users / analytics.totalUsers) * 300}%` }]} />
                                        </View>
                                    </View>
                                    <Text style={[styles.villageCount, { color: themeColors.textSubtle }]}>{village.users}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 60,
        borderBottomWidth: 1,
    },
    menuButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loaderText: { marginTop: 16, fontSize: 14, fontWeight: '600' },
    scrollContent: { padding: 20 },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
    },
    statBox: {
        width: (width - 56) / 2,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    statIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
    statLabel: { fontSize: 11, fontWeight: '700' },
    chartCard: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
    },
    chartTitle: { fontSize: 16, fontWeight: '800', marginBottom: 20 },
    chart: { marginVertical: 8, borderRadius: 16 },
    bottomGrid: { gap: 16, marginBottom: 40 },
    distCard: {
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
    },
    villageRow: {
        borderRadius: 4,
    },
});

export default AdminReportsScreen;