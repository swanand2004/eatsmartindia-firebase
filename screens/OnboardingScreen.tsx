import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  KeyboardAvoidingView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { OnboardingService, OnboardingData } from '../services/onboardingService';
import { planService, DietPlan, DietPlanDay, DietPlanMeal } from '../services/firestoreService';
import { mealsData } from '../data/mealsData';

type RootStackParamList = {
  Home: undefined;
  Profile: undefined;
  Onboarding: undefined;
};

type OnboardingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

const { width } = Dimensions.get('window');

type Option = {
  id: string;
  name: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  description?: string;
  image?: string;
};

type CuisineOption = Option & { description: string };
type DietGoalOption = Option & { description: string };
type ActivityLevelOption = Option & { description: string };
type HealthConditionOption = Option & { severity: 'low' | 'medium' | 'high' };

const DIET_GOALS: DietGoalOption[] = [
  { id: 'weight_loss', name: 'Weight Loss', icon: 'scale-bathroom', description: 'Calorie-controlled meals to help you shed extra weight' },
  { id: 'muscle_gain', name: 'Muscle Gain', icon: 'arm-flex', description: 'Protein-rich meals to support muscle growth' },
  { id: 'balanced', name: 'Balanced Diet', icon: 'nutrition', description: 'Well-rounded nutrition for overall health' },
  { id: 'diabetes', name: 'Diabetic', icon: 'diabetes', description: 'Low glycemic index foods to manage blood sugar' },
];

const DIET_TYPES: Option[] = [
  { id: 'veg', name: 'Vegetarian', icon: 'leaf' },
  { id: 'non_veg', name: 'Non-Vegetarian', icon: 'food-steak' },
  { id: 'jain', name: 'Jain', icon: 'fruit-watermelon' },
];

const CUISINES: CuisineOption[] = [
  { 
    id: 'north_indian', 
    name: 'North Indian', 
    description: 'Punjabi, Kashmiri, Mughlai', 
    image: 'north_indian_thali' 
  },
  { 
    id: 'south_indian', 
    name: 'South Indian', 
    description: 'Tamil, Telugu, Kannada, Malayalam', 
    image: 'south_indian_thali' 
  },
  { 
    id: 'east_indian', 
    name: 'East Indian', 
    description: 'Bengali, Odia, Assamese', 
    image: 'bengali_food_platter' 
  },
  { 
    id: 'west_indian', 
    name: 'West Indian', 
    description: 'Maharashtrian, Gujarati, Rajasthani', 
    image: 'maharashtrian_food_platter' 
  },
];

const ACTIVITY_LEVELS: ActivityLevelOption[] = [
  { id: 'sedentary', name: 'Sedentary', icon: 'sofa', description: 'Little or no exercise' },
  { id: 'moderate', name: 'Moderately Active', icon: 'run', description: '3-5 days/week' },
  { id: 'very', name: 'Very Active', icon: 'bike', description: '6-7 days/week' },
];

const ALLERGIES: Option[] = [
  { id: 'dairy', name: 'Dairy', icon: 'cheese' },
  { id: 'nuts', name: 'Nuts', icon: 'peanut' },
  { id: 'gluten', name: 'Gluten', icon: 'barley' },
  { id: 'seafood', name: 'Seafood', icon: 'fish' },
  { id: 'eggs', name: 'Eggs', icon: 'egg' },
  { id: 'soy', name: 'Soy', icon: 'seed' },
];

const COOKING_TIMES: Option[] = [
  { id: 'quick', name: 'Quick (< 15 min)', icon: 'timer-sand' },
  { id: 'medium', name: 'Medium (15-30 min)', icon: 'timer-outline' },
  { id: 'long', name: 'Elaborate (> 30 min)', icon: 'pot-steam' },
];

const SPICE_LEVELS: Option[] = [
  { id: 'mild', name: 'Mild', icon: 'thermometer-low' },
  { id: 'medium', name: 'Medium', icon: 'thermometer' },
  { id: 'spicy', name: 'Spicy', icon: 'thermometer-high' },
];

