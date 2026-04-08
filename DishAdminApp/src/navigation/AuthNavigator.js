import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminLoginScreen from '../screens/admin/AdminLoginScreen';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
        </Stack.Navigator>
    );
};

export default AuthNavigator;
