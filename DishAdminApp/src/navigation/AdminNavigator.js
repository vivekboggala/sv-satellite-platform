import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AdminSidebar from '../components/AdminSidebar';

// Screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminPaymentsScreen from '../screens/admin/AdminPaymentsScreen';
import AdminUserManagementScreen from '../screens/admin/AdminUserManagementScreen';
import AdminUserApprovalScreen from '../screens/admin/AdminUserApprovalScreen';
import SupportTicketsScreen from '../screens/admin/SupportTicketsScreen';
import AdminReportsScreen from '../screens/admin/AdminReportsScreen';
import AdminExportDataScreen from '../screens/admin/AdminExportDataScreen';
import AdminPaymentSettingsScreen from '../screens/admin/AdminPaymentSettingsScreen';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';
import AdminUserDetailsScreen from '../screens/admin/AdminUserDetailsScreen';
import BroadcastAlertScreen from '../screens/admin/BroadcastAlertScreen';
import AdminTransactionLedgerScreen from '../screens/admin/AdminTransactionLedgerScreen';
import AdminRequestsScreen from '../screens/admin/AdminRequestsScreen';
import AdminPasswordResetScreen from '../screens/admin/AdminPasswordResetScreen';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const DrawerNavigator = () => {
    const { isDark, themeColors } = useTheme();

    return (
        <Drawer.Navigator
            drawerContent={(props) => <AdminSidebar {...props} />}
            screenOptions={{
                drawerActiveTintColor: themeColors.primary,
                drawerInactiveTintColor: themeColors.textSecondary,
                drawerActiveBackgroundColor: themeColors.primary + '10',
                drawerStyle: {
                    width: 260,
                    backgroundColor: themeColors.background,
                },
                drawerLabelStyle: {
                    marginLeft: -10,
                    fontSize: 14,
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
                headerShown: false,
                drawerType: 'front',
                overlayColor: 'transparent',
                drawerHideStatusBarOnOpen: false,
            }}
        >
            {/* 1. Dashboard */}
            <Drawer.Screen
                name="Dashboard"
                component={AdminDashboardScreen}
                options={{
                    title: 'Dashboard',
                    drawerIcon: ({ color }) => <Ionicons name="grid-outline" size={22} color={color} />
                }}
            />

            {/* 2. Pending Payments */}
            <Drawer.Screen
                name="PendingPayments"
                component={AdminPaymentsScreen}
                options={{
                    title: 'Pending Payments',
                    drawerIcon: ({ color }) => <Ionicons name="card-outline" size={22} color={color} />
                }}
            />

            {/* 3. Customers */}
            <Drawer.Screen
                name="Customers"
                component={AdminUserManagementScreen}
                options={{
                    title: 'Customers',
                    drawerIcon: ({ color }) => <Ionicons name="people-outline" size={22} color={color} />
                }}
            />

            {/* 4. New Registrations */}
            <Drawer.Screen
                name="NewRegistrations"
                component={AdminUserApprovalScreen}
                options={{
                    title: 'New Registrations',
                    drawerIcon: ({ color }) => <Ionicons name="person-add-outline" size={22} color={color} />
                }}
            />


            {/* 6. Support Tickets */}
            <Drawer.Screen
                name="SupportTickets"
                component={SupportTicketsScreen}
                options={{
                    title: 'Support Tickets',
                    drawerIcon: ({ color }) => <Ionicons name="chatbubbles-outline" size={22} color={color} />
                }}
            />

            {/* 7. Reports And Analytics */}
            <Drawer.Screen
                name="Reports"
                component={AdminReportsScreen}
                options={{
                    title: 'Reports And Analytics',
                    drawerIcon: ({ color }) => <Ionicons name="bar-chart-outline" size={22} color={color} />
                }}
            />

            {/* 8. Export Data */}
            <Drawer.Screen
                name="ExportData"
                component={AdminExportDataScreen}
                options={{
                    title: 'Export Data',
                    drawerIcon: ({ color }) => <Ionicons name="download-outline" size={22} color={color} />
                }}
            />

            {/* 9. Payment Settings */}
            <Drawer.Screen
                name="PaymentSettings"
                component={AdminPaymentSettingsScreen}
                options={{
                    title: 'Payment Settings',
                    drawerIcon: ({ color }) => <Ionicons name="wallet-outline" size={22} color={color} />
                }}
            />

            {/* 10. Admin Profile */}
            <Drawer.Screen
                name="AdminProfile"
                component={AdminProfileScreen}
                options={{
                    title: 'Admin Profile',
                    drawerIcon: ({ color }) => <Ionicons name="person-circle-outline" size={22} color={color} />
                }}
            />

            {/* 11. Transaction Ledger */}
            <Drawer.Screen
                name="TransactionLedger"
                component={AdminTransactionLedgerScreen}
                options={{
                    title: 'Transaction Ledger',
                    drawerIcon: ({ color }) => <Ionicons name="receipt-outline" size={22} color={color} />
                }}
            />

            {/* 12. Box Changes */}
            <Drawer.Screen
                name="BoxRequests"
                component={AdminRequestsScreen}
                options={{
                    title: 'Box Changes',
                    drawerIcon: ({ color }) => <Ionicons name="hardware-chip-outline" size={22} color={color} />
                }}
            />

            {/* 13. Password Reset Requests */}
            <Drawer.Screen
                name="PasswordResets"
                component={AdminPasswordResetScreen}
                options={{
                    title: 'Password Resets',
                    drawerIcon: ({ color }) => <Ionicons name="key-outline" size={22} color={color} />
                }}
            />
        </Drawer.Navigator>
    );
};

const AdminNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainDrawer" component={DrawerNavigator} />
            <Stack.Screen name="AdminUserDetails" component={AdminUserDetailsScreen} />
            <Stack.Screen
                name="BroadcastAlert"
                component={BroadcastAlertScreen}
                options={{
                    headerShown: false,
                    title: 'Broadcast Alert'
                }}
            />
        </Stack.Navigator>
    );
};

export default AdminNavigator;