const HEALTH_CONDITIONS: HealthConditionOption[] = [
  { id: 'diabetes', name: 'Diabetes', icon: 'needle', severity: 'high' },
  { id: 'hypertension', name: 'Hypertension', icon: 'heart-pulse', severity: 'high' },
  { id: 'pcos', name: 'PCOS', icon: 'gender-female', severity: 'medium' },
  { id: 'thyroid', name: 'Thyroid', icon: 'atom', severity: 'medium' },
  { id: 'cholesterol', name: 'High Cholesterol', icon: 'water-alert', severity: 'high' },
  { id: 'ibs', name: 'IBS', icon: 'stomach', severity: 'medium' },
  { id: 'heart_disease', name: 'Heart Disease', icon: 'heart', severity: 'high' },
  { id: 'kidney_disease', name: 'Kidney Disease', icon: 'water', severity: 'high' },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bmi, setBmi] = useState<number | null>(null);
  const [idealWeightRange, setIdealWeightRange] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [selectedDietType, setSelectedDietType] = useState('');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedActivityLevel, setSelectedActivityLevel] = useState('');
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedCookingTime, setSelectedCookingTime] = useState('');
  const [selectedSpiceLevel, setSelectedSpiceLevel] = useState('');
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [customCondition, setCustomCondition] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (currentStep + 1) / 10, // 10 steps now with cooking time
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  useEffect(() => {
    if (height && weight) {
      const heightInMeters = parseFloat(height) / 100;
      const weightInKg = parseFloat(weight);
      const bmiValue = weightInKg / (heightInMeters * heightInMeters);
      setBmi(parseFloat(bmiValue.toFixed(1)));

      const minWeight = (18.5 * (heightInMeters * heightInMeters)).toFixed(1);
      const maxWeight = (24.9 * (heightInMeters * heightInMeters)).toFixed(1);
      setIdealWeightRange(`${minWeight} - ${maxWeight} kg`);
    }
  }, [height, weight]);

  // Load existing onboarding data when component mounts
  useEffect(() => {
    const loadExistingData = async () => {
      if (!currentUser) return;
      
      try {
        const existingData = await OnboardingService.getOnboardingData(currentUser.uid);
        if (existingData) {
          // Pre-fill the form with existing data
          setName(existingData.name || '');
          setAge(existingData.age?.toString() || '');
          setGender(existingData.gender || '');
          setHeight(existingData.height?.toString() || '');
          setWeight(existingData.weight?.toString() || '');
          setSelectedGoal(existingData.goal || '');
          setSelectedDietType(existingData.dietaryRestrictions?.[0] || '');
          setSelectedCuisines(existingData.cuisinePreferences || []);
          setSelectedActivityLevel(existingData.activityLevel || '');
          setSelectedAllergies(existingData.allergies || []);
          setSelectedCookingTime(existingData.cookingTime || '');
          setSelectedSpiceLevel(existingData.spiceLevel || '');
          setSelectedConditions(existingData.healthConditions || []);
          
          // Update step if user was in the middle of onboarding
          if (existingData.onboardingStep) {
            setCurrentStep(Math.min(existingData.onboardingStep, 9));
          }
          
          console.log('Loaded existing onboarding data');
        }
      } catch (error) {
        console.error('Error loading existing onboarding data:', error);
      }
    };

    loadExistingData();
  }, [currentUser]);

  const handleNext = async () => {
    // Validation for each step
    if (currentStep === 0 && !name) {
      toast.error("Please enter your name");
      return;
    }
    
    if (currentStep === 1 && !height) {
      toast.error("Please enter your height");
      return;
    }
    
    if (currentStep === 1 && !weight) {
      toast.error("Please enter your weight");
      return;
    }
    
    if (currentStep === 2 && !selectedGoal) {
      toast.error("Please select your goal");
      return;
    }
    
    if (currentStep === 3 && !selectedDietType) {
      toast.error("Please select your diet type");
      return;
    }
    
    if (currentStep === 4 && selectedCuisines.length === 0) {
      toast.error("Please select at least one cuisine");
      return;
    }
    
    if (currentStep === 5 && !selectedActivityLevel) {
      toast.error("Please select your activity level");
      return;
    }
    
    if (currentStep === 8 && !selectedCookingTime) {
      toast.error("Please select your cooking time preference");
      return;
    }
    
    if (currentStep === 9 && !selectedSpiceLevel) {
      toast.error("Please select your spice level");
      return;
    }
    
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(translateX, {
        toValue: 50,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    
    setTimeout(async () => {
      // Save progress to database
      if (currentUser) {
        try {
          const progressData: Partial<OnboardingData> = {};
          
          // Add data based on current step
          if (currentStep === 0) {
            progressData.name = name;
            progressData.age = parseInt(age);
            progressData.gender = gender as 'male' | 'female' | 'other';
          } else if (currentStep === 1) {
            progressData.height = parseFloat(height);
            progressData.weight = parseFloat(weight);
          } else if (currentStep === 2) {
            progressData.goal = selectedGoal as 'lose_weight' | 'maintain_weight' | 'gain_weight' | 'build_muscle';
          } else if (currentStep === 3) {
            progressData.dietaryRestrictions = [selectedDietType];
          } else if (currentStep === 4) {
            progressData.cuisinePreferences = selectedCuisines;
          } else if (currentStep === 5) {
            progressData.activityLevel = selectedActivityLevel as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
          } else if (currentStep === 6) {
            progressData.allergies = selectedAllergies;
          } else if (currentStep === 7) {
            progressData.healthConditions = selectedConditions;
          } else if (currentStep === 8) {
            progressData.cookingTime = selectedCookingTime as 'quick' | 'moderate' | 'elaborate';
          } else if (currentStep === 9) {
            progressData.spiceLevel = selectedSpiceLevel as 'mild' | 'medium' | 'hot';
          }
          
          progressData.onboardingStep = currentStep + 1;
          
          await OnboardingService.updateOnboardingData(currentUser.uid, progressData);
        } catch (error) {
          console.error('Error saving progress:', error);
        }
      }
      
      if (currentStep < 9) {
        setCurrentStep(currentStep + 1);
        scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true });
      } else {
        handleComplete();
      }
    }, 200);
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 50,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(translateX, {
          toValue: -50,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
      
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true });
      }, 200);
    }
  };
  
  const handlePreview = () => {
    const previewData = {
      'Name': name || 'Not provided',
      'Age': age || 'Not provided',
      'Gender': gender || 'Not provided',
      'Height': height ? `${height} cm` : 'Not provided',
      'Weight': weight ? `${weight} kg` : 'Not provided',
      'BMI': bmi ? bmi.toString() : 'Not calculated',
      'Goal': DIET_GOALS.find(g => g.id === selectedGoal)?.name || 'Not selected',
      'Diet Type': DIET_TYPES.find(d => d.id === selectedDietType)?.name || 'Not selected',
      'Cuisines': selectedCuisines.length > 0 
        ? CUISINES.filter(c => selectedCuisines.includes(c.id)).map(c => `${c.name} (${c.description})`).join('\n')
        : 'Not selected',
      'Activity Level': ACTIVITY_LEVELS.find(a => a.id === selectedActivityLevel)?.name || 'Not selected',
      'Allergies': selectedAllergies.length > 0 
        ? ALLERGIES.filter(a => selectedAllergies.includes(a.id)).map(a => a.name).join(', ')
        : 'None selected',
      'Cooking Time': COOKING_TIMES.find(c => c.id === selectedCookingTime)?.name || 'Not selected',
      'Spice Level': SPICE_LEVELS.find(s => s.id === selectedSpiceLevel)?.name || 'Not selected',
      'Health Conditions': selectedConditions.length > 0 
        ? HEALTH_CONDITIONS.filter(h => selectedConditions.includes(h.id)).map(h => h.name).join(', ')
        : 'None selected',
      'Other Conditions': customCondition || 'None'
    };

    let previewText = '';
    for (const [key, value] of Object.entries(previewData)) {
      previewText += `${key}: ${value}\n\n`;
    }

    toast.info("Your Preferences", {
      description: previewText,
      duration: 7000,
    });
  };
  
  const handleComplete = async () => {
    if (!currentUser) {
      toast.error('No user found. Please login again.');
      return;
    }

    try {
      // Prepare onboarding data for database
      const onboardingData: Partial<OnboardingData> = {
        name,
        age: parseInt(age),
        gender: gender as 'male' | 'female' | 'other',
        height: parseFloat(height),
        weight: parseFloat(weight),
        goal: selectedGoal as 'lose_weight' | 'maintain_weight' | 'gain_weight' | 'build_muscle',
        activityLevel: selectedActivityLevel as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active',
        dietaryRestrictions: [selectedDietType],
        allergies: selectedAllergies,
        healthConditions: selectedConditions,
        cuisinePreferences: selectedCuisines,
        spiceLevel: selectedSpiceLevel as 'mild' | 'medium' | 'hot',
        cookingTime: selectedCookingTime as 'quick' | 'moderate' | 'elaborate',
        notifications: true,
        mealReminders: true,
        weeklyReports: true,
        isOnboardingComplete: true,
        onboardingStep: 100
      };

      // Validate the data
      const validation = OnboardingService.validateOnboardingData(onboardingData);
      if (!validation.isValid) {
        toast.error(`Please fix: ${validation.errors.join(', ')}`);
        return;
      }

      // Save to Firestore database
      await OnboardingService.saveOnboardingData(currentUser.uid, onboardingData);
      // Mark onboarding as complete
      await OnboardingService.completeOnboarding(currentUser.uid);

      // Also save to AsyncStorage for local access
      const userPreferences = {
        name,
        age,
        gender,
        height,
        weight,
        bmi,
        idealWeightRange,
        goal: selectedGoal,
        dietType: selectedDietType,
        cuisines: selectedCuisines,
        activityLevel: selectedActivityLevel,
        allergies: selectedAllergies,
        cookingTime: selectedCookingTime,
        spiceLevel: selectedSpiceLevel,
        healthConditions: selectedConditions,
        customCondition
      };

      await AsyncStorage.multiSet([
        [`@hasCompletedOnboarding_${currentUser.uid}`, 'true'],
        ['@userName', name || 'User'],
        ['@userPreferences', JSON.stringify(userPreferences)]
      ]);

      // --- Generate and save 1-month diet plan if not already present ---
      const existingPlan = await planService.getUserPlan(currentUser.uid);
      if (!existingPlan) {
        // Generate plan for 30 days
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const days: DietPlanDay[] = [];
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          // Filter mealsData based on user preferences (goal, dietType, etc.)
          const filteredMeals = mealsData.filter(m =>
            (!selectedGoal || m.dietGoal === selectedGoal) &&
            (!selectedDietType || m.dietType === selectedDietType) &&
            (!selectedCuisines.length || selectedCuisines.includes(m.cuisine)) &&
            (!selectedAllergies.length || !m.allergens.some(a => selectedAllergies.includes(a))) &&
            (!selectedSpiceLevel || m.spiceLevel === selectedSpiceLevel) &&
            (!selectedCookingTime || m.cookingTime === selectedCookingTime) &&
            (!selectedConditions.length || !m.healthConditions.some(hc => selectedConditions.includes(hc)))
          );
          // Pick one meal per type (allow repeats)
          const mealTypes: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> = ['breakfast', 'lunch', 'snack', 'dinner'];
          const meals = mealTypes.map(type => {
            let pool = filteredMeals.filter(m => m.category === type);
            if (pool.length === 0) {
              pool = mealsData.filter(m => m.category === type);
            }
            if (pool.length === 0) return null;
            const meal = pool[Math.floor(Math.random() * pool.length)];
            return { ...meal, completed: false, type: meal.category };
          }).filter((m) => m !== null) as DietPlanMeal[];
          days.push({ date: dateStr, meals });
        }
        const plan: Omit<DietPlan, 'id' | 'createdAt' | 'updatedAt'> = {
          userId: currentUser.uid,
          startDate: days[0].date,
          endDate: days[days.length - 1].date,
          days,
        };
        // Debug log for userId and plan
        console.log('Creating plan for userId:', currentUser.uid);
        console.log('Plan object:', plan);
        await planService.createPlan(plan);
        // Reset streak to 1 and lastLogin to today
        await AsyncStorage.setItem(`@streak_${currentUser.uid}`, '1');
        await AsyncStorage.setItem(`@lastLogin_${currentUser.uid}`, todayStr);
      }

      toast.success("Profile created!", {
        description: "Your personalized meal plan is ready",
        duration: 3000,
      });
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      toast.error("Failed to save preferences. Please try again.");
    }
  };
  
  const toggleSelection = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, id: string) => {
    if (list.includes(id)) {
      setList(list.filter(item => item !== id));
    } else {
      setList([...list, id]);
    }
  };
  
  const renderProgressBar = () => {
    return (
      <View style={styles.progressContainer}>
        <Animated.View 
          style={[
            styles.progressBar,
            { 
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }) 
            }
          ]}
        />
      </View>
    );
  };
  
  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicatorContainer}>
        {Array(10).fill(0).map((_, index) => (
          <View 
            key={index}
            style={[
              styles.stepDot,
              currentStep === index ? styles.activeDot : {},
              currentStep > index ? styles.completedDot : {},
            ]}
          />
        ))}
      </View>
    );
  };
  
  const renderPersonalInfoStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Image
          source={require('../assets/onboarding1.png')}
          style={styles.onboardingIllustration}
          resizeMode="contain"
          accessibilityLabel="Onboarding illustration: Welcome to EatSmart"
        />
        <Text style={styles.stepTitle} accessibilityLabel="Tell us about yourself">Welcome to EatSmart!</Text>
        <Text style={styles.stepDescription} accessibilityLabel="We'll use this information to create your personalized meal plan">
          Let's get to know you so we can create your personalized meal plan.
        </Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Your Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>
        
        <View style={styles.inputRow}>
          <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.inputLabel}>Age</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Years"
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
            />
          </View>
          
          <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Gender</Text>
            <View style={styles.genderSelector}>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  gender === 'male' ? styles.selectedGender : {}
                ]}
                onPress={() => setGender('male')}
              >
                <Ionicons name="male" size={20} color={gender === 'male' ? 'white' : '#666'} />
                <Text style={[styles.genderText, gender === 'male' ? styles.selectedGenderText : {}]}>
                  Male
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  gender === 'female' ? styles.selectedGender : {}
                ]}
                onPress={() => setGender('female')}
              >
                <Ionicons name="female" size={20} color={gender === 'female' ? 'white' : '#666'} />
                <Text style={[styles.genderText, gender === 'female' ? styles.selectedGenderText : {}]}>
                  Female
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };
  
  const renderBodyMetricsStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Body Metrics</Text>
        <Text style={styles.stepDescription}>
          We'll use this to calculate your nutritional needs
        </Text>
        
        <View style={styles.inputRow}>
          <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.inputLabel}>Height (cm)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your height"
              value={height}
              onChangeText={setHeight}
              keyboardType="number-pad"
            />
          </View>
          
          <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your weight"
              value={weight}
              onChangeText={setWeight}
              keyboardType="number-pad"
            />
          </View>
        </View>
        
        {bmi && (
          <View style={styles.metricDisplay}>
            <Text style={styles.metricText}>BMI: {bmi}</Text>
            <Text style={styles.metricText}>Ideal Weight Range: {idealWeightRange}</Text>
          </View>
        )}
      </View>
    );
  };
  
  const renderGoalStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>What's your goal?</Text>
        <Text style={styles.stepDescription}>
          We'll customize your meal plan based on your health goals
        </Text>
        
        <View style={styles.gridContainer}>
          {DIET_GOALS.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              style={[
                styles.card,
                selectedGoal === goal.id ? styles.selectedCard : {}
              ]}
              onPress={() => setSelectedGoal(goal.id)}
            >
              <View style={[
                styles.iconContainer,
                selectedGoal === goal.id ? styles.selectedIconContainer : {}
              ]}>
                <MaterialCommunityIcons 
                  name={goal.icon} 
                  size={28} 
                  color={selectedGoal === goal.id ? '#FF6B6B' : '#666'} 
                />
              </View>
              <Text style={[
                styles.cardTitle,
                selectedGoal === goal.id ? styles.selectedCardTitle : {}
              ]}>
                {goal.name}
              </Text>
              <Text style={styles.cardDescription}>{goal.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  const renderDietTypeStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Diet Type</Text>
        <Text style={styles.stepDescription}>
          Select your dietary preference
        </Text>
        
        <View style={styles.gridContainer}>
          {DIET_TYPES.map((dietType) => (
            <TouchableOpacity
              key={dietType.id}
              style={[
                styles.card,
                selectedDietType === dietType.id ? styles.selectedCard : {}
              ]}
              onPress={() => setSelectedDietType(dietType.id)}
            >
              <MaterialCommunityIcons 
                name={dietType.icon} 
                size={32} 
                color={selectedDietType === dietType.id ? '#FF6B6B' : '#666'} 
              />
              <Text style={[
                styles.cardTitle,
                selectedDietType === dietType.id ? styles.selectedCardTitle : {}
              ]}>
                {dietType.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  const renderCuisineStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Cuisine Preferences</Text>
        <Text style={styles.stepDescription}>
          Select all cuisines you enjoy (you can choose multiple)
        </Text>
        
        <View style={styles.verticalCuisineContainer}>
          {CUISINES.map((cuisine) => (
            <TouchableOpacity
              key={cuisine.id}
              style={[
                styles.verticalCuisineCard,
                selectedCuisines.includes(cuisine.id) ? styles.selectedCard : {}
              ]}
              onPress={() => toggleSelection(selectedCuisines, setSelectedCuisines, cuisine.id)}
            >
              <Image
                source={{ uri: `https://source.unsplash.com/random/300x300/?${cuisine.image}` }}
                style={styles.verticalCuisineImage}
              />
              <View style={styles.verticalCuisineTextContainer}>
                <Text style={styles.verticalCuisineTitle}>{cuisine.name}</Text>
                <Text style={styles.verticalCuisineDescription}>{cuisine.description}</Text>
              </View>
              {selectedCuisines.includes(cuisine.id) && (
                <View style={styles.selectedCheck}>
                  <Ionicons name="checkmark-circle" size={24} color="#FF6B6B" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  const renderActivityStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Activity Level</Text>
        <Text style={styles.stepDescription}>
          How active are you on a typical week?
        </Text>
        
        <View style={styles.listContainer}>
          {ACTIVITY_LEVELS.map((activity) => (
            <TouchableOpacity
              key={activity.id}
              style={[
                styles.listItem,
                selectedActivityLevel === activity.id ? styles.selectedListItem : {}
              ]}
              onPress={() => setSelectedActivityLevel(activity.id)}
            >
              <MaterialCommunityIcons 
                name={activity.icon} 
                size={24} 
                color={selectedActivityLevel === activity.id ? '#FF6B6B' : '#666'} 
              />
              <View style={styles.listItemTextContainer}>
                <Text style={[
                  styles.listItemTitle,
                  selectedActivityLevel === activity.id ? styles.selectedListItemTitle : {}
                ]}>
                  {activity.name}
                </Text>
                <Text style={styles.listItemDescription}>{activity.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  const renderAllergiesStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Food Allergies & Intolerances</Text>
        <Text style={styles.stepDescription}>
          Select all that apply (if any)
        </Text>
        
        <View style={styles.gridContainer}>
          {ALLERGIES.map((allergy) => (
            <TouchableOpacity
              key={allergy.id}
              style={[
                styles.card,
                selectedAllergies.includes(allergy.id) ? styles.selectedCard : {}
              ]}
              onPress={() => toggleSelection(selectedAllergies, setSelectedAllergies, allergy.id)}
            >
              <MaterialCommunityIcons 
                name={allergy.icon} 
                size={28} 
                color={selectedAllergies.includes(allergy.id) ? '#FF6B6B' : '#666'} 
              />
              <Text style={[
                styles.cardTitle,
                selectedAllergies.includes(allergy.id) ? styles.selectedCardTitle : {}
              ]}>
                {allergy.name}
              </Text>
              
              {selectedAllergies.includes(allergy.id) && (
                <View style={styles.selectedCheckSmall}>
                  <Ionicons name="close-circle" size={18} color="white" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  const renderHealthConditionsStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Health Conditions</Text>
        <Text style={styles.stepDescription}>
          Select any health conditions you have (optional)
        </Text>
        
        <View style={styles.gridContainer}>
          {HEALTH_CONDITIONS.map((condition) => (
            <TouchableOpacity
              key={condition.id}
              style={[
                styles.card,
                selectedConditions.includes(condition.id) ? styles.selectedCard : {},
                condition.severity === 'high' ? styles.highSeverity : {},
                condition.severity === 'medium' ? styles.mediumSeverity : {},
              ]}
              onPress={() => toggleSelection(selectedConditions, setSelectedConditions, condition.id)}
            >
              <MaterialCommunityIcons 
                name={condition.icon} 
                size={28} 
                color={selectedConditions.includes(condition.id) ? '#FF6B6B' : '#666'} 
              />
              <Text style={[
                styles.cardTitle,
                selectedConditions.includes(condition.id) ? styles.selectedCardTitle : {}
              ]}>
                {condition.name}
              </Text>
              
              {selectedConditions.includes(condition.id) && (
                <View style={styles.selectedCheckSmall}>
                  <Ionicons name="close-circle" size={18} color="white" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Other conditions not listed?</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter any other health conditions"
            value={customCondition}
            onChangeText={setCustomCondition}
          />
        </View>
      </View>
    );
  };
  
  const renderCookingTimeStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Cooking Time Preferences</Text>
        <Text style={styles.stepDescription}>
          How much time do you typically have for cooking?
        </Text>
        
        <View style={styles.listContainer}>
          {COOKING_TIMES.map((time) => (
            <TouchableOpacity
              key={time.id}
              style={[
                styles.listItem,
                selectedCookingTime === time.id ? styles.selectedListItem : {}
              ]}
              onPress={() => setSelectedCookingTime(time.id)}
            >
              <MaterialCommunityIcons 
                name={time.icon} 
                size={24} 
                color={selectedCookingTime === time.id ? '#FF6B6B' : '#666'} 
              />
              <Text style={[
                styles.listItemTitle,
                selectedCookingTime === time.id ? styles.selectedListItemTitle : {}
              ]}>
                {time.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  const renderSpiceLevelStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Spice Level Preference</Text>
        <Text style={styles.stepDescription}>
          How spicy do you like your food?
        </Text>
        
        <View style={styles.listContainer}>
          {SPICE_LEVELS.map((spice) => (
            <TouchableOpacity
              key={spice.id}
              style={[
                styles.listItem,
                selectedSpiceLevel === spice.id ? styles.selectedListItem : {}
              ]}
              onPress={() => setSelectedSpiceLevel(spice.id)}
            >
              <MaterialCommunityIcons 
                name={spice.icon} 
                size={24} 
                color={selectedSpiceLevel === spice.id ? '#FF6B6B' : '#666'} 
              />
              <Text style={[
                styles.listItemTitle,
                selectedSpiceLevel === spice.id ? styles.selectedListItemTitle : {}
              ]}>
                {spice.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderPersonalInfoStep();
      case 1: return renderBodyMetricsStep();
      case 2: return renderGoalStep();
      case 3: return renderDietTypeStep();
      case 4: return renderCuisineStep();
      case 5: return renderActivityStep();
      case 6: return renderAllergiesStep();
      case 7: return renderHealthConditionsStep();
      case 8: return renderCookingTimeStep();
      case 9: return renderSpiceLevelStep();
      default: return null;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {currentStep > 0 && (
              <TouchableOpacity 
                style={styles.backButton}
                onPress={handleBack}
              >
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.headerCenter}>
            <Image
              source={{ uri: 'https://i.imgur.com/mCHMpLT.png' }}
              style={styles.logo}
            />
            <Text style={styles.appName}>EatSmart</Text>
          </View>
          
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.previewButton}
              onPress={handlePreview}
            >
              <Text style={styles.previewText}>Preview</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {renderProgressBar()}
        {renderStepIndicator()}
        
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.stepContent,
              {
                opacity: fadeAnim,
                transform: [{ translateX: translateX }],
              }
            ]}
          >
            {renderCurrentStep()}
          </Animated.View>
        </ScrollView>
        
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.nextButton}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {currentStep < 9 ? 'Continue' : 'Complete'}
            </Text>
            <Ionicons 
              name={currentStep < 9 ? 'arrow-forward' : 'checkmark'} 
              size={20} 
              color="white" 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Main containers
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 0,
  },
  stepContent: {
    paddingHorizontal: 20,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    width: 40,
  },
  backButton: {
    padding: 5,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 8,
    marginRight: 8,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  previewButton: {
    padding: 5,
  },
  previewText: {
    fontSize: 14,
    color: '#6C63FF',
    fontWeight: '500',
  },

  // Progress indicators
  progressContainer: {
    height: 4,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#6C63FF',
    borderRadius: 2,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EEE',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#6C63FF',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  completedDot: {
    backgroundColor: '#4ECDC4',
  },

  // Footer/button styles
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  nextButton: {
    backgroundColor: '#6C63FF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 12,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },

  // Step content styles
  stepContainer: {
    paddingVertical: 10,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },

  // Input styles
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // Gender selector
  genderSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 2,
  },
  selectedGender: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  genderText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  selectedGenderText: {
    color: 'white',
  },

  // Metrics display
  metricDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  metricText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },

  // Card grid styles
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
  },
  selectedCard: {
    borderColor: '#6C63FF',
    backgroundColor: '#F0F0FF',
  },
  highSeverity: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF5252',
  },
  mediumSeverity: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFA726',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedIconContainer: {
    backgroundColor: '#F0F0FF',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  selectedCardTitle: {
    color: '#6C63FF',
  },
  cardDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },

  // Vertical cuisine styles
  verticalCuisineContainer: {
    marginBottom: 15,
  },
  verticalCuisineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  verticalCuisineImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  verticalCuisineTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  verticalCuisineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  verticalCuisineDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },

  // List styles
  listContainer: {
    marginBottom: 15,
  },
  listItem: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEE',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  selectedListItem: {
    borderColor: '#6C63FF',
    backgroundColor: '#F0F0FF',
  },
  listItemTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  listItemTitle: {
    fontSize: 16,
    color: '#333',
  },
  selectedListItemTitle: {
    color: '#6C63FF',
  },
  listItemDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },

  // Selection indicators
  selectedCheck: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
  },
  selectedCheckSmall: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    padding: 2,
  },
  onboardingIllustration: {
    width: '100%',
    height: 200,
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
});