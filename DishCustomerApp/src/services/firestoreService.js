import { firestore } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, runTransaction, serverTimestamp } from 'firebase/firestore';

export const firestoreService = {
  async getDocById(collectionName, docId) {
    const docRef = doc(firestore, collectionName, docId);
    const snap = await getDoc(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async queryDocs(collectionName, queryConstraints = []) {
    const q = query(collection(firestore, collectionName), ...queryConstraints);
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async createDoc(collectionName, data, docId = null) {
    const docRef = docId ? doc(firestore, collectionName, docId) : doc(collection(firestore, collectionName));
    await setDoc(docRef, { ...data, created_at: serverTimestamp() });
    return docRef.id;
  },

  async updateDoc(collectionName, docId, data) {
    const docRef = doc(firestore, collectionName, docId);
    await updateDoc(docRef, { ...data, updated_at: serverTimestamp() });
  },

  // Optimized System Stats aggregation
  async updateSystemStat(fieldStr, amount) {
    const statRef = doc(firestore, 'system_stats', 'overview');
    try {
      await runTransaction(firestore, async (transaction) => {
        const statDoc = await transaction.get(statRef);
        if (!statDoc.exists()) {
          transaction.set(statRef, { [fieldStr]: amount });
        } else {
          const currentVal = statDoc.data()[fieldStr] || 0;
          transaction.update(statRef, { [fieldStr]: currentVal + amount });
        }
      });
    } catch (error) {
       console.error(`Failed to update system stat [${fieldStr}]:`, error);
    }
  }
};
export default firestoreService;
