import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from './src/services/firebase';
import { initializeOneSignal, setOneSignalExternalId, setOneSignalTags } from './src/services/onesignal';
import AuthNavigator from './src/navigation/AuthNavigator';
import AdminNavigator from './src/navigation/AdminNavigator';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize OneSignal for admin push notifications
    initializeOneSignal();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          console.log('🔵 Checking admin access for UID:', firebaseUser.uid);

          // Check if user has admin role
          const userDoc = await getDoc(doc(firestore, 'admins', firebaseUser.uid));

          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('🟢 Admin doc found:', userData);

            if (userData.role === 'admin' || userData.role === 'owner') {
              console.log('✅ Access granted - Role:', userData.role);
              setUser(firebaseUser);

              // Register admin device with OneSignal for targeted notifications
              try {
                setOneSignalExternalId(firebaseUser.uid);
                setOneSignalTags({ user_type: 'admin', role: userData.role });
                console.log('✅ OneSignal admin tags set');
              } catch (osErr) {
                console.log('OneSignal tag error:', osErr.message);
              }
            } else {
              console.log('❌ Access denied - Invalid role:', userData.role);
              await auth.signOut();
              setUser(null);
            }
          } else {
            console.log('❌ Access denied - Not in admins collection');
            await auth.signOut();
            setUser(null);
          }
        } catch (error) {
          console.error('🔴 Auth check error:', error);
          setUser(null);
        }
      } else {
        console.log('🔵 No user logged in');
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <AppContent user={user} />
          </NavigationContainer>
        </SafeAreaProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

const AppContent = ({ user }) => {
  return user ? <AdminNavigator /> : <AuthNavigator />;
};