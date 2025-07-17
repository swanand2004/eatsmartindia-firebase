import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  Platform,
  StatusBar,
  SafeAreaView,
  Linking,
  Animated,
  Easing,
  Dimensions,
  StatusBar as RNStatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toast } from 'sonner-native';
import { planService, DietPlan, GroceryItem } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import { OnboardingService } from '../services/onboardingService';
import { SafeAreaView as SafeAreaContextView } from 'react-native-safe-area-context';
import { groceryService } from '../services/firestoreService';

type GroceryCategory = {
  name: string;
  icon: string;
  color: string;
  items: GroceryItem[];
};

// Utility functions for deep links
const getBigBasketLink = (ingredient: string) => `https://www.bigbasket.com/ps/?q=${encodeURIComponent(ingredient)}`;
const getBlinkitLink = (ingredient: string) => `https://blinkit.com/s/?q=${encodeURIComponent(ingredient)}`;
const getDunzoLink = (ingredient: string) => `https://www.dunzo.com/search?searchTerm=${encodeURIComponent(ingredient)}`;

// Add a simple avatar icon for the header
const UserAvatar = () => (
  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }}>
    <Ionicons name="person" size={28} color="#6C63FF" />
  </View>
);

// Helper to group items by category
const groupByCategory = (items: GroceryItem[]) => {
  const groups: { [key: string]: GroceryItem[] } = {};
  items.forEach(item => {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  });
  return groups;
};

const GroceryScreen = () => {
  const { currentUser } = useAuth();
  const [groceryList, setGroceryList] = useState<GroceryItem[]>([]);
  const [userName, setUserName] = useState('');
  const [weekType, setWeekType] = useState<'current' | 'next'>('current');
  const [showCompleted, setShowCompleted] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Produce');

  const categories = [
    { name: 'Produce', icon: 'leaf', color: '#4ECDC4' },
    { name: 'Dairy', icon: 'water', color: '#FFE66D' },
    { name: 'Meat', icon: 'food-steak', color: '#FF6B6B' },
    { name: 'Grains', icon: 'grain', color: '#FF8E53' },
    { name: 'Pantry', icon: 'food-variant', color: '#FFB3BA' },
  ];

  const screenWidth = Dimensions.get('window').width;

  // Helper to get Monday of the week for a given date
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    return new Date(date.setDate(diff));
  };

  // Helper to get ISO string for Monday of the current week
  const getCurrentWeekMondayISO = () => getMonday(new Date()).toISOString().split('T')[0];

  // Helper to get all dates for a week (Monday to Sunday)
  const getWeekDates = (start: Date) => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  };

  // Smart analyzer for quantity per person per week
  const getSmartQuantity = (name: string) => {
    const lower = name.toLowerCase();
    // Mapping for common items (per person per week)
    const smartMap: { [key: string]: string } = {
      rice: '1kg',
      flour: '1kg',
      atta: '1kg',
      dal: '250g',
      chicken: '500g',
      paneer: '200g',
      potato: '1kg',
      onion: '500g',
      tomato: '500g',
      sugar: '250g',
      salt: '100g',
      oil: '250ml',
      wheat: '1kg',
      milk: '1L',
      curd: '500g',
      cheese: '100g',
      fish: '500g',
      mutton: '500g',
      beef: '500g',
      pork: '500g',
      carrot: '250g',
      peas: '250g',
      beans: '250g',
      spinach: '250g',
      cabbage: '1 head',
      cauliflower: '1 head',
      broccoli: '1 head',
      capsicum: '250g',
      'bell pepper': '250g',
      corn: '250g',
      eggplant: '250g',
      brinjal: '250g',
      pumpkin: '500g',
      'bottle gourd': '1',
      lauki: '1',
      'bitter gourd': '250g',
      karela: '250g',
      okra: '250g',
      bhindi: '250g',
      cucumber: '2',
      garlic: '1 bulb',
      ginger: '100g',
      egg: '6',
      eggs: '6',
      bread: '1 loaf',
      apple: '4',
      banana: '7',
      orange: '4',
      lemon: '4',
      tea: '100g',
      coffee: '100g',
    };
    for (const key in smartMap) {
      if (lower.includes(key)) return smartMap[key];
    }
    // Default for others
    return '250g';
  };

  useEffect(() => {
    loadUserName();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    generateGroceryFromDietPlan();
  }, [currentUser]);

  useEffect(() => {
    // filterGroceryList(); // No longer needed
  }, [groceryList]); // No longer needed

  const loadUserName = async () => {
    try {
      const storedName = await AsyncStorage.getItem('@userName');
      if (storedName) {
        setUserName(storedName);
      }
    } catch (error) {
      console.error('Error loading user name:', error);
    }
  };

  const generateGroceryFromDietPlan = async () => {
    try {
      const dietPlan = await AsyncStorage.getItem('@activeDietPlan');
      if (dietPlan) {
        const plan = JSON.parse(dietPlan);
        console.log('Loaded plan:', plan);
        // Instead of aggregating, flatten all ingredients as separate items
        const groceryItems: GroceryItem[] = [];
        const weekStartDate = getCurrentWeekMondayISO();
        plan.meals.forEach((meal: any, mealIdx: number) => {
          meal.ingredients.forEach((ingredient: string, ingIdx: number) => {
            groceryItems.push({
              id: `${mealIdx}_${ingIdx}_${ingredient}`,
              userId: currentUser?.uid || '',
              name: ingredient,
              quantity: 1,
              unit: 'units',
              category: 'Produce',
              isCompleted: false,
              createdAt: new Date() as any,
              updatedAt: new Date() as any,
              weekStartDate,
            });
          });
        });
        console.log('Grocery items to be shown:', groceryItems);
        setGroceryList(groceryItems);
      } else {
        console.log('No active diet plan found in AsyncStorage');
        setGroceryList([]);
      }
    } catch (error) {
      console.error('Error generating grocery list:', error);
      setGroceryList([]);
    }
  };

  // const filterGroceryList = () => { // No longer needed
  //   let filtered = [...groceryList];

  //   // Filter by search query
  //   if (searchQuery) {
  //     filtered = filtered.filter(item => 
  //       item.name.toLowerCase().includes(searchQuery.toLowerCase())
  //     );
  //   }

  //   // Filter by category
  //   if (selectedCategory !== 'all') {
  //     filtered = filtered.filter(item => item.category === selectedCategory);
  //   }

  //   // Filter by completion status
  //   if (!showCompleted) {
  //     filtered = filtered.filter(item => !item.checked);
  //   }

  //   setFilteredList(filtered);
  // };

  const saveGroceryList = async (list: GroceryItem[]) => {
    try {
      await AsyncStorage.setItem('@groceryList', JSON.stringify(list));
    } catch (error) {
      console.error('Error saving grocery list:', error);
    }
  };

  const handleToggleItem = (itemId: string) => {
    const updatedList = groceryList.map(item => 
      item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
    );
    setGroceryList(updatedList);
    saveGroceryList(updatedList);
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) {
      toast.error('Please enter an item name');
      return;
    }

    const weekStartDate = getCurrentWeekMondayISO();
    const newItem: GroceryItem = {
      id: Date.now().toString(),
      userId: currentUser?.uid || '',
      name: newItemName.trim(),
      quantity: parseInt(newItemQuantity.trim()) || 1,
      unit: 'unit',
      category: newItemCategory,
      isCompleted: false,
      createdAt: new Date() as any,
      updatedAt: new Date() as any,
      weekStartDate,
    };

    const updatedList = [...groceryList, newItem];
    setGroceryList(updatedList);
    saveGroceryList(updatedList);

    // Reset form
    setNewItemName('');
    setNewItemQuantity('');
    setNewItemCategory('Produce');

    toast.success('Item added to grocery list');
  };

  const handleDeleteItem = (itemId: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            const updatedList = groceryList.filter(item => item.id !== itemId);
            setGroceryList(updatedList);
            saveGroceryList(updatedList);
            toast.success('Item removed from list');
          }
        }
      ]
    );
  };

  const handleClearCompleted = () => {
    Alert.alert(
      'Clear Completed Items',
      'Remove all checked items from the list?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            const updatedList = groceryList.filter(item => !item.isCompleted);
            setGroceryList(updatedList);
            saveGroceryList(updatedList);
            toast.success('Completed items cleared');
          }
        }
      ]
    );
  };

  const handleRegenerateList = () => {
    Alert.alert(
      'Regenerate Grocery List',
      'This will replace your current list with items from your diet plan. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Regenerate', onPress: generateGroceryFromDietPlan }
      ]
    );
  };

  const getCategoryStats = () => {
    const stats = categories.map(cat => ({
      ...cat,
      total: groceryList.filter(item => item.category === cat.name).length,
      completed: groceryList.filter(item => item.category === cat.name && item.isCompleted).length
    }));
    
    return {
      total: groceryList.length,
      completed: groceryList.filter(item => item.isCompleted).length,
      remaining: groceryList.filter(item => !item.isCompleted).length,
      categories: stats
    };
  };

  const renderGroceryItem = ({ item }: { item: GroceryItem }) => (
    <View style={[styles.groceryItem, item.isCompleted && styles.checkedItem]}>
      <TouchableOpacity 
        style={styles.checkbox}
        onPress={() => handleToggleItem(item.id!)}
      >
        <Ionicons 
          name={item.isCompleted ? "checkmark-circle" : "ellipse-outline"} 
          size={24} 
          color={item.isCompleted ? "#4ECDC4" : "#6C63FF"} 
        />
      </TouchableOpacity>
      
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, item.isCompleted && styles.checkedText]}>
          {item.name}
        </Text>
        <Text style={styles.itemQuantity}>{item.quantity} {item.unit}</Text>
        <View style={[styles.categoryBadge, { backgroundColor: categories.find(c => c.name === item.category)?.color + '20' }]}>
          <Text style={[styles.categoryText, { color: categories.find(c => c.name === item.category)?.color }]}>
            {item.category}
          </Text>
        </View>
        {/* Deep link buttons */}
        <View style={{ flexDirection: 'row', marginTop: 4, gap: 6 }}>
          <TouchableOpacity onPress={() => Linking.openURL(getBigBasketLink(item.name))} style={{ padding: 2 }}>
            <Text style={{ color: '#6C63FF', fontSize: 12 }}>BigBasket</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL(getBlinkitLink(item.name))} style={{ padding: 2 }}>
            <Text style={{ color: '#4ECDC4', fontSize: 12 }}>Blinkit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL(getDunzoLink(item.name))} style={{ padding: 2 }}>
            <Text style={{ color: '#FF6B6B', fontSize: 12 }}>Dunzo</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteItem(item.id!)}
      >
        <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
      </TouchableOpacity>
    </View>
  );

  // const renderCategoryFilter = ({ item }: { item: string }) => { // No longer needed
  //   const cat = categories.find(c => c.name === item);
  //   return (
  //     <TouchableOpacity 
  //       style={[
  //         styles.categoryFilter,
  //         selectedCategory === item && styles.selectedCategory
  //       ]}
  //       onPress={() => setSelectedCategory(item)}
  //     >
  //       <MaterialCommunityIcons 
  //         name={cat?.icon as keyof typeof MaterialCommunityIcons.glyphMap} 
  //         size={20} 
  //         color={selectedCategory === item ? 'white' : cat?.color} 
  //       />
  //       <Text style={[
  //         styles.categoryFilterText,
  //         selectedCategory === item && styles.selectedCategoryText
  //       ]}>
  //         {item}
  //       </Text>
  //     </TouchableOpacity>
  //   );
  // };

  const stats = getCategoryStats();

  const today = new Date();
  const isSunday = today.getDay() === 0;

  // Toggle item completion
  const toggleItemCompleted = (itemId: string) => {
    setGroceryList((prev) => {
      const updated = prev.map(item =>
        item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
      );
      AsyncStorage.setItem('@groceryList', JSON.stringify(updated));
      return updated;
    });
  };

  // Filter groceryList to only show this week's items
  const currentWeekMonday = getCurrentWeekMondayISO();
  const thisWeeksGroceryList = groceryList.filter(item => item.weekStartDate === currentWeekMonday);
  const grouped = groupByCategory(thisWeeksGroceryList);

  // Stats
  const total = thisWeeksGroceryList.length;
  const completed = thisWeeksGroceryList.filter(item => item.isCompleted).length;
  const remaining = total - completed;

  // Animation for Blinkit button
  const blinkitAnim = new Animated.Value(1);
  const animateBlinkit = () => {
    blinkitAnim.setValue(1);
    Animated.sequence([
      Animated.timing(blinkitAnim, { toValue: 1.1, duration: 100, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.timing(blinkitAnim, { toValue: 1, duration: 100, useNativeDriver: true, easing: Easing.in(Easing.ease) })
    ]).start();
  };

  return (
    <SafeAreaContextView style={{ flex: 1, backgroundColor: 'white' }} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="transparent" barStyle="light-content" translucent />
      {/* Shopping List Gradient Header always at the top, not scrollable */}
      <LinearGradient colors={["#6C63FF", "#4ECDC4"]} style={{
        paddingTop: 32,
        paddingBottom: 24,
        paddingHorizontal: 0,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        elevation: 4,
        shadowColor: '#6C63FF',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        width: screenWidth,
        alignSelf: 'stretch',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, width: '100%' }}>
          <View>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: 'white', letterSpacing: 0.5 }}>Shopping List</Text>
            <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>{userName ? `${userName}'s list` : ''}</Text>
          </View>
          <UserAvatar />
        </View>
        {/* Progress bar */}
        <View style={{ marginTop: 18, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, height: 10, overflow: 'hidden', marginHorizontal: 24, width: screenWidth - 48, alignSelf: 'center' }}>
          <View style={{ width: `${total === 0 ? 0 : completed / total * 100}%`, height: 10, backgroundColor: '#fff', borderRadius: 8 }} />
        </View>
        <Text style={{ color: 'white', fontSize: 13, marginTop: 4, marginLeft: 24 }}>{completed} of {total} items bought</Text>
      </LinearGradient>
      {/* Main content area with white background, below the header */}
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        {thisWeeksGroceryList.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <MaterialCommunityIcons name="cart-outline" size={80} color="#E0E0E0" style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 20, color: '#888', fontWeight: 'bold', marginBottom: 8 }}>Your list is empty!</Text>
            <Text style={{ color: '#AAA', fontSize: 15, textAlign: 'center' }}>Add items to start planning your healthy week.</Text>
          </View>
        ) : (
          <ScrollView style={{ flex: 1, paddingHorizontal: 0, marginTop: 0 }} contentContainerStyle={{ paddingBottom: 0 }}>
            {Object.keys(grouped).map((cat) => (
              <View key={cat} style={{ marginTop: 24 }}>
                {/* Sticky Category Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F7FF', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 0, marginBottom: 8, shadowColor: '#6C63FF', shadowOpacity: 0.04, shadowRadius: 2, elevation: 1, width: screenWidth, alignSelf: 'stretch' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 18 }}>
                    <MaterialCommunityIcons name={categories.find(c => c.name === cat)?.icon as any || 'basket'} size={20} color={categories.find(c => c.name === cat)?.color || '#6C63FF'} style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#6C63FF', letterSpacing: 0.2 }}>{cat}</Text>
                  </View>
                </View>
                {grouped[cat].map((item) => (
                  <Animated.View key={item.id} style={{
                    backgroundColor: 'white',
                    borderRadius: 18,
                    marginBottom: 14,
                    marginHorizontal: 12,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    elevation: 2,
                  }}>
                    {/* Checkbox */}
                    <TouchableOpacity onPress={() => toggleItemCompleted(item.id!)} style={{ marginRight: 14 }}>
                      <Animated.View style={{
                        width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: item.isCompleted ? '#4ECDC4' : '#E0E0E0', backgroundColor: item.isCompleted ? '#E8F5E9' : '#fff', alignItems: 'center', justifyContent: 'center',
                        transform: [{ scale: item.isCompleted ? 1.1 : 1 }],
                      }}>
                        {item.isCompleted && <Ionicons name="checkmark" size={18} color="#4ECDC4" />}
                      </Animated.View>
                    </TouchableOpacity>
                    {/* Item Info */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 2 }}>{item.name}</Text>
                      <Text style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>{getSmartQuantity(item.name)}</Text>
                    </View>
                    {/* Blinkit Button */}
                    <Animated.View style={{ transform: [{ scale: blinkitAnim }] }}>
                      <TouchableOpacity
                        onPress={() => { animateBlinkit(); Linking.openURL(getBlinkitLink(item.name)); }}
                        style={{
                          backgroundColor: '#F7C102',
                          borderRadius: 16,
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 6,
                          paddingHorizontal: 14,
                          marginLeft: 8,
                          shadowColor: '#F7C102',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                          elevation: 2,
                        }}
                      >
                        <Ionicons name="cart" size={18} color="#222" style={{ marginRight: 6 }} />
                        <Text style={{ color: '#222', fontWeight: 'bold', fontSize: 14 }}>Blinkit</Text>
                      </TouchableOpacity>
                    </Animated.View>
                    {/* Swipe to delete (simple: show delete button) */}
                    <TouchableOpacity onPress={() => handleDeleteItem(item.id!)} style={{ marginLeft: 8, padding: 4 }}>
                      <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        onPress={() => {/* open add item modal or bottom sheet here */}}
        style={{
          position: 'absolute',
          bottom: 32,
          right: 28,
          backgroundColor: '#6C63FF',
          borderRadius: 32,
          width: 56,
          height: 56,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#6C63FF',
          shadowOpacity: 0.18,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </SafeAreaContextView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 20,
    gap: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryFilters: {
    marginTop: 20,
  },
  categoryFiltersContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  categoryFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedCategory: {
    backgroundColor: '#6C63FF',
  },
  categoryFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  selectedCategoryText: {
    color: 'white',
  },
  addItemContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  addItemForm: {
    flexDirection: 'row',
    gap: 8,
  },
  addItemInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  listContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 40,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  listContent: {
    gap: 8,
  },
  groceryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  checkedItem: {
    opacity: 0.6,
  },
  checkbox: {
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  checkedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  groceryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
  },
  groceryItemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  groceryItemCategory: {
    fontSize: 12,
    color: '#666',
    marginRight: 10,
  },
  groceryItemQuantity: {
    fontSize: 12,
    color: '#666',
  },
  noItemsText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 40,
  },
  completedSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  completedItemRow: {
    // No opacity or textDecorationLine here; only the name gets strikethrough
  },
  groceryItemNameCompleted: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
});

export default GroceryScreen;