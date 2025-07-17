import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList } from 'react-native';
import { getFirestore, collection, addDoc, onSnapshot, query, where } from 'firebase/firestore';
import { app } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';

const db = getFirestore(app);

const ActivityLogger = () => {
  const { currentUser } = useAuth();
  const [activity, setActivity] = useState({ type: '', duration: '', caloriesBurned: '' });
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    const today = new Date();
    today.setHours(0,0,0,0);
    const colRef = collection(db, 'users', currentUser.uid, 'activityLogs');
    const q = query(colRef, where('date', '>=', today));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [currentUser]);

  const handleAdd = async () => {
    if (!activity.type || !activity.duration || !currentUser) return;
    const colRef = collection(db, 'users', currentUser.uid, 'activityLogs');
    await addDoc(colRef, {
      ...activity,
      duration: parseFloat(activity.duration),
      caloriesBurned: parseFloat(activity.caloriesBurned) || 0,
      date: new Date(),
    });
    setActivity({ type: '', duration: '', caloriesBurned: '' });
  };

  return (
    <View style={{ margin: 16, padding: 16, borderRadius: 12, backgroundColor: '#F7F7FF' }}>
      <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Activity Logger</Text>
      <TextInput placeholder="Activity type" value={activity.type} onChangeText={v => setActivity({ ...activity, type: v })} style={{ borderWidth: 1, marginVertical: 4, padding: 8 }} />
      <TextInput placeholder="Duration (min)" value={activity.duration} onChangeText={v => setActivity({ ...activity, duration: v })} keyboardType="numeric" style={{ borderWidth: 1, marginVertical: 4, padding: 8 }} />
      <TextInput placeholder="Calories burned" value={activity.caloriesBurned} onChangeText={v => setActivity({ ...activity, caloriesBurned: v })} keyboardType="numeric" style={{ borderWidth: 1, marginVertical: 4, padding: 8 }} />
      <Button title="Add Activity" onPress={handleAdd} />
      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Text>{item.type}: {item.duration} min, {item.caloriesBurned} kcal</Text>
        )}
      />
    </View>
  );
};

export default ActivityLogger; 