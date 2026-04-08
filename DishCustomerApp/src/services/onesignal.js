import { firestore } from './firebase';
import { collection, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { OneSignal, LogLevel } from 'react-native-onesignal';

export const initializeOneSignal = () => {
  try {
    // Enable verbose logging for debugging
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);

    // Initialize with App ID
    OneSignal.initialize("3d843300-c60a-46b8-917c-ed4a176600e3");

    // Request notification permission
    OneSignal.Notifications.requestPermission(true);

    console.log('OneSignal initialized successfully');
  } catch (error) {
    console.log('OneSignal initialization error:', error);
  }
};

export const setOneSignalExternalId = (userId) => {
  try {
    OneSignal.login(userId);
    console.log('OneSignal user logged in:', userId);
  } catch (error) {
    console.log('OneSignal login error:', error);
  }
};

export const setOneSignalTags = (tags) => {
  try {
    OneSignal.User.addTags(tags);
    console.log('OneSignal tags added:', tags);
  } catch (error) {
    console.log('OneSignal addTags error:', error);
  }
};

export const removeOneSignalExternalId = () => {
  try {
    OneSignal.logout();
    console.log('OneSignal user logged out');
  } catch (error) {
    console.log('OneSignal logout error:', error);
  }
};

// Send notification to admin (broadcasts to all for testing)
export const sendNotificationToAdmin = async (title, message, data = {}, notificationId = null) => {
  try {
    // Persist to Firestore for history tracking
    const notificationData = {
      title,
      message,
      data,
      recipient_role: 'admin',
      type: data.type || 'system',
      created_at: serverTimestamp(),
      is_read: false
    };

    if (notificationId) {
      await setDoc(doc(firestore, "notifications", notificationId), notificationData);
    } else {
      await addDoc(collection(firestore, "notifications"), notificationData);
    }

    const payload = {
      app_id: "3d843300-c60a-46b8-917c-ed4a176600e3",
      target_channel: "push",
      filters: [
        { field: "tag", key: "user_type", relation: "=", value: "admin" }
      ],
      headings: { en: title },
      contents: { en: message },
      data: data
    };

    console.log('Sending notification to admin with payload:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic os_v2_app_hwcdgaggbjdlrel45vfbozqa4mguvizk5qheipvu7kfwxebstex4qdpncpapb3vys62aiyzir4m2wc7qhfxlgolf7np5kluxok5fvfa'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('OneSignal API Response:', JSON.stringify(result, null, 2));

    if (result.errors) {
      console.warn('OneSignal returned errors:', result.errors);
    }

    return result;
  } catch (error) {
    console.error('OneSignal send notification error:', error);
    throw error;
  }
};