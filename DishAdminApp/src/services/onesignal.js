import { firestore } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { OneSignal, LogLevel } from 'react-native-onesignal';

export const initializeOneSignal = () => {
  try {
    // Enable verbose logging for debugging
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);

    // Initialize with App ID
    OneSignal.initialize("3d843300-c60a-46b8-917c-ed4a176600e3");

    // Request notification permission
    OneSignal.Notifications.requestPermission(true);

    // Diagnostics: Check subscription status and tags
    setTimeout(async () => {
      const id = await OneSignal.User.getPushToken();
      const tags = await OneSignal.User.getTags();
      const subscribed = await OneSignal.User.getPushSubscriptionId();
      console.log('--- OneSignal Admin Diagnostics ---');
      console.log('Subscription ID:', subscribed);
      console.log('Push Token:', id);
      console.log('Current Tags:', JSON.stringify(tags));
      console.log('------------------------------------');
    }, 5000);

    console.log('OneSignal initialized successfully');
  } catch (error) {
    console.log('OneSignal initialization error:', error);
  }
};

export const setOneSignalExternalId = (userId) => {
  try {
    OneSignal.login(userId);
    console.log('OneSignal admin logged in:', userId);
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
    console.log('OneSignal admin logged out');
  } catch (error) {
    console.log('OneSignal logout error:', error);
  }
};

// Send notification to specific user by external ID
export const sendNotificationToUser = async (externalUserId, title, message, data = {}) => {
  try {
    // Persist to Firestore for user's history
    await addDoc(collection(firestore, "notifications"), {
      user_id: externalUserId,
      title,
      message,
      data,
      type: data.type || 'alert',
      created_at: serverTimestamp(),
      is_read: false,
      sender_role: 'admin'
    });

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic os_v2_app_hwcdgaggbjdlrel45vfbozqa4mguvizk5qheipvu7kfwxebstex4qdpncpapb3vys62aiyzir4m2wc7qhfxlgolf7np5kluxok5fvfa'
      },
      body: JSON.stringify({
        app_id: "3d843300-c60a-46b8-917c-ed4a176600e3",
        include_aliases: {
          external_id: [externalUserId]
        },
        target_channel: "push",
        headings: { en: title },
        contents: { en: message },
        data: data
      })
    });

    const result = await response.json();
    console.log('Notification sent to user:', externalUserId, result);
    return result;
  } catch (error) {
    console.error('OneSignal send notification error:', error);
    throw error;
  }
};

// Send notification to all users
export const sendNotificationToAll = async (title, message, data = {}) => {
  try {
    // Persist to Firestore for general history (broadcast)
    await addDoc(collection(firestore, "notifications"), {
      title,
      message,
      data,
      recipient_role: 'all',
      type: 'broadcast',
      created_at: serverTimestamp(),
      is_read: false,
      sender_role: 'admin'
    });

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic os_v2_app_hwcdgaggbjdlrel45vfbozqa4mguvizk5qheipvu7kfwxebstex4qdpncpapb3vys62aiyzir4m2wc7qhfxlgolf7np5kluxok5fvfa'
      },
      body: JSON.stringify({
        app_id: "3d843300-c60a-46b8-917c-ed4a176600e3",
        included_segments: ["All"],
        headings: { en: title },
        contents: { en: message },
        data: data
      })
    });

    const result = await response.json();
    console.log('Broadcast notification sent:', result);
    return result;
  } catch (error) {
    console.error('OneSignal broadcast error:', error);
    throw error;
  }
};

// Send notification to users with specific tag
export const sendNotificationToSegment = async (filterTag, filterValue, title, message, data = {}) => {
  try {
    // This is more complex to persist properly without a recipient list,
    // but we can save it as a filtered broadcast for history.
    await addDoc(collection(firestore, "notifications"), {
      title,
      message,
      data,
      filter: { tag: filterTag, value: filterValue },
      recipient_role: 'all',
      type: 'broadcast',
      created_at: serverTimestamp(),
      is_read: false,
      sender_role: 'admin'
    });

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic os_v2_app_hwcdgaggbjdlrel45vfbozqa4mguvizk5qheipvu7kfwxebstex4qdpncpapb3vys62aiyzir4m2wc7qhfxlgolf7np5kluxok5fvfa'
      },
      body: JSON.stringify({
        app_id: "3d843300-c60a-46b8-917c-ed4a176600e3",
        filters: [
          {
            field: "tag",
            key: filterTag,
            relation: "=",
            value: filterValue
          }
        ],
        headings: { en: title },
        contents: { en: message },
        data: data
      })
    });

    const result = await response.json();
    console.log('Segment notification sent:', result);
    return result;
  } catch (error) {
    console.error('OneSignal segment notification error:', error);
    throw error;
  }
};

// Send broadcast with optional filters and data
export const sendBroadcast = async (title, message, filters = null, data = {}) => {
  try {
    // Persist to Firestore
    await addDoc(collection(firestore, "notifications"), {
      title,
      message,
      data,
      recipient_role: (filters && filters.length > 0) ? 'filtered' : 'all',
      type: data.type || 'broadcast',
      filters: filters,
      created_at: serverTimestamp(),
      is_read: false,
      sender_role: 'admin'
    });

    const payload = {
      app_id: "3d843300-c60a-46b8-917c-ed4a176600e3",
      headings: { en: title },
      contents: { en: message },
      data: data
    };

    if (filters && filters.length > 0) {
      payload.filters = filters;
    } else {
      payload.included_segments = ["All"];
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic os_v2_app_hwcdgaggbjdlrel45vfbozqa4mguvizk5qheipvu7kfwxebstex4qdpncpapb3vys62aiyzir4m2wc7qhfxlgolf7np5kluxok5fvfa'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('Broadcast sent:', result);
    return result;
  } catch (error) {
    console.error('OneSignal sendBroadcast error:', error);
    throw error;
  }
};