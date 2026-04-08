import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import CustomSidebar from '../components/CustomSidebar';
import { useTheme } from '../context/ThemeContext';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import PlansScreen from '../screens/PlansScreen';
import PaymentHistoryScreen from '../screens/PaymentHistoryScreen';
import SupportScreen from '../screens/SupportScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import BoxChangeRequestScreen from '../screens/BoxChangeRequestScreen';
import PaymentScreen from '../screens/PaymentScreen';
import ConfigureDurationScreen from '../screens/ConfigureDurationScreen';
import LegalScreen from '../screens/LegalScreen';
import NotificationPreferencesScreen from '../screens/NotificationPreferencesScreen';
import ChatScreen from '../screens/ChatScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import MySubscriptionScreen from '../screens/MySubscriptionScreen';
import RaiseTicketScreen from '../screens/RaiseTicketScreen';
import PersonalInformationScreen from '../screens/PersonalInformationScreen';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const DrawerNavigator = () => {
    const { themeColors, isDark } = useTheme();

    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomSidebar {...props} />}
            screenOptions={{
                drawerActiveTintColor: themeColors.primary,
                drawerInactiveTintColor: themeColors.textSecondary,
                drawerActiveBackgroundColor: themeColors.primary + '10',
                drawerLabelStyle: {
                    marginLeft: -10,
                    fontSize: 15,
                    fontWeight: '600',
                },
                headerStyle: {
                    backgroundColor: themeColors.primary,
                    shadowColor: 'transparent',
                    elevation: 0,
                },
                headerTintColor: 'white',
                headerTitleStyle: {
                    fontWeight: 'bold',
                    fontSize: 18,
                },
                drawerStyle: {
                    width: 260,
                    backgroundColor: themeColors.background,
                },
                drawerType: 'front',
                overlayColor: 'transparent',
                drawerHideStatusBarOnOpen: false,
            }}
        >
            <Drawer.Screen
                name="Home"
                component={DashboardScreen}
                options={{
                    title: 'Dashboard',
                    headerShown: false,
                    drawerIcon: ({ color }) => <Ionicons name="grid-outline" size={22} color={color} />
                }}
            />
            <Drawer.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{
                    title: 'Notifications',
                    headerShown: false,
                    drawerIcon: ({ color }) => <Ionicons name="notifications-outline" size={22} color={color} />
                }}
            />
            <Drawer.Screen
                name="Plans"
                component={PlansScreen}
                options={{
                    title: 'Plans & Recharge',
                    headerShown: false,
                    drawerIcon: ({ color }) => <Ionicons name="layers-outline" size={22} color={color} />
                }}
            />
            <Drawer.Screen
                name="History"
                component={PaymentHistoryScreen}
                options={{
                    title: 'Payments',
                    headerShown: false,
                    drawerIcon: ({ color }) => <Ionicons name="receipt-outline" size={22} color={color} />
                }}
            />
            <Drawer.Screen
                name="Support"
                component={SupportScreen}
                options={{
                    title: 'Support',
                    headerShown: false,
                    drawerIcon: ({ color }) => <Ionicons name="chatbubbles-outline" size={22} color={color} />
                }}
            />
            <Drawer.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    title: 'Account Profile',
                    headerShown: false,
                    drawerIcon: ({ color }) => <Ionicons name="person-circle-outline" size={22} color={color} />
                }}
            />
            <Drawer.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    title: 'App Settings',
                    headerShown: false,
                    drawerIcon: ({ color }) => <Ionicons name="settings-outline" size={22} color={color} />
                }}
            />
            <Drawer.Screen
                name="MySubscription"
                component={MySubscriptionScreen}
                options={{
                    title: 'My Subscription',
                    headerShown: false,
                    drawerIcon: ({ color }) => <Ionicons name="package-variant-closed" size={22} color={color} />
                }}
            />
        </Drawer.Navigator>
    );
};

const AppNavigator = () => {
    const { themeColors } = useTheme();

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: true,
                headerStyle: { backgroundColor: themeColors.primary },
                headerTintColor: 'white',
                headerTitleStyle: { fontWeight: 'bold' },
                animation: 'slide_from_right'
            }}
        >
            <Stack.Screen name="MainDrawer" component={DrawerNavigator} options={{ headerShown: false }} />

            {/* Detail Screens */}
            <Stack.Screen name="ConfigureDuration" component={ConfigureDurationScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Payment" component={PaymentScreen} options={{ headerShown: false }} />
            <Stack.Screen name="BoxRequest" component={BoxChangeRequestScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Legal" component={LegalScreen} options={{ headerShown: false }} />
            <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
            <Stack.Screen name="RaiseTicket" component={RaiseTicketScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PersonalInfo" component={PersonalInformationScreen} options={{ headerShown: false }} />

            {/* NEW: Fix navigation errors */}
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ headerShown: false }} />
            <Stack.Screen name="MySubscription" component={MySubscriptionScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
    );
};

export default AppNavigator;