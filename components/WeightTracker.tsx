import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList } from 'react-native';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { app } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';

const db = getFirestore(app);

const WeightTracker = () => {
  const { currentUser } = useAuth();
  const [weight, setWeight] = useState('');
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    const colRef = collection(db, 'users', currentUser.uid, 'weightLogs');
    const q = query(colRef, orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [currentUser]);

  const handleAdd = async () => {
    if (!weight || !currentUser) return;
    const colRef = collection(db, 'users', currentUser.uid, 'weightLogs');
    await addDoc(colRef, { date: new Date(), weight: parseFloat(weight) });
    setWeight('');
  };

  return (
    <View style={{ margin: 16, padding: 16, borderRadius: 12, backgroundColor: '#F7F7FF' }}>
      <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Weight Tracker</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <TextInput
          placeholder="Enter weight (kg)"
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
          style={{ borderWidth: 1, borderColor: '#ccc', flex: 1, marginRight: 8, padding: 8, borderRadius: 6 }}
        />
        <Button title="Add" onPress={handleAdd} />
      </View>
      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Text>{item.date?.toDate ? item.date.toDate().toLocaleDateString() : new Date(item.date).toLocaleDateString()}: {item.weight} kg</Text>
        )}
      />
    </View>
  );
};

export default WeightTracker; 