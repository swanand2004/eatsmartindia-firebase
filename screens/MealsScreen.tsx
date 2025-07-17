import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  Modal
} from 'react-native';
import { SafeAreaView as SafeAreaContextView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { planService, DietPlan, DietPlanDay, DietPlanMeal, mealService, groceryService } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import { OnboardingService } from '../services/onboardingService';
import { useMeals } from '../context/MealContext';
import { Linking, Easing } from 'react-native';

const { width, height } = Dimensions.get('window');

const DIET_GOALS = [
  { id: 'weight_loss', name: 'Weight Loss' },
  { id: 'muscle_gain', name: 'Muscle Gain' },
  { id: 'balanced', name: 'Balanced Diet' },
  { id: 'diabetes', name: 'Diabetic' },
];

const mealTypes: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> = ['breakfast', 'lunch', 'dinner', 'snack'];

// Add a simple avatar icon for the header
const UserAvatar = () => (
  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }}>
    <Ionicons name="person" size={28} color="#6C63FF" />
  </View>
);
// Helper to group meals by type
const groupByType = (meals: DietPlanMeal[]): Record<string, DietPlanMeal[]> => {
  const groups: Record<string, DietPlanMeal[]> = { breakfast: [], lunch: [], snack: [], dinner: [] };
  meals.forEach((meal: DietPlanMeal) => {
    if (groups[meal.type]) groups[meal.type].push(meal);
  });
  return groups;
};

