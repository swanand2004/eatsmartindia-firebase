import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  Animated,
  RefreshControl,
  Platform,
  StatusBar,
  Modal,
  Pressable
} from 'react-native';
import { SafeAreaView as SafeAreaContextView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { OnboardingService } from '../services/onboardingService';
import { planService, DietPlan, DietPlanDay, DietPlanMeal } from '../services/firestoreService';
import { useMeals } from '../context/MealContext';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { mealsData } from '../data/mealsData';
import Svg, { Circle, Rect, G } from 'react-native-svg';
import { calculateCalorieAndProteinGoals } from '../services/onboardingService';
import { toast } from 'sonner-native';
import { useTranslation } from 'react-i18next';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

type HomeScreenProps = {
  navigation: {
    navigate: (screen: string) => void;
  };
};

type MealItem = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl: string;
  completed: boolean;
  time: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
};

const WATER_GOAL = 8;

const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { completion, toggleMealCompletion, plan, refreshPlan, loading } = useMeals();
  const [userName, setUserName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [todaysMeals, setTodaysMeals] = useState<DietPlanMeal[]>([]);
  const [streak, setStreak] = useState(0);
  const [lastLoginDate, setLastLoginDate] = useState('');
  const [userOnboarding, setUserOnboarding] = useState<any>(null);
  const [waterCount, setWaterCount] = useState(0);
  const [waterGoal, setWaterGoal] = useState(WATER_GOAL);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const route = useRoute();
  const fabScale = useRef(new Animated.Value(1)).current;
  const handleFabPressIn = () => {
    Animated.spring(fabScale, {
      toValue: 1.12,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  };
  const handleFabPressOut = () => {
    Animated.spring(fabScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  };

  // Streak management functions
  const updateStreak = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const storedLastLogin = await AsyncStorage.getItem(`@lastLogin_${currentUser?.uid}`);
      const storedStreak = await AsyncStorage.getItem(`@streak_${currentUser?.uid}`);
      let currentStreak = storedStreak ? parseInt(storedStreak) : 0;

      // Get today's meals from the plan
      const todayPlan = plan?.days.find((d) => d.date === today);
      const allMealsCompleted = todayPlan && todayPlan.meals.length > 0 && todayPlan.meals.every(m => m.completed);

      if (!allMealsCompleted) {
        // If not all meals are completed, do not increment streak or update lastLogin
        setStreak(currentStreak);
        setLastLoginDate(today);
        return;
      }

      if (storedLastLogin) {
        const lastLogin = new Date(storedLastLogin);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (storedLastLogin === today) {
          // Already logged in today, don't update streak
          setStreak(currentStreak);
          setLastLoginDate(today);
          return;
        } else if (storedLastLogin === yesterday.toISOString().split('T')[0]) {
          // Consecutive day
          currentStreak += 1;
        } else {
          // Break in streak
          currentStreak = 1;
        }
      } else {
        // First time login
        currentStreak = 1;
      }

      // Save new streak and login date
      await AsyncStorage.setItem(`@streak_${currentUser?.uid}`, currentStreak.toString());
      await AsyncStorage.setItem(`@lastLogin_${currentUser?.uid}`, today);

      setStreak(currentStreak);
      setLastLoginDate(today);
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  // Fetch user name and onboarding info
  useEffect(() => {
    const fetchUserName = async () => {
      if (currentUser?.uid) {
        try {
          const onboardingData = await OnboardingService.getOnboardingData(currentUser.uid);
          setUserName(onboardingData?.name || 'User');
          setUserOnboarding(onboardingData);
          await updateStreak();
        } catch (error) {
          toast.error(t('error_fetch_user'));
        }
      }
    };
    fetchUserName();
  }, [currentUser]);

  // Update todaysMeals when plan changes
  useEffect(() => {
    if (plan) {
      const todayStr = new Date().toISOString().split('T')[0];
      const today = plan.days.find((d: DietPlanDay) => d.date === todayStr);
      setTodaysMeals(today?.meals || []);
    }
  }, [plan]);

  // Replace useEffect for fetching plan with useFocusEffect for refresh on focus
  useFocusEffect(
    React.useCallback(() => {
      const fetchPlan = async () => {
        if (currentUser?.uid) {
          try {
            let userPlan = await planService.getUserPlan(currentUser.uid);
            if (!userPlan) {
              // No plan found, generate a new one using onboarding info
              const onboardingData = await OnboardingService.getOnboardingData(currentUser.uid);
              const selectedGoal = onboardingData?.goal || '';
              const selectedDietType = onboardingData?.dietaryRestrictions?.[0] || '';
              const selectedCuisines = onboardingData?.cuisinePreferences || [];
              const selectedAllergies = onboardingData?.allergies || [];
              const selectedSpiceLevel = onboardingData?.spiceLevel || '';
              const selectedCookingTime = onboardingData?.cookingTime || '';
              const selectedConditions = onboardingData?.healthConditions || [];
              // Get smart goals
              const { caloriesGoal, proteinGoal } = calculateCalorieAndProteinGoals({
                height: onboardingData?.height,
                weight: onboardingData?.weight,
                age: onboardingData?.age,
                gender: onboardingData?.gender,
                activityLevel: onboardingData?.activityLevel,
                goal: onboardingData?.goal,
              });
              const today = new Date();
              const days = [];
              for (let i = 0; i < 30; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];
                // Map onboarding goal to mealsData dietGoal
                let mappedGoal = selectedGoal;
                if (selectedGoal === 'lose_weight') mappedGoal = 'weight_loss';
                else if (selectedGoal === 'maintain_weight') mappedGoal = 'balanced';
                else if (selectedGoal === 'gain_weight') mappedGoal = 'muscle_gain';
                else if (selectedGoal === 'build_muscle') mappedGoal = 'muscle_gain';
                const filteredMeals = mealsData.filter(m =>
                  (!selectedGoal || m.dietGoal === mappedGoal) &&
                  (!selectedDietType || m.dietType === selectedDietType) &&
                  (!selectedCuisines.length || selectedCuisines.includes(m.cuisine)) &&
                  (!selectedAllergies.length || !m.allergens.some(a => selectedAllergies.includes(a))) &&
                  (!selectedSpiceLevel || m.spiceLevel === selectedSpiceLevel) &&
                  (!selectedCookingTime || m.cookingTime === selectedCookingTime) &&
                  (!selectedConditions.length || !m.healthConditions.some(hc => selectedConditions.includes(hc)))
                );
                // Smart meal assignment (brute-force all combinations for best match)
                const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner'];
                const pools = mealTypes.map(type => {
                  let pool = filteredMeals.filter(m => m.category === type);
                  if (pool.length === 0) pool = mealsData.filter(m => m.category === type);
                  return pool;
                });
                // If any pool is empty, skip this day
                if (pools.some(pool => pool.length === 0)) {
                  days.push({ date: dateStr, meals: [] });
                  continue;
                }
                let bestCombo = null;
                let bestScore = Number.POSITIVE_INFINITY;
                // Brute-force all combinations
                for (const b of pools[0]) {
                  for (const l of pools[1]) {
                    for (const s of pools[2]) {
                      for (const d of pools[3]) {
                        const totalCalories = (b.calories || 0) + (l.calories || 0) + (s.calories || 0) + (d.calories || 0);
                        const totalProtein = (b.protein || 0) + (l.protein || 0) + (s.protein || 0) + (d.protein || 0);
                        const calorieDiff = Math.abs(caloriesGoal - totalCalories);
                        const proteinDiff = Math.abs(proteinGoal - totalProtein);
                        const score = calorieDiff + proteinDiff;
                        if (score < bestScore) {
                          bestScore = score;
                          bestCombo = [b, l, s, d];
                        }
                      }
                    }
                  }
                }
                const meals = bestCombo
                  ? bestCombo.map(meal => ({ ...meal, completed: false, type: meal.category }))
                  : [];
                days.push({ date: dateStr, meals });
              }
              const plan = {
                userId: currentUser.uid,
                startDate: days[0].date,
                endDate: days[days.length - 1].date,
                days,
              };
              await planService.createPlan(plan);
              // Reset streak and lastLogin when a new plan is created
              await AsyncStorage.setItem(`@streak_${currentUser?.uid}`, '0');
              await AsyncStorage.setItem(`@lastLogin_${currentUser?.uid}`, '');
              userPlan = await planService.getUserPlan(currentUser.uid);
            }
            // Get today's date string (YYYY-MM-DD)
            const todayStr = new Date().toISOString().split('T')[0];
            const today = userPlan?.days.find((d: DietPlanDay) => d.date === todayStr);
            setTodaysMeals(today?.meals || []);
          } catch (error) {
            toast.error(t('error_fetch_plan'));
          }
        }
      };
      fetchPlan();
    }, [currentUser])
  );

  useEffect(() => {
    const params = (route as any).params;
    if (params && params.forceStreakRefresh) {
      updateStreak();
    }
  }, [(route as any).params?.forceStreakRefresh]);

  // Load water count for today from AsyncStorage
  useEffect(() => {
    const loadWater = async () => {
      const today = new Date().toISOString().split('T')[0];
      const saved = await AsyncStorage.getItem(`@water_${today}_${currentUser?.uid}`);
      setWaterCount(saved ? parseInt(saved) : 0);
    };
    loadWater();
  }, [currentUser]);
  // Save water count on change
  useEffect(() => {
    const saveWater = async () => {
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(`@water_${today}_${currentUser?.uid}`, waterCount.toString());
    };
    saveWater();
  }, [waterCount, currentUser]);
  // Load water goal from AsyncStorage
  useEffect(() => {
    const loadGoal = async () => {
      const saved = await AsyncStorage.getItem(`@water_goal_${currentUser?.uid}`);
      setWaterGoal(saved ? parseInt(saved) : WATER_GOAL);
    };
    loadGoal();
  }, [currentUser]);
  // Save water goal on change
  const saveGoal = async (goal: number) => {
    setWaterGoal(goal);
    await AsyncStorage.setItem(`@water_goal_${currentUser?.uid}`, goal.toString());
    setGoalModalVisible(false);
    // Reset water count if new goal is less than current count
    if (waterCount > goal) setWaterCount(goal);
  };
  const addWater = () => setWaterCount(waterCount < waterGoal ? waterCount + 1 : waterGoal);
  const removeWater = () => setWaterCount(waterCount > 0 ? waterCount - 1 : 0);

  // Get today's date string (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];

  // --- Matrix Stats ---
  const { caloriesGoal, proteinGoal } = userOnboarding
    ? calculateCalorieAndProteinGoals({
        height: userOnboarding.height,
        weight: userOnboarding.weight,
        age: userOnboarding.age,
        gender: userOnboarding.gender,
        activityLevel: userOnboarding.activityLevel,
        goal: userOnboarding.goal,
      })
    : { caloriesGoal: 0, proteinGoal: 0 };
  // Use plan's completion data
  const mealsWithCompletion = todaysMeals;
  const proteinConsumed = mealsWithCompletion.reduce((sum, m) => sum + (m.completed ? m.protein || 0 : 0), 0);
  const caloriesConsumed = mealsWithCompletion.reduce((sum, m) => sum + (m.completed ? m.calories || 0 : 0), 0);
  const mealsCompleted = mealsWithCompletion.filter(m => m.completed).length;
  const totalMeals = mealsWithCompletion.length;
  const dailyCompletion = totalMeals ? Math.round((mealsCompleted / totalMeals) * 100) : 0;

  // After userName and onboarding data are loaded
  const userGoal = userOnboarding?.goal;
  const userDiet = userOnboarding?.dietaryRestrictions?.[0];
  const goalLabel = userGoal ? t(`goal_${userGoal}`) : null;
  const dietLabel = userDiet ? t(`diet_${userDiet}`) : null;

  // Greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greeting_morning');
    if (hour < 18) return t('greeting_afternoon');
    return t('greeting_evening');
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Attractive meal card (no toggle)
  const renderMealItem = useCallback(({ item }: { item: DietPlanMeal }) => (
    <View
      style={[styles.mealCard, item.completed && styles.completedMeal]}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.mealImage} />
      <View style={styles.mealDetails}>
        <View style={styles.mealTypeRow}>
          <MaterialCommunityIcons 
            name={
              item.type === 'breakfast' ? 'food-croissant' :
              item.type === 'lunch' ? 'food' :
              item.type === 'dinner' ? 'food-steak' : 'food-apple'
            }
            size={20}
            color="#6C63FF"
          />
          <Text style={styles.mealType}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
        </View>
        <Text style={styles.mealName}>{item.name}</Text>
        <View style={styles.mealInfoRow}>
          <View style={styles.caloriesBadge}>
            <Text style={styles.caloriesText}>{item.calories} kcal</Text>
          </View>
          {/* Removed item.time, not present in DietPlanMeal */}
          {item.completed && (
            <Ionicons name="checkmark-circle" size={20} color="#4ECDC4" style={{ marginLeft: 8 }} />
          )}
        </View>
      </View>
    </View>
  ), []);

  // --- Weekly Progress Data ---
  // Get this week's dates (Mon-Sun)
  const getWeekDates = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 (Sun) - 6 (Sat)
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };
  const weekDates = getWeekDates();
  // For each day, get completion ratio
  const weekCompletion = weekDates.map((date) => {
    const dateStr = date.toISOString().split('T')[0];
    const day = plan?.days.find((d) => d.date === dateStr);
    if (!day) return { completed: 0, total: 0 };
    const completed = day.meals.filter((m) => m.completed).length;
    const total = day.meals.length;
    return { completed, total };
  });
  const totalCompleted = weekCompletion.reduce((sum, d) => sum + d.completed, 0);
  const weekTotalMeals = weekCompletion.reduce((sum, d) => sum + d.total, 0);
  const weekPercent = weekTotalMeals ? Math.round((totalCompleted / weekTotalMeals) * 100) : 0;
  const perfectDays = weekCompletion.filter(d => d.completed === d.total && d.total > 0).length;
  // --- Progress Ring ---
  const RADIUS = 48;
  const STROKE = 10;
  const CIRCUM = 2 * Math.PI * RADIUS;
  const progress = weekTotalMeals ? totalCompleted / weekTotalMeals : 0;
  // --- Analytics Data ---
  // Get last week's dates (Mon-Sun)
  const getLastWeekDates = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) - 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lastMonday);
      d.setDate(lastMonday.getDate() + i);
      return d;
    });
  };
  const lastWeekDates = getLastWeekDates();
  const lastWeekCompletion = lastWeekDates.map((date) => {
    const dateStr = date.toISOString().split('T')[0];
    const day = plan?.days.find((d) => d.date === dateStr);
    if (!day) return { completed: 0, total: 0 };
    const completed = day.meals.filter((m) => m.completed).length;
    const total = day.meals.length;
    return { completed, total };
  });
  const lastWeekTotalCompleted = lastWeekCompletion.reduce((sum, d) => sum + d.completed, 0);
  const lastWeekTotalMeals = lastWeekCompletion.reduce((sum, d) => sum + d.total, 0);
  // Bar chart data
  const barMax = Math.max(...weekCompletion.map(d => d.total), 1);
  // Pie chart data
  const missed = weekTotalMeals - totalCompleted;
  // Best/worst day
  const bestDayIdx = weekCompletion.reduce((best, d, i, arr) => (d.completed > arr[best].completed ? i : best), 0);
  const worstDayIdx = weekCompletion.reduce((worst, d, i, arr) => (d.completed < arr[worst].completed ? i : worst), 0);
  // Comparison
  const diff = totalCompleted - lastWeekTotalCompleted;
  // --- UI ---

  return (
    <SafeAreaContextView style={{ flex: 1, backgroundColor: 'white' }} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6C63FF"
          />
        }
      >
        {/* Header */}
        <View style={styles.header} accessible accessibilityLabel={`Greeting. ${getGreeting()}, ${userName}`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Text style={styles.greeting}>{getGreeting()}, </Text>
            <Text style={[styles.userName, { marginLeft: 4 }]}>{userName}</Text>
          </View>
          <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          {/* Removed personalized message for goal and diet */}
        </View>

        {/* Matrix Stats */}
        <View style={{ paddingHorizontal: 24 }}>
          <View style={[styles.matrixRow, { alignItems: 'stretch' }]}> 
            <View style={[styles.matrixBox, { backgroundColor: '#E3F6FC' }]}> 
              <Text style={styles.matrixValue}>{proteinConsumed}g</Text>
              <View style={styles.matrixProgressBar}>
                <View style={[styles.matrixProgressFill, { backgroundColor: '#4ECDC4', width: `${Math.min(100, (proteinConsumed / proteinGoal) * 100)}%` }]} />
              </View>
              <Text style={styles.matrixLabel}>Protein</Text>
              <Text style={styles.matrixGoal}>{proteinGoal}g goal</Text>
            </View>
            <View style={[styles.matrixBox, { backgroundColor: '#F3E8FF' }]}> 
              <Text style={styles.matrixValue}>{caloriesConsumed}</Text>
              <View style={styles.matrixProgressBar}>
                <View style={[styles.matrixProgressFill, { backgroundColor: '#6C63FF', width: `${Math.min(100, (caloriesConsumed / caloriesGoal) * 100)}%` }]} />
              </View>
              <Text style={styles.matrixLabel}>Calories</Text>
              <Text style={styles.matrixGoal}>{caloriesGoal} goal</Text>
            </View>
          </View>
          <View style={[styles.matrixRow, { alignItems: 'stretch' }]}> 
            <View style={[styles.matrixBox, { backgroundColor: '#FFF6E3' }]}> 
              <Text style={styles.matrixValue}>{mealsCompleted}/{totalMeals}</Text>
              <View style={styles.matrixProgressBar}>
                <View style={[styles.matrixProgressFill, { backgroundColor: '#FFB75E', width: `${Math.min(100, (mealsCompleted / (totalMeals || 1)) * 100)}%` }]} />
              </View>
              <Text style={styles.matrixLabel}>Meals</Text>
              <Text style={styles.matrixGoal}>Daily meals</Text>
            </View>
            <View style={[styles.matrixBox, { backgroundColor: '#FFE3E3' }]}> 
              <Text style={styles.matrixValue}>{dailyCompletion}%</Text>
              <View style={styles.matrixProgressBar}>
                <View style={[styles.matrixProgressFill, { backgroundColor: '#FF6B6B', width: `${dailyCompletion}%` }]} />
              </View>
              <Text style={styles.matrixLabel}>Today</Text>
              <Text style={styles.matrixGoal}>Daily goal</Text>
            </View>
          </View>
        </View>
        {/* Streak Banner */}
        <View style={styles.streakBanner}>
          <View style={styles.streakContent}>
            <View style={styles.streakIconContainer}>
              <LottieView
                source={require('../assets/fire-animation.json')}
                autoPlay
                loop
                style={{ width: 40, height: 40 }}
              />
            </View>
            <View style={styles.streakTextContainer}>
              <Text style={styles.streakCount}>{t('streak')} {streak} {streak === 1 ? t('day') : t('days')}</Text>
              <Text style={styles.streakSubtitle}>
                {streak === 0 ? t('start_journey') : 
                 streak === 1 ? t('great_start') :
                 streak < 7 ? t('building_habit') :
                 streak < 30 ? t('amazing') :
                 t('unstoppable')}
              </Text>
            </View>
          </View>
        </View>
        {/* Today's Meals */}
        <View style={styles.section} accessible accessibilityLabel={`${t('todays_meals')} section. Swipe horizontally to view your meals for today.`}> 
          <Text style={styles.sectionTitle}>{t('todays_meals')}</Text>
          <FlatList
            data={todaysMeals}
            renderItem={renderMealItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.horizontalMealList}
          />
        </View>
        {/* Water Goal Tracker */}
        <View style={styles.section} accessible accessibilityLabel={`Water tracker. ${waterCount} of ${waterGoal} glasses drunk.`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.sectionTitle}>Water Goal</Text>
            <TouchableOpacity onPress={() => setGoalModalVisible(true)} accessibilityLabel="Set water goal" accessible>
              <Ionicons name="settings-outline" size={22} color="#4ECDC4" />
            </TouchableOpacity>
          </View>
          <View style={styles.waterRow}>
            {[...Array(waterGoal)].map((_, i) => (
              <MaterialCommunityIcons
                key={i}
                name={i < waterCount ? 'cup' : 'cup-outline'}
                size={28}
                color={i < waterCount ? '#4ECDC4' : '#B2F1E5'}
                style={{ marginHorizontal: 2 }}
                accessibilityLabel={i < waterCount ? `Glass ${i+1} filled` : `Glass ${i+1} empty`}
                accessible
              />
            ))}
          </View>
          <View style={styles.waterControls}>
            <TouchableOpacity onPress={removeWater} style={styles.waterButton} accessibilityLabel="Remove a glass" accessible>
              <Ionicons name="remove-circle" size={28} color="#FF6B6B" />
            </TouchableOpacity>
            <Text style={styles.waterCountText}>{waterCount} / {waterGoal} glasses</Text>
            <TouchableOpacity onPress={addWater} style={styles.waterButton} accessibilityLabel="Add a glass" accessible>
              <Ionicons name="add-circle" size={28} color="#4ECDC4" />
            </TouchableOpacity>
          </View>
          <View style={styles.waterProgressBarBg}>
            <View style={[styles.waterProgressBarFill, { width: `${(waterCount/waterGoal)*100}%` }]} />
          </View>
        </View>
        {/* Water Goal Modal */}
        <Modal
          visible={goalModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setGoalModalVisible(false)}
        >
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setGoalModalVisible(false)} />
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Set Water Goal</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              {[...Array(10)].map((_, i) => {
                const goal = i + 6;
                return (
                  <TouchableOpacity
                    key={goal}
                    onPress={() => saveGoal(goal)}
                    style={{
                      backgroundColor: waterGoal === goal ? '#4ECDC4' : '#F0F0F0',
                      borderRadius: 16,
                      padding: 8,
                      marginHorizontal: 2,
                    }}
                    accessibilityLabel={`Set goal to ${goal} glasses`}
                    accessible
                  >
                    <Text style={{ color: waterGoal === goal ? 'white' : '#333', fontWeight: 'bold' }}>{goal}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={() => setGoalModalVisible(false)} style={{ marginTop: 8 }}>
              <Text style={{ color: '#6C63FF', fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </ScrollView>
      {/* Floating Action Button (FAB) for main CTA */}
      {/* Remove the Animated.View and TouchableOpacity for the FAB (plus sign) */}
    </SafeAreaContextView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 24,
    backgroundColor: 'white',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 0,
    letterSpacing: 0.2,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 0,
    letterSpacing: 0.2,
  },
  date: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  personalizedMessage: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 16, // Reduced from 24 to 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6C63FF',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  horizontalMealList: {
    paddingBottom: 8,
  },
  mealCard: {
    width: 120,
    backgroundColor: 'white',
    borderRadius: 12,
    marginRight: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  completedMeal: {
    borderColor: '#4ECDC4',
  },
  mealImage: {
    width: '100%',
    height: 60,
    resizeMode: 'cover',
  },
  mealDetails: {
    padding: 8,
  },
  mealTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mealType: {
    fontSize: 10,
    color: '#6C63FF',
    fontWeight: '600',
    textTransform: 'capitalize',
    marginLeft: 4,
  },
  mealName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  mealInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  caloriesBadge: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
  },
  caloriesText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  mealTime: {
    fontSize: 12,
    color: '#666',
  },
  // New styles for stats
  statsContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
    marginTop: 18,
  },
  matrixRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    columnGap: 8,
    alignItems: 'stretch', // Ensure all children fill the row height
  },
  matrixBox: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
    height: 100, // Fixed height for all boxes
    borderRadius: 14,
    paddingVertical: 12, // Reduced for more compact look
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  matrixValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  matrixLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  // New styles for colorful cards
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardText: {
    color: 'white',
  },
  // Streak banner styles
  streakBanner: {
    backgroundColor: 'rgba(108, 99, 255, 0.18)', // Soft blue background
    borderRadius: 10,
    paddingVertical: 12, // Increased for more height
    paddingHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, // Softer shadow
    shadowRadius: 1,
    elevation: 0, // Remove elevation for a flatter look
    alignSelf: 'center',
    maxWidth: 420, // Further increased width
    minWidth: 320, // Ensure it doesn't get too small on small screens
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakIconContainer: {
    width: 40, // Increased size
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12, // More space for bigger icon
  },
  streakTextContainer: {
    flex: 1,
  },
  streakCount: {
    fontSize: 18, // Larger font
    fontWeight: '600', // Slightly less bold
    color: '#3A3A8C', // Deep blue text
    opacity: 1, // Fully visible
    marginBottom: 0,
  },
  streakSubtitle: {
    fontSize: 13, // Larger font
    color: '#3A3A8C', // Deep blue subtitle
    opacity: 1, // Fully visible
  },
  // Weekly progress styles
  weeklyProgressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  weekDayContainer: {
    alignItems: 'center',
    flex: 1,
  },
  weekDayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  todayLabel: {
    color: '#6C63FF',
    fontWeight: 'bold',
  },
  weekDayProgress: {
    width: 8,
    height: 60,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  weekDayFill: {
    backgroundColor: '#6C63FF',
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderRadius: 4,
  },
  weekDayPercentage: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  weeklyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  weeklyStatItem: {
    alignItems: 'center',
  },
  weeklyStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6C63FF',
    marginBottom: 4,
  },
  weeklyStatLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  // Add styles for the progress bar inside matrix boxes
  matrixProgressBar: {
    height: 4,
    width: '70%',
    alignSelf: 'center',
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 6,
  },
  matrixProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  matrixGoal: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  waterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 8,
  },
  waterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  waterButton: {
    padding: 8,
  },
  waterCountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 12,
  },
  waterProgressBarBg: {
    height: 8,
    backgroundColor: '#E0F7FA',
    borderRadius: 4,
    marginTop: 8,
    marginHorizontal: 24,
    overflow: 'hidden',
  },
  waterProgressBarFill: {
    height: 8,
    backgroundColor: '#4ECDC4',
    borderRadius: 4,
  },
});

export default HomeScreen;