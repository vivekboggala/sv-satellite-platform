const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyD6biy7nQZupyAzSozJAzwUaKWDsB0IM9M",
    authDomain: "cable-fibre.firebaseapp.com",
    projectId: "cable-fibre",
    storageBucket: "cable-fibre.appspot.com",
    messagingSenderId: "567697559635",
    appId: "1:567697559635:web:54bf2c03006275c3f8f6a6",
    measurementId: "G-54YJ4ZT9TS"
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

async function formatAmounts() {
    console.log("Fetching payments...");
    const snapshot = await getDocs(collection(firestore, 'payments'));
    let count = 0;
    
    for (const d of snapshot.docs) {
        const data = d.data();
        let updateData = {};
        let needsUpdate = false;
        
        if (typeof data.amount === 'string') {
            updateData.amount = parseFloat(data.amount) || 0;
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
            await updateDoc(doc(firestore, 'payments', d.id), updateData);
            count++;
            console.log(`Updated ID: ${d.id}`);
        }
    }
    
    console.log(`Total payments updated: ${count}`);
    process.exit(0);
}

formatAmounts().catch(console.error);
