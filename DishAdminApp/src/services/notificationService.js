import { firestore } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { OneSignal, LogLevel } from 'react-native-onesignal';

const ONESIGNAL_APP_ID = "3d843300-c60a-46b8-917c-ed4a176600e3";
const ONESIGNAL_API_KEY = "Basic os_v2_app_hwcdgaggbjdlrel45vfbozqa4mguvizk5qheipvu7kfwxebstex4qdpncpapb3vys62aiyzir4m2wc7qhfxlgolf7np5kluxok5fvfa";

export const notificationService = {
  init() {
    try {
      OneSignal.Debug.setLogLevel(LogLevel.Verbose);
      OneSignal.initialize(ONESIGNAL_APP_ID);
      OneSignal.Notifications.requestPermission(true);
    } catch(e) {
      console.warn('OneSignal init failed', e);
    }
  },

  login(userId) {
    try { OneSignal.login(userId); } catch (e) {}
  },

  logout() {
    try { OneSignal.logout(); } catch (e) {}
  },

  async queueFailedNotification(payload, errorMsg) {
    try {
       await addDoc(collection(firestore, 'notifications_queue'), {
          payload,
          status: 'failed',
          error: errorMsg,
          queued_at: serverTimestamp(),
          retryCount: 0
       });
    } catch(e) {
       console.error("Critical: Failed to queue unsent notification", e);
    }
  },

  // Simple in-memory deduplication to prevent rapid duplicate sends (e.g. from UI re-renders)
  _sentCache: new Map(),

  // Background detached retry loop. Never blocks UI!
  sendNotificationWithRetry(targetId, title, message, data = {}, retries = 3) {
      // Use a more aggressive cache key for common approval notifications
      const isApproval = title.includes("Approved") || title.includes("Success");
      const cacheKey = isApproval ? `${targetId}_${title}` : `${targetId}_${title}_${message}`;
      const now = Date.now();
      
      if (notificationService._sentCache.has(cacheKey) && (now - notificationService._sentCache.get(cacheKey) < 10000)) {
          console.log("Duplicate notification suppressed: " + cacheKey);
          return;
      }
      notificationService._sentCache.set(cacheKey, now);

      (async () => {
          let attempt = 0;
          
          let filters = [];
          if (targetId === 'admin') {
              filters = [{ field: "tag", key: "user_type", relation: "=", value: "admin" }];
          }

          const payload = {
              app_id: ONESIGNAL_APP_ID,
              target_channel: "push",
              headings: { en: title },
              contents: { en: message },
              data: data
          };

          if (targetId === 'all') {
              payload.included_segments = ["Subscribed Users"];
          } else if (filters.length > 0) {
              payload.filters = filters;
          } else if (Array.isArray(targetId)) {
              payload.include_aliases = { external_id: targetId };
          } else {
              payload.include_aliases = { external_id: [targetId] };
          }

          // Track standard notifications for UI history BEFORE push loop
          try {
            const historyData = {
                title,
                message,
                data,
                created_at: serverTimestamp(),
                is_read: false,
                type: data.type || 'system'
            };

            if (targetId === 'all') {
                historyData.recipient_role = 'all';
            } else if (targetId === 'admin') {
                historyData.recipient_role = 'admin';
            } else {
                historyData.user_id = targetId;
            }

            await addDoc(collection(firestore, "notifications"), historyData);
          } catch(e) {
            console.error("Failed to track notification in DB history", e);
          }

          while (attempt < retries) {
            try {
                const response = await fetch('https://onesignal.com/api/v1/notifications', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': ONESIGNAL_API_KEY
                    },
                    body: JSON.stringify(payload)
                });
                
                const result = await response.json();
                
                // CRITICAL FIX: OneSignal returning errors in the body means the request reached them.
                // Retrying on "errors" often leads to multiple sends if some targets succeeded.
                if (result.errors) {
                    console.warn("OneSignal API error (No Retry):", result.errors);
                    // We don't retry on logic errors, as the notification might have reached some players.
                    return; 
                }
                
                return; // Success
            } catch (error) {
                // Only retry on ACTUAL network/fetch errors
                attempt++;
                console.warn(`Notification network failure, attempt ${attempt} of ${retries}`, error);
                if (attempt >= retries) {
                    await notificationService.queueFailedNotification(payload, error.message || String(error));
                }
                await new Promise(res => setTimeout(res, 2000 * attempt));
            }
          }
      })();
  }
};
export default notificationService;
