import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList } from 'react-native';
import { getFirestore, collection, addDoc, onSnapshot, query, where } from 'firebase/firestore';
import { app } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';

const db = getFirestore(app);

const FoodLogger = () => {
  const { currentUser } = useAuth();
  const [food, setFood] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    const today = new Date();
    today.setHours(0,0,0,0);
    const colRef = collection(db, 'users', currentUser.uid, 'foodLogs');
    const q = query(colRef, where('date', '>=', today));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [currentUser]);

  const handleAdd = async () => {
    if (!food.name || !food.calories || !currentUser) return;
    const colRef = collection(db, 'users', currentUser.uid, 'foodLogs');
    await addDoc(colRef, {
      ...food,
      calories: parseFloat(food.calories),
      protein: parseFloat(food.protein) || 0,
      carbs: parseFloat(food.carbs) || 0,
      fat: parseFloat(food.fat) || 0,
      date: new Date(),
    });
    setFood({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  };

  const total = logs.reduce((acc, l) => ({
    calories: acc.calories + l.calories,
    protein: acc.protein + l.protein,
    carbs: acc.carbs + l.carbs,
    fat: acc.fat + l.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <View style={{ margin: 16, padding: 16, borderRadius: 12, backgroundColor: '#F7F7FF' }}>
      <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Food Logger</Text>
      <TextInput placeholder="Food name" value={food.name} onChangeText={v => setFood({ ...food, name: v })} style={{ borderWidth: 1, marginVertical: 4, padding: 8 }} />
      <TextInput placeholder="Calories" value={food.calories} onChangeText={v => setFood({ ...food, calories: v })} keyboardType="numeric" style={{ borderWidth: 1, marginVertical: 4, padding: 8 }} />
      <TextInput placeholder="Protein (g)" value={food.protein} onChangeText={v => setFood({ ...food, protein: v })} keyboardType="numeric" style={{ borderWidth: 1, marginVertical: 4, padding: 8 }} />
      <TextInput placeholder="Carbs (g)" value={food.carbs} onChangeText={v => setFood({ ...food, carbs: v })} keyboardType="numeric" style={{ borderWidth: 1, marginVertical: 4, padding: 8 }} />
      <TextInput placeholder="Fat (g)" value={food.fat} onChangeText={v => setFood({ ...food, fat: v })} keyboardType="numeric" style={{ borderWidth: 1, marginVertical: 4, padding: 8 }} />
      <Button title="Add Food" onPress={handleAdd} />
      <Text style={{ marginTop: 8 }}>Total: {total.calories} kcal, {total.protein}g P, {total.carbs}g C, {total.fat}g F</Text>
      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Text>{item.name}: {item.calories} kcal</Text>
        )}
      />
    </View>
  );
};

export default FoodLogger; 