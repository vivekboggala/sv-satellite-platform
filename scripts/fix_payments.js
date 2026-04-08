const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "dummy",
    projectId: "dish-fiber-5b121", 
    // Wait, the project doesn't have process.env initialized here. 
    // Best way is to use existing firebase.js in AdminApp
};

