import { firestore } from './firebase';
import { collection, doc, onSnapshot, query } from 'firebase/firestore';

export const realtimeService = {
  listeners: {},

  subscribeToDocument(collectionName, docId, callback, listenerId = null) {
      const id = listenerId || `${collectionName}_${docId}`;
      if (this.listeners[id]) {
          this.listeners[id]();
      }

      const docRef = doc(firestore, collectionName, docId);
      const unsubscribe = onSnapshot(docRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
              callback({ id: docSnapshot.id, ...docSnapshot.data() });
          } else {
              callback(null);
          }
      }, (error) => {
          console.error(`Snapshot error on ${id}:`, error);
      });

      this.listeners[id] = unsubscribe;
      return unsubscribe;
  },

  subscribeToQuery(collectionName, queryConstraints, callback, listenerId) {
      if (this.listeners[listenerId]) {
          this.listeners[listenerId]();
      }

      const q = query(collection(firestore, collectionName), ...queryConstraints);
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const results = [];
          snapshot.forEach(d => results.push({ id: d.id, ...d.data() }));
          callback(results);
      }, (error) => {
          console.error(`Snapshot error on query ${listenerId}:`, error);
      });

      this.listeners[listenerId] = unsubscribe;
      return unsubscribe;
  },

  unsubscribe(listenerId) {
      if (this.listeners[listenerId]) {
          this.listeners[listenerId]();
          delete this.listeners[listenerId];
      }
  },

  unsubscribeAll() {
      Object.keys(this.listeners).forEach(id => {
          this.listeners[id]();
      });
      this.listeners = {};
  }
};
export default realtimeService;
