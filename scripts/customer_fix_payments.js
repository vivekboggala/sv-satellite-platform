import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

// Need to import the config
import { firebaseConfig } from './src/services/firebase.js';

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

async function fixPayments() {
    console.log("Starting to fix payments...");
    const paymentsRef = collection(firestore, 'payments');
    const snapshot = await getDocs(paymentsRef);
    let updatedCount = 0;
    
    for (const paymentDoc of snapshot.docs) {
        const data = paymentDoc.data();
        let needsUpdate = false;
        let updateData = {};
        
        if (typeof data.amount === 'string') {
            updateData.amount = parseFloat(data.amount) || 0;
            needsUpdate = true;
        }
        
        if (typeof data.totalRevenue === 'string') {
            updateData.totalRevenue = parseFloat(data.totalRevenue) || 0;
            needsUpdate = true;
        }
        
        if (typeof data.old_balance === 'string') {
            updateData.old_balance = parseFloat(data.old_balance) || 0;
            needsUpdate = true;
        }
        
        if (typeof data.valued_at === 'string') {
            updateData.valued_at = parseFloat(data.valued_at) || 0;
            needsUpdate = true;
        }

        if (needsUpdate) {
            await updateDoc(doc(firestore, 'payments', paymentDoc.id), updateData);
            updatedCount++;
            console.log(`Updated payment ${paymentDoc.id}`);
        }
    }
    
    console.log(`Finished fixing payments. Updated ${updatedCount} documents.`);
    process.exit(0);
}

fixPayments().catch(console.error);