const MealScreen = () => {
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMeal, setSelectedMeal] = useState<any | null>(null);
  const { completion, toggleMealCompletion, plan, loading, refreshPlan } = useMeals();
  const [userGoal, setUserGoal] = useState<string>('');
  const [userDietType, setUserDietType] = useState<string>('');
  const [dates, setDates] = useState<Date[]>([]);

  // Animation for completion checkbox
  const checkAnim = useRef(new Animated.Value(1)).current;
  const animateCheck = () => {
    checkAnim.setValue(0.7);
    Animated.spring(checkAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  };

  // Animation for modal fade-in
  const modalOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (selectedMeal) {
      modalOpacity.setValue(0);
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedMeal]);

  // Generate dates based on plan's startDate and endDate
  useEffect(() => {
    if (plan?.startDate && plan?.endDate) {
      const startDate = new Date(plan.startDate);
      const endDate = new Date(plan.endDate);
      const today = new Date();
      
      // Generate dates from startDate to endDate
      const dateArray: Date[] = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        dateArray.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      setDates(dateArray);
      
      // Set selected date to today if it's within the plan range, otherwise set to start date
      const todayStr = today.toISOString().split('T')[0];
      const todayInPlan = dateArray.some(date => date.toISOString().split('T')[0] === todayStr);
      
      if (todayInPlan) {
        setSelectedDate(todayStr);
      } else {
        setSelectedDate(plan.startDate);
      }
    }
  }, [plan]);

  useEffect(() => {
    const fetchGoalAndDietType = async () => {
      if (currentUser?.uid) {
        const onboardingData = await OnboardingService.getOnboardingData(currentUser.uid);
        setUserGoal(onboardingData?.goal ? onboardingData.goal.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Personalized Meal Plan');
        setUserDietType(onboardingData?.dietaryRestrictions?.[0]
          ? onboardingData.dietaryRestrictions[0].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          : 'No Restrictions');
      }
    };
    fetchGoalAndDietType();
  }, [currentUser]);

  const handleMealPress = async (meal: DietPlanMeal, dateStr: string) => {
    // Check if this is a current day meal (only current day meals can be opened)
    const isCurrentDay = dateStr === new Date().toISOString().split('T')[0];
    if (!isCurrentDay) {
      // For past and future meals, don't allow opening
      return;
    }

    // If meal already has full details, use it directly
    if ((meal as any)?.ingredients && (meal as any)?.instructions && (meal as any)?.healthBenefits) {
      setSelectedMeal(meal);
      return;
    }
    let fullMeal = null;
    if (currentUser?.uid && meal.id) {
      try {
        // Try to fetch all user meals and find the full meal by id
        const userMeals = await mealService.getUserMeals(currentUser.uid);
        fullMeal = userMeals.find((m) => m.id === meal.id);
      } catch (e) {
        console.warn('Failed to fetch full meal details:', e);
      }
    }
    setSelectedMeal(fullMeal || meal); // fallback to DietPlanMeal if not found
  };

  // Handle marking meal as complete: update Firestore and local context
  const handleToggleComplete = async (dateStr: string, mealId: string) => {
    // Only allow completion toggle for current day meals
    const isCurrentDay = dateStr === new Date().toISOString().split('T')[0];
    if (!isCurrentDay || !plan || !plan.id) return;

    // Find meal's current completion status
    const day = plan.days.find((d: DietPlanDay) => d.date === dateStr);
    const meal = day?.meals.find((m: DietPlanMeal) => m.id === mealId);
    const newCompleted = !(meal?.completed);
    await planService.updateMealCompletion(plan.id, dateStr, mealId, newCompleted);
    // Refresh plan from context to update all screens
    await refreshPlan();
    // Optionally update context for instant UI feedback
    toggleMealCompletion(dateStr, mealId);
    animateCheck(); // animate checkmark
  };

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Loading...</Text></View>;
  }

  // Get selected day's meals from plan
  const selectedDay = plan?.days.find((d: DietPlanDay) => d.date === selectedDate);
  const goalName = userGoal || 'Personalized Meal Plan';

  // Group meals by type for sectioned display
  const groupedMeals = selectedDay?.meals ? groupByType(selectedDay.meals) : { breakfast: [], lunch: [], dinner: [], snack: [] };
  const mealTypeLabels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snacks',
  };

  // --- RESTORE ORIGINAL renderMealItem ---
  const renderMealItem = ({ item }: { item: DietPlanMeal }) => {
    const isCompleted = item.completed;
    const isCurrentDay = selectedDate === new Date().toISOString().split('T')[0];
    const isPastDay = new Date(selectedDate) < new Date(new Date().toISOString().split('T')[0]);
    const isFutureDay = new Date(selectedDate) > new Date(new Date().toISOString().split('T')[0]);
    // Determine if meal is interactive (only current day)
    const isInteractive = isCurrentDay;
    return (
      <TouchableOpacity
        activeOpacity={isInteractive ? 0.85 : 1}
        onPress={() => handleMealPress(item, selectedDate)}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          backgroundColor: isCompleted ? '#E8F5E9' : 'white',
          borderRadius: 16,
          marginBottom: 18,
          marginHorizontal: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
          padding: 10,
          minHeight: 90,
          opacity: isPastDay ? 0.75 : (isInteractive ? 1 : 0.8),
        }}
      >
        <Image 
          source={{ uri: item.imageUrl }} 
          style={{ 
            width: 80, 
            height: 80, 
            borderRadius: 12, 
            marginRight: 14, 
            ...(isPastDay ? { tintColor: '#bbb' } : {}),
          }}
        />
        <View style={{ flex: 1, justifyContent: 'space-between', height: 80 }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <MaterialCommunityIcons
                name={
                  item.type === 'breakfast' ? 'food-croissant' :
                  item.type === 'lunch' ? 'food' :
                  item.type === 'dinner' ? 'food-steak' : 'food-apple'
                }
                size={20}
                color={isPastDay ? '#bbb' : '#6C63FF'}
              />
              <Text style={{ fontSize: 13, color: isPastDay ? '#bbb' : '#6C63FF', fontWeight: '600', marginLeft: 6, textTransform: 'capitalize' }}>{item.type}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Text style={{ fontSize: 17, fontWeight: 'bold', color: isPastDay ? '#888' : '#333' }}>{item.name}</Text>
            </View>
            <Text style={{ fontSize: 13, color: isPastDay ? '#bbb' : '#666', marginBottom: 2 }}>{item.calories} kcal</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', marginLeft: 8, minWidth: 48 }}>
          {isFutureDay ? (
            <View style={{
              backgroundColor: '#F0F0F0',
              borderRadius: 20,
              padding: 8,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons name="lock-closed" size={24} color="#999" />
            </View>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => handleToggleComplete(selectedDate, item.id)}
                disabled={!isInteractive}
                style={{
                  backgroundColor: isCompleted ? '#4ECDC4' : '#F0F0F0',
                  borderRadius: 20,
                  padding: 8,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#4ECDC4',
                  shadowOpacity: isCompleted ? 0.2 : 0,
                  shadowRadius: 6,
                  elevation: isCompleted ? 2 : 0,
                  opacity: isInteractive ? 1 : 0.7,
                }}
              >
                <Ionicons
                  name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                  size={28}
                  color={isCompleted ? 'white' : (isPastDay ? '#bbb' : '#6C63FF')}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: '#fc8019',
                  borderRadius: 8,
                  padding: 4,
                  marginTop: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => Linking.openURL(`https://www.swiggy.com/search?query=${encodeURIComponent(item.name)}`)}
              >
                <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/1/13/Swiggy_logo.png' }} style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: 'white' }} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  // --- END RESTORE ---

  const renderDateItem = ({ item, index }: { item: Date; index: number }) => {
    const dateStr = item.toISOString().split('T')[0];
    const isSelected = dateStr === selectedDate;
    const isToday = item.toDateString() === new Date().toDateString();
    const isPastDay = item < new Date(new Date().toISOString().split('T')[0]);
    const isFutureDay = item > new Date(new Date().toISOString().split('T')[0]);
    
    const pillStyle = {
      marginRight: 14,
      width: 60,
      height: 52, // reduce height for compactness
      borderRadius: 30,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: isSelected ? 'white' : (isToday ? '#E3F2FD' : '#fff'),
      borderWidth: isSelected ? 3 : (isToday ? 2 : 1),
      borderColor: isSelected ? '#6C63FF' : (isToday ? '#6C63FF' : '#E0E0E0'),
      shadowColor: isSelected ? '#6C63FF' : '#000',
      shadowOpacity: isSelected ? 0.18 : 0.06,
      shadowRadius: isSelected ? 10 : 3,
      elevation: isSelected ? 4 : 1,
      opacity: isPastDay ? 0.75 : 1,
      // No scale transform for selected, keep size consistent
      transform: [{ scale: 1 }],
    };

    const dateTextColor = isSelected ? 'white' : (isToday ? '#6C63FF' : isPastDay ? '#bbb' : '#333');
    const dayTextColor = isSelected ? 'white' : (isToday ? '#6C63FF' : isPastDay ? '#bbb' : '#666');

    return (
      <TouchableOpacity
        onPress={() => setSelectedDate(dateStr)}
        style={[
          pillStyle,
          isSelected && {
            backgroundColor: 'white',
            borderWidth: 3,
            borderColor: '#6C63FF',
            shadowColor: '#6C63FF',
            shadowOpacity: 0.18,
            shadowRadius: 10,
            elevation: 4,
          },
        ]}
        activeOpacity={0.85}
      >
        <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <Text style={{
            fontSize: isSelected ? 14 : 13,
            color: isSelected ? '#6C63FF' : dayTextColor,
            fontWeight: 'bold',
            marginBottom: 0,
            letterSpacing: 0.5,
          }}>
            {item.toLocaleDateString('en-US', { weekday: 'short' })}
          </Text>
          <Text style={{
            fontSize: isSelected ? 20 : 17,
            fontWeight: 'bold',
            color: isSelected ? '#6C63FF' : dateTextColor,
            letterSpacing: 0.5,
            marginTop: 2,
          }}>
            {item.getDate()}
          </Text>
        </View>
        {/* Show past/future indicators */}
        {isPastDay && !isSelected && (
          <View style={[styles.dateIndicator, { backgroundColor: '#FFE0B2' }]} />
        )}
        {isFutureDay && !isSelected && (
          <View style={[styles.dateIndicator, { backgroundColor: '#E3F2FD' }]} />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Loading...</Text></View>;
  }

  if (selectedMeal) {
    // Restore: Show meal detail as a full screen, not a modal
    return (
      <SafeAreaContextView style={styles.detailContainer} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar backgroundColor="white" barStyle="dark-content" />
        <ScrollView style={styles.detailScroll}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity style={styles.backButton} onPress={() => setSelectedMeal(null)}>
              <Ionicons name="arrow-back" size={24} color="#6C63FF" />
              <Text style={styles.backText}>Back to meals</Text>
            </TouchableOpacity>
          </View>
          {/* Hero Image */}
          <View style={{ alignItems: 'center', marginBottom: 18 }}>
            <Image 
              source={{ uri: selectedMeal.imageUrl }} 
              style={{ width: '90%', height: 220, borderRadius: 24, marginTop: 8, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12 }} 
            />
          </View>
          {/* Meal Title & Type */}
          <Text style={{ fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 6, textAlign: 'center' }}>{selectedMeal.name}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 18 }}>
            <View style={{ backgroundColor: '#6C63FF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4, marginRight: 8 }}>
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14, textTransform: 'capitalize' }}>{selectedMeal.type || selectedMeal.mealType}</Text>
            </View>
          </View>
          {/* Nutrient Stats */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18, paddingHorizontal: 8 }}>
            <View style={{ alignItems: 'center', flex: 1, marginHorizontal: 2, backgroundColor: '#F3F4FB', borderRadius: 12, padding: 10 }}>
              <Ionicons name="flame" size={22} color="#6C63FF" />
              <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#6C63FF', marginTop: 2 }}>{selectedMeal.calories}</Text>
              <Text style={{ fontSize: 12, color: '#6C63FF' }}>Calories</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1, marginHorizontal: 2, backgroundColor: '#E8F5E9', borderRadius: 12, padding: 10 }}>
              <Ionicons name="barbell" size={22} color="#4ECDC4" />
              <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#4ECDC4', marginTop: 2 }}>{selectedMeal.protein}g</Text>
              <Text style={{ fontSize: 12, color: '#4ECDC4' }}>Protein</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1, marginHorizontal: 2, backgroundColor: '#FFF3E0', borderRadius: 12, padding: 10 }}>
              <Ionicons name="leaf" size={22} color="#FFA726" />
              <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#FFA726', marginTop: 2 }}>{selectedMeal.carbs}g</Text>
              <Text style={{ fontSize: 12, color: '#FFA726' }}>Carbs</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1, marginHorizontal: 2, backgroundColor: '#FBE9E7', borderRadius: 12, padding: 10 }}>
              <Ionicons name="water" size={22} color="#FF7043" />
              <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#FF7043', marginTop: 2 }}>{selectedMeal.fat}g</Text>
              <Text style={{ fontSize: 12, color: '#FF7043' }}>Fat</Text>
            </View>
          </View>
          {/* Ingredients Section */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginLeft: 8 }}>
            <Ionicons name="restaurant" size={20} color="#6C63FF" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#6C63FF' }}>Ingredients</Text>
          </View>
          <View style={{ backgroundColor: '#F3F4FB', borderRadius: 12, padding: 12, marginHorizontal: 8, marginBottom: 12 }}>
            {selectedMeal.ingredients && selectedMeal.ingredients.length > 0 ? (
              selectedMeal.ingredients.map((ingredient: string, index: number) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="ellipse" size={10} color="#6C63FF" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 15, color: '#333' }}>{ingredient}</Text>
                </View>
              ))
            ) : (
              <Text>No ingredients listed.</Text>
            )}
          </View>
          {/* Preparation Steps Section */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginLeft: 8 }}>
            <Ionicons name="list-circle" size={20} color="#6C63FF" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#6C63FF' }}>How to Prepare</Text>
          </View>
          <View style={{ backgroundColor: '#F3F4FB', borderRadius: 12, padding: 12, marginHorizontal: 8, marginBottom: 12 }}>
            {selectedMeal.instructions && selectedMeal.instructions.length > 0 ? (
              selectedMeal.instructions.map((step: string, index: number) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                  <View style={{ backgroundColor: '#6C63FF', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>{index + 1}</Text>
                  </View>
                  <Text style={{ fontSize: 15, color: '#333', flex: 1 }}>{step}</Text>
                </View>
              ))
            ) : (
              <Text>No instructions available.</Text>
            )}
          </View>
          {/* Health Benefits Section */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginLeft: 8 }}>
            <Ionicons name="heart-circle" size={20} color="#4ECDC4" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#4ECDC4' }}>Health Benefits</Text>
          </View>
          <View style={{ backgroundColor: '#E8F5E9', borderRadius: 12, padding: 12, marginHorizontal: 8, marginBottom: 12 }}>
            {selectedMeal.healthBenefits && selectedMeal.healthBenefits.length > 0 ? (
              selectedMeal.healthBenefits.map((benefit: string, index: number) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="checkmark-circle" size={18} color="#4ECDC4" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 15, color: '#333', flex: 1 }}>{benefit}</Text>
                </View>
              ))
            ) : (
              <Text>No health benefits listed.</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaContextView>
    );
  }

  // Determine the section title based on the selected date
  const getSectionTitle = () => {
    const selectedDateObj = new Date(selectedDate);
    const today = new Date(new Date().toISOString().split('T')[0]);
    
    if (selectedDateObj.toDateString() === today.toDateString()) {
      return "Today's Meals";
    } else {
      return selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
  };

  return (
    <SafeAreaContextView style={{ flex: 1, backgroundColor: 'white' }} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="transparent" barStyle="light-content" translucent />
      {/* Full-width Gradient Header like GroceryScreen */}
      {plan && (
        <>
          <Text style={{ color: '#333', fontWeight: 'bold', fontSize: 22, textAlign: 'center', marginTop: 12, marginBottom: 0 }}>
            {goalName}
          </Text>
          <Text style={{ color: '#666', fontSize: 14, fontWeight: '500', textAlign: 'center', marginBottom: 8 }}>
            {plan.startDate && plan.endDate ?
              `${new Date(plan.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}  —  ${new Date(plan.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : ''}
          </Text>
        </>
      )}
      {/* Dates Horizontal Scroll as separate section below header */}
      <View style={styles.datesContainer}>
        <FlatList
          data={dates}
          renderItem={renderDateItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 0, marginBottom: 0 }}
          keyExtractor={(item) => item.toISOString()}
        />
      </View>
      {/* Section Title */}
      <Text style={[styles.sectionTitle, { marginTop: 30, marginBottom: 0 }]}>{getSectionTitle()}</Text>
      {selectedDay?.meals && selectedDay.meals.length > 0 ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 0 }} showsVerticalScrollIndicator={false}>
          {selectedDay.meals.map((meal) => (
            <React.Fragment key={meal.id}>
              {renderMealItem({ item: meal })}
            </React.Fragment>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.noMealsContainer}>
          <Text style={styles.noMealsText}>No meals planned for this day</Text>
        </View>
      )}
    </SafeAreaContextView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA', // lighter background
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  detailScroll: {
    flex: 1,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  planDates: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  planGoal: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#E3F2FD',
  },
  weightLossGoal: {
    backgroundColor: '#FFEBEE',
  },
  muscleGainGoal: {
    backgroundColor: '#E3F2FD',
  },
  maintenanceGoal: {
    backgroundColor: '#E8F5E9',
  },
  goalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
  },
  dailyProgressContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  dailyProgressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  progressBarContainer: {
    height: 10,
    width: '100%',
    backgroundColor: '#F0F0F0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6C63FF',
    alignSelf: 'flex-end',
  },
  datesContainer: {
    marginBottom: 0,
  },
  datesList: {
    paddingHorizontal: 15,
    paddingVertical: 0,
    marginBottom: 0,
  },
  dateItem: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
  },
  selectedDateItem: {
    backgroundColor: '#6C63FF',
  },
  todayDateItem: {
    borderWidth: 2,
    borderColor: '#6C63FF',
  },
  todayIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6C63FF',
    marginTop: 5,
  },
  dateDay: {
    fontSize: 10,
    color: '#666',
  },
  selectedDateDay: {
    color: 'white',
  },
  todayDateText: {
    color: '#6C63FF',
  },
  dateNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 1,
  },
  selectedDateNumber: {
    color: 'white',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 20,
    marginBottom: 0, // was 2, now 0 to move title up
    marginTop: 0, // was 0, keep at 0 for no gap above
    letterSpacing: 0.2,
  },
  mealList: {
    paddingHorizontal: 20,
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff', // pure white for card
    borderRadius: 16,
    marginBottom: 24,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    padding: 14,
    minHeight: 90,
  },
  completedMeal: {
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4', // green highlight for completed
    backgroundColor: '#E8F5E9', // very light green
  },
  mealImage: {
    width: 100,
    height: '100%',
    resizeMode: 'cover',
  },
  mealDetails: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  mealTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  mealType: {
    fontSize: 12,
    color: '#6C63FF',
    fontWeight: '600',
    textTransform: 'capitalize',
    marginLeft: 5,
  },
  mealName: {
    fontSize: 18, // larger font
    fontWeight: '700', // bolder
    color: '#333',
    marginBottom: 2,
    letterSpacing: 0.1,
  },
  mealInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  caloriesBadge: {
    backgroundColor: '#F3F4FB', // lighter blue background
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
  },
  caloriesText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6C63FF', // blue accent
  },
  completeButton: {
    padding: 4,
  },
  noMealsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#F8F9FA',
  },
  noMealsText: {
    fontSize: 16,
    color: '#999',
  },
  // Meal Detail Styles
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  backText: {
    color: '#6C63FF',
    fontSize: 16,
    marginLeft: 10,
  },
  mealDetailImage: {
    width: '100%',
    height: 250,
  },
  mealInfoContainer: {
    padding: 20,
  },
  mealDetailName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  mealDetailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  mealDetailType: {
    fontSize: 14,
    color: '#6C63FF',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  mealDetailTime: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
    marginBottom: 8,
  },
  completionBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  completedBadge: {
    backgroundColor: '#E8F5E9',
  },
  completionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  nutrientGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  nutrientItem: {
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    width: '23%',
  },
  nutrientValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  nutrientLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 5,
  },
  sectionContainer: {
    marginBottom: 25,
  },
  ingredientsList: {
    marginBottom: 15,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6C63FF',
    marginRight: 10,
  },
  ingredientText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  instructionsList: {
    marginBottom: 15,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  stepNumberContainer: {
    backgroundColor: '#6C63FF',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  instructionText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  benefitsList: {
    marginBottom: 15,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  benefitText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  markCompleteButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
  },
  markCompleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6C63FF',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  dateIndicator: {
    position: 'absolute',
    bottom: 2,
    left: '50%',
    marginLeft: -5,
    width: 10,
    height: 3,
    borderRadius: 2,
  },
});

export default MealScreen;