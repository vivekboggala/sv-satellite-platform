import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAuth, getAuth } from 'firebase/auth';
import { Platform } from 'react-native';

const firebaseConfig = {
    apiKey: "AIzaSyD6biy7nQZupyAzSozJAzwUaKWDsB0IM9M",
    authDomain: "cable-fibre.firebaseapp.com",
    projectId: "cable-fibre",
    storageBucket: "cable-fibre.appspot.com",
    messagingSenderId: "567697559635",
    appId: "1:567697559635:web:54bf2c03006275c3f8f6a6",
    measurementId: "G-54YJ4ZT9TS"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let auth;
if (Platform.OS === 'web') {
    auth = getAuth(app);
} else {
    // Explicitly initialize auth with persistence for React Native
    const { getReactNativePersistence } = require('firebase/auth');
    const ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;

    try {
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(ReactNativeAsyncStorage)
        });
    } catch (e) {
        // Fallback for cases where initializeAuth might have already been called
        auth = getAuth(app);
    }
}

export { auth };
export const firestore = getFirestore(app);
export const storage = getStorage(app, "gs://cable-fibre.appspot.com");
export default app;