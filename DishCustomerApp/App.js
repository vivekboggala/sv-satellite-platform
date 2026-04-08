import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import { initializeOneSignal } from './src/services/onesignal';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, firestore } from './src/services/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { View, ActivityIndicator } from 'react-native';
import { colors } from './src/theme';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    initializeOneSignal();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Check user approval status in Firestore
          const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));

          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.is_approved && userData.status === 'active') {
              setUser(firebaseUser);
            } else {
              // Not approved or inactive - just don't set user in state
              // We don't sign out here to avoid interrupting the registration flow
              setUser(null);
            }
          } else {
            // No profile found yet (could be a new registration in progress)
            setUser(null);
          }
        } catch (error) {
          console.error('Auth verification error:', error);
          setUser(firebaseUser); // Fallback to allow if check fails (optional)
        }
      } else {
        setUser(null);
      }
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ThemeProvider>
          <NavigationContainer>
            <AppContent user={user} />
          </NavigationContainer>
        </ThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const AppContent = ({ user }) => {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      {user ? <AppNavigator /> : <AuthNavigator />}
    </>
  );
}
