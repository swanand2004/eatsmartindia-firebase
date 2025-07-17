import React, { useState, useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import { getFirestore, collection, addDoc, onSnapshot, query, where } from 'firebase/firestore';
import { app } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';

const db = getFirestore(app);

const WaterTracker = () => {
  const { currentUser } = useAuth();
  const [water, setWater] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    const today = new Date();
    today.setHours(0,0,0,0);
    const colRef = collection(db, 'users', currentUser.uid, 'waterLogs');
    const q = query(colRef, where('date', '>=', today));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const total = snapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
      setWater(total);
    });
    return unsubscribe;
  }, [currentUser]);

  const handleAdd = async (amount: number) => {
    if (!currentUser) return;
    const colRef = collection(db, 'users', currentUser.uid, 'waterLogs');
    await addDoc(colRef, { date: new Date(), amount });
  };

  return (
    <View style={{ margin: 16, padding: 16, borderRadius: 12, backgroundColor: '#F7F7FF' }}>
      <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Water Tracker</Text>
      <Text style={{ marginVertical: 8 }}>Today: {water} ml</Text>
      <Button title="Add 250ml" onPress={() => handleAdd(250)} />
      <Button title="Add 500ml" onPress={() => handleAdd(500)} />
    </View>
  );
};

export default WaterTracker; 