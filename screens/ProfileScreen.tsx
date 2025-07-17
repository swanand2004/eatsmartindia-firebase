import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  Alert,
  Linking,
  Platform,
  Modal
} from 'react-native';
import { SafeAreaView as SafeAreaContextView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { userProfileService, UserProfile, planService } from '../services/firestoreService';
import { OnboardingService, OnboardingData } from '../services/onboardingService';
import { mealsData } from '../data/mealsData';
import { useMeals } from '../context/MealContext';
import { toast } from 'sonner-native';
import { i18n, LANG_KEY } from '../i18n';
import { useTranslation } from 'react-i18next';

type ProfileScreenProps = {
  navigation: any;
};

type UserData = {
  name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  age?: string;
  height?: string;
  weight?: string;
  bmi?: number;
  idealWeightRange?: string;
  goal?: string;
  dietType?: string;
  cuisines?: string[];
  activityLevel?: string;
  allergies?: string[];
  cookingTime?: string;
  spiceLevel?: string;
  budget?: string;
  healthConditions?: string[];
  customCondition?: string;
  currentDietPlan?: string;
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { currentUser, signOutUser } = useAuth();
  const { refreshPlan } = useMeals();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [firebaseProfile, setFirebaseProfile] = useState<UserProfile | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPlanChange, setShowPlanChange] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planChangeData, setPlanChangeData] = useState({
    goal: '' as 'lose_weight' | 'maintain_weight' | 'gain_weight' | 'build_muscle' | '',
    dietaryRestrictions: [] as string[],
    cuisinePreferences: [] as string[],
    allergies: [] as string[],
    healthConditions: [] as string[],
    spiceLevel: '' as 'mild' | 'medium' | 'hot' | '',
    cookingTime: '' as 'quick' | 'moderate' | 'elaborate' | '',
    budget: '' as 'low' | 'medium' | 'high' | '',
    activityLevel: '' as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | ''
  });

  const SUPPORTED_LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'bn', label: 'বাংলা' },
    { code: 'mr', label: 'मराठी' },
    { code: 'gu', label: 'ગુજરાતી' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
    { code: 'ml', label: 'മലയാളം' },
    { code: 'pa', label: 'ਪੰਜਾਬੀ' },
    { code: 'ur', label: 'اردو' },
    { code: 'or', label: 'ଓଡ଼ିଆ' },
    { code: 'as', label: 'অসমীয়া' },
    { code: 'sa', label: 'संस्कृतम्' },
  ];

  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);

  const handleLanguageChange = async (lang) => {
    setSelectedLanguage(lang);
    i18n.changeLanguage(lang);
    await AsyncStorage.setItem(LANG_KEY, lang);
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Load Firebase user profile
        if (currentUser) {
          const profile = await userProfileService.getUserProfile(currentUser.uid);
          setFirebaseProfile(profile);
          
          // Create profile if it doesn't exist
          if (!profile && currentUser.email) {
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email,
              createdAt: new Date() as any,
              updatedAt: new Date() as any
            };
            await userProfileService.createOrUpdateProfile(newProfile);
            setFirebaseProfile(newProfile);
          }

          // Load onboarding data
          const onboarding = await OnboardingService.getOnboardingData(currentUser.uid);
          setOnboardingData(onboarding);
        }

        // Load local user preferences
        const userPrefs = await AsyncStorage.getItem('@userPreferences');
        const premiumStatus = await AsyncStorage.getItem('@isPremiumUser');
        
        if (userPrefs) {
          const data = JSON.parse(userPrefs);
          // Use Firebase email if available
          if (currentUser?.email) data.email = currentUser.email;
          if (!data.phone) data.phone = "+91 9876543210";
          if (!data.currentDietPlan) data.currentDietPlan = "Balanced Diet Plan";
          setUserData(data);
        }
        
        if (premiumStatus === 'true') {
          setIsPremium(true);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        toast.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [currentUser]);

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOutUser();
              await AsyncStorage.removeItem('@userToken');
              toast.success('Logged out successfully');
            } catch (error) {
              console.error('Logout error:', error);
              toast.error('Failed to log out');
            }
          },
        },
      ],
      { cancelable: false }
    );
  };



  const handleUpgrade = () => {
    Alert.alert(
      'Go Premium',
      'Unlock all premium features for $9.99/month',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Subscribe',
          onPress: () => {
            Linking.openURL('https://your-app.com/premium');
          },
        },
      ]
    );
  };

  const navigateToEdit = (section: string) => {
    // Only allow editing of basic info
    if (['name', 'age', 'gender'].includes(section)) {
      navigation.navigate('EditProfile', { section });
    }
  };

  const handleChangeDietPlan = () => {
    // Initialize with current data
    setPlanChangeData({
      goal: onboardingData?.goal || '',
      dietaryRestrictions: onboardingData?.dietaryRestrictions || [],
      cuisinePreferences: onboardingData?.cuisinePreferences || [],
      allergies: onboardingData?.allergies || [],
      healthConditions: onboardingData?.healthConditions || [],
      spiceLevel: onboardingData?.spiceLevel || '',
      cookingTime: onboardingData?.cookingTime || '',
      budget: onboardingData?.budget || '',
      activityLevel: onboardingData?.activityLevel || ''
    });
    setShowPlanModal(true);
  };



  const formatText = (text: string) => {
    return text.split('_').map((word: string) => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const handlePlanChangeSubmit = async () => {
    if (!currentUser?.uid) {
      toast.error('No user data available');
      return;
    }

    try {
      // Filter out empty values and update onboarding data
      const updateData: Partial<OnboardingData> = {};
      if (planChangeData.goal) updateData.goal = planChangeData.goal;
      if (planChangeData.dietaryRestrictions.length > 0) updateData.dietaryRestrictions = planChangeData.dietaryRestrictions;
      if (planChangeData.cuisinePreferences.length > 0) updateData.cuisinePreferences = planChangeData.cuisinePreferences;
      if (planChangeData.allergies.length > 0) updateData.allergies = planChangeData.allergies;
      if (planChangeData.healthConditions.length > 0) updateData.healthConditions = planChangeData.healthConditions;
      if (planChangeData.spiceLevel) updateData.spiceLevel = planChangeData.spiceLevel;
      if (planChangeData.cookingTime) updateData.cookingTime = planChangeData.cookingTime;
      if (planChangeData.budget) updateData.budget = planChangeData.budget;
      if (planChangeData.activityLevel) updateData.activityLevel = planChangeData.activityLevel;
      
      await OnboardingService.updateOnboardingData(currentUser.uid, updateData);
      
      // Regenerate plan with new data
      const today = new Date();
      const days = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Map onboarding goal to mealsData dietGoal
        let mappedGoal: string | undefined;
        if (planChangeData.goal === 'lose_weight') mappedGoal = 'weight_loss';
        else if (planChangeData.goal === 'maintain_weight') mappedGoal = 'balanced';
        else if (planChangeData.goal === 'gain_weight') mappedGoal = 'muscle_gain';
        else if (planChangeData.goal === 'build_muscle') mappedGoal = 'muscle_gain';
        
        // Use new plan data to filter meals
        const filteredMeals = mealsData.filter(m =>
          (!mappedGoal || m.dietGoal === mappedGoal) &&
          (!planChangeData.dietaryRestrictions?.length || m.dietType === planChangeData.dietaryRestrictions[0]) &&
          (!planChangeData.cuisinePreferences?.length || planChangeData.cuisinePreferences.includes(m.cuisine)) &&
          (!planChangeData.allergies?.length || !m.allergens.some(a => planChangeData.allergies!.includes(a))) &&
          (!planChangeData.spiceLevel || m.spiceLevel === planChangeData.spiceLevel) &&
          (!planChangeData.cookingTime || m.cookingTime === planChangeData.cookingTime) &&
          (!planChangeData.healthConditions?.length || !m.healthConditions.some(hc => planChangeData.healthConditions!.includes(hc)))
        );
        
        const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner'];
        const meals = mealTypes.map(type => {
          let pool = filteredMeals.filter(m => m.category === type);
          if (pool.length === 0) {
            pool = mealsData.filter(m => m.category === type);
          }
          if (pool.length === 0) return null;
          const meal = pool[Math.floor(Math.random() * pool.length)];
          return { ...meal, completed: false, type: meal.category };
        }).filter((m) => m !== null) as any[];
        
        days.push({ date: dateStr, meals });
      }
      
      const plan = {
        userId: currentUser.uid,
        startDate: days[0].date,
        endDate: days[days.length - 1].date,
        days,
      };
      
      await planService.createPlan(plan);
      // Reset streak to 1 and lastLogin to today
      const todayStr = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(`@streak_${currentUser.uid}`, '1');
      await AsyncStorage.setItem(`@lastLogin_${currentUser.uid}`, todayStr);
      toast.success('Diet plan updated successfully!');
      // Navigate to Home after success, with param to force streak refresh
      if (navigation && navigation.navigate) {
        navigation.navigate('Home', { forceStreakRefresh: Date.now() });
      }
      
      // Reload data
      const newOnboarding = await OnboardingService.getOnboardingData(currentUser.uid);
      setOnboardingData(newOnboarding);
      setShowPlanChange(false);
      
      // Refresh plan in context to update all screens
      await refreshPlan();
      
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('Failed to update plan');
    }
  };

  const toggleArrayItem = (array: string[], item: string) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    } else {
      return [...array, item];
    }
  };

  // Debug function to check data sources
  const debugDataSources = async () => {
    if (!currentUser?.uid) return;
    
    console.log('=== DATA SOURCE DEBUG ===');
    
    // Check Firebase Profile
    const firebaseProfile = await userProfileService.getUserProfile(currentUser.uid);
    console.log('Firebase Profile:', firebaseProfile);
    
    // Check Onboarding Data
    const onboardingData = await OnboardingService.getOnboardingData(currentUser.uid);
    console.log('Onboarding Data:', onboardingData);
    
    // Check Local Storage
    const userPrefs = await AsyncStorage.getItem('@userPreferences');
    console.log('Local Storage:', userPrefs ? JSON.parse(userPrefs) : 'No local data');
    
    // Check current state
    console.log('Current userData state:', userData);
    console.log('Current firebaseProfile state:', firebaseProfile);
    console.log('Current onboardingData state:', onboardingData);
  };

  // Sync function to update Firebase with current local data
  const syncDataToFirebase = async () => {
    if (!currentUser?.uid || !userData) return;
    
    try {
      // Update Firebase Profile
      const profileUpdate: Partial<UserProfile> = {
        name: userData.name,
        age: userData.age ? parseInt(userData.age) : undefined,
        // Add other fields as needed
      };
      await userProfileService.createOrUpdateProfile({
        uid: currentUser.uid,
        email: currentUser.email || '',
        ...profileUpdate,
        createdAt: firebaseProfile?.createdAt || new Date() as any,
        updatedAt: new Date() as any
      });
      
      // Update Onboarding Data
      const onboardingUpdate: Partial<OnboardingData> = {
        name: userData.name,
        age: userData.age ? parseInt(userData.age) : undefined,
        gender: userData.gender as any,
        height: userData.height ? parseInt(userData.height) : undefined,
        weight: userData.weight ? parseInt(userData.weight) : undefined,
        goal: userData.goal as any,
        activityLevel: userData.activityLevel as any,
        allergies: userData.allergies,
        cookingTime: userData.cookingTime as any,
        spiceLevel: userData.spiceLevel as any,
        budget: userData.budget as any,
        healthConditions: userData.healthConditions,
      };
      await OnboardingService.updateOnboardingData(currentUser.uid, onboardingUpdate);
      
      toast.success('Data synced to Firebase successfully!');
      
      // Reload data
      const newProfile = await userProfileService.getUserProfile(currentUser.uid);
      const newOnboarding = await OnboardingService.getOnboardingData(currentUser.uid);
      setFirebaseProfile(newProfile);
      setOnboardingData(newOnboarding);
      
    } catch (error) {
      console.error('Error syncing data:', error);
      toast.error('Failed to sync data to Firebase');
    }
  };

  if (loading) {
    return (
      <SafeAreaContextView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaContextView>
    );
  }

  return (
    <SafeAreaContextView style={{ flex: 1, backgroundColor: 'white' }} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Feather name="log-out" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Image
              source={{ uri: 'https://i.imgur.com/mCHMpLT.png' }}
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{userData?.name || firebaseProfile?.name || 'User'}</Text>
              <Text style={styles.memberSince}>
                Member since {firebaseProfile?.createdAt ? new Date(firebaseProfile.createdAt.seconds * 1000).getFullYear() : '2023'}
              </Text>
            </View>
          </View>

          {/* Premium Banner */}
          {!isPremium && (
            <TouchableOpacity 
              style={styles.premiumBanner}
              onPress={handleUpgrade}
            >
              <LinearGradient
                colors={['#FF9A9E', '#FAD0C4']}
                style={styles.premiumGradient}
              >
                <View style={styles.premiumContent}>
                  <Ionicons name="diamond" size={20} color="#FFF" />
                  <Text style={styles.premiumText}>Upgrade to Premium</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Basic Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <ProfileRow 
            icon="person-outline"
            label="Name"
            value={userData?.name || 'Not set'}
            onPress={() => navigateToEdit('name')}
            editable
          />
          
          <ProfileRow 
            icon="mail-outline"
            label="Email"
            value={userData?.email || 'Not set'}
            onPress={() => {}}
          />
          
          <ProfileRow 
            icon="call-outline"
            label="Phone"
            value={userData?.phone || 'Not set'}
            onPress={() => {}}
          />
          
          <ProfileRow 
            icon="transgender-outline"
            label="Gender"
            value={userData?.gender ? formatText(userData.gender) : 'Not set'}
            onPress={() => navigateToEdit('gender')}
            editable
          />
          
          <ProfileRow 
            icon="calendar-outline"
            label="Age"
            value={userData?.age ? `${userData.age} years` : 'Not set'}
            onPress={() => navigateToEdit('age')}
            editable
          />
        </View>

        {/* Current Diet Plan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Diet Plan</Text>
          <View style={styles.dietPlanContainer}>
            <View style={styles.planInfo}>
              <Text style={styles.dietPlanText}>
                {onboardingData?.goal ? formatText(onboardingData.goal) : 'Balanced'} Diet Plan
              </Text>
              <Text style={styles.planSubtext}>
                {onboardingData?.dietaryRestrictions?.[0] ? formatText(onboardingData.dietaryRestrictions[0]) : 'No restrictions'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.changePlanButton}
              onPress={handleChangeDietPlan}
            >
              <Text style={styles.changePlanButtonText}>Change Plan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Inline Plan Change Form */}
        {showPlanChange && (
          <View style={styles.section}>
            <View style={styles.formHeader}>
              <Text style={styles.sectionTitle}>Update Preferences</Text>
              <TouchableOpacity onPress={() => setShowPlanChange(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Goal Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>What's your goal?</Text>
              <View style={styles.optionsGrid}>
                {[
                  { value: 'lose_weight', label: 'Lose Weight' },
                  { value: 'maintain_weight', label: 'Maintain Weight' },
                  { value: 'gain_weight', label: 'Gain Weight' },
                  { value: 'build_muscle', label: 'Build Muscle' }
                ].map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      planChangeData.goal === option.value && styles.optionButtonSelected
                    ]}
                    onPress={() => setPlanChangeData(prev => ({ ...prev, goal: option.value as any }))}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      planChangeData.goal === option.value && styles.optionButtonTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Dietary Restrictions */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Dietary Restrictions</Text>
              <View style={styles.optionsGrid}>
                {['vegetarian', 'vegan', 'non_vegetarian', 'gluten_free', 'dairy_free'].map(restriction => (
                  <TouchableOpacity
                    key={restriction}
                    style={[
                      styles.optionButton,
                      planChangeData.dietaryRestrictions.includes(restriction) && styles.optionButtonSelected
                    ]}
                    onPress={() => setPlanChangeData(prev => ({
                      ...prev,
                      dietaryRestrictions: toggleArrayItem(prev.dietaryRestrictions, restriction)
                    }))}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      planChangeData.dietaryRestrictions.includes(restriction) && styles.optionButtonTextSelected
                    ]}>
                      {formatText(restriction)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Spice Level */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Preferred Spice Level</Text>
              <View style={styles.optionsGrid}>
                {[
                  { value: 'mild', label: 'Mild' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'hot', label: 'Hot' }
                ].map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      planChangeData.spiceLevel === option.value && styles.optionButtonSelected
                    ]}
                    onPress={() => setPlanChangeData(prev => ({ ...prev, spiceLevel: option.value as any }))}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      planChangeData.spiceLevel === option.value && styles.optionButtonTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handlePlanChangeSubmit}
            >
              <Text style={styles.submitButtonText}>Update Plan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* App Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => setShowPreferences(!showPreferences)}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="person-outline" size={22} color="#666" />
              <Text style={styles.settingLabel}>Preferences</Text>
            </View>
            <Ionicons 
              name={showPreferences ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#999" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={22} color="#666" />
              <Text style={styles.settingLabel}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon-outline" size={22} color="#666" />
              <Text style={styles.settingLabel}>Dark Mode</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle-outline" size={22} color="#666" />
              <Text style={styles.settingLabel}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* User Preferences Section */}
        {showPreferences && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>User Preferences</Text>
            
            <ProfileRow 
              icon="flag-outline"
              label="Goal"
              value={onboardingData?.goal ? formatText(onboardingData.goal) : 'Not set'}
              onPress={() => {}}
            />
            
            <ProfileRow 
              icon="nutrition-outline"
              label="Diet Type"
              value={onboardingData?.dietaryRestrictions?.[0] ? formatText(onboardingData.dietaryRestrictions[0]) : 'Not set'}
              onPress={() => {}}
            />
            
            <ProfileRow 
              icon="flame-outline"
              label="Spice Level"
              value={onboardingData?.spiceLevel ? formatText(onboardingData.spiceLevel) : 'Not set'}
              onPress={() => {}}
            />

            <ProfileRow 
              icon="time-outline"
              label="Cooking Time"
              value={onboardingData?.cookingTime ? formatText(onboardingData.cookingTime) : 'Not set'}
              onPress={() => {}}
            />

            <ProfileRow 
              icon="wallet-outline"
              label="Budget"
              value={onboardingData?.budget ? formatText(onboardingData.budget) : 'Not set'}
              onPress={() => {}}
            />

            <ProfileRow 
              icon="fitness-outline"
              label="Activity Level"
              value={onboardingData?.activityLevel ? formatText(onboardingData.activityLevel) : 'Not set'}
              onPress={() => {}}
            />

            <ProfileRow 
              icon="flag-outline"
              label="Cuisines"
              value={onboardingData?.cuisinePreferences ? 
                onboardingData.cuisinePreferences.map(c => formatText(c)).join(', ') : 
                'Not set'}
              onPress={() => {}}
            />

            <ProfileRow 
              icon="warning-outline"
              label="Allergies"
              value={onboardingData?.allergies && onboardingData.allergies.length > 0 ? 
                onboardingData.allergies.join(', ') : 
                'None'}
              onPress={() => {}}
            />

            <ProfileRow 
              icon="medical-outline"
              label="Health Conditions"
              value={onboardingData?.healthConditions && onboardingData.healthConditions.length > 0 ? 
                onboardingData.healthConditions.join(', ') : 
                'None'}
              onPress={() => {}}
            />
          </View>
        )}

        {/* Debug Section (Development Only) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug Tools</Text>
          
          <TouchableOpacity style={styles.settingRow} onPress={debugDataSources}>
            <View style={styles.settingLeft}>
              <Ionicons name="bug-outline" size={22} color="#FF6B6B" />
              <Text style={styles.settingLabel}>Check Data Sources</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingRow} onPress={syncDataToFirebase}>
            <View style={styles.settingLeft}>
              <Ionicons name="sync-outline" size={22} color="#4ECDC4" />
              <Text style={styles.settingLabel}>Sync to Firebase</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ marginVertical: 16, paddingHorizontal: 24 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>{t('language')}</Text>
          {SUPPORTED_LANGUAGES.map(lang => (
            <TouchableOpacity
              key={lang.code}
              onPress={() => handleLanguageChange(lang.code)}
              style={{
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
                opacity: selectedLanguage === lang.code ? 1 : 0.7,
              }}
            >
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: selectedLanguage === lang.code ? '#6C63FF' : '#ccc', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                {selectedLanguage === lang.code && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#6C63FF' }} />}
              </View>
              <Text style={{ fontSize: 15 }}>{lang.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Plan Change Modal */}
      <Modal
        visible={showPlanModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPlanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Diet Plan</Text>
              <TouchableOpacity onPress={() => setShowPlanModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Goal Selection */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>What's your goal?</Text>
                <View style={styles.optionsGrid}>
                  {[
                    { value: 'weight_loss', label: 'Weight Loss' },
                    { value: 'muscle_gain', label: 'Muscle Gain' },
                    { value: 'balanced', label: 'Balanced Diet' },
                    { value: 'diabetes', label: 'Diabetic' }
                  ].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.modalOptionButton,
                        planChangeData.goal === option.value && styles.modalOptionButtonSelected
                      ]}
                      onPress={() => setPlanChangeData(prev => ({ ...prev, goal: option.value as any }))}
                    >
                      <Text style={[
                        styles.modalOptionButtonText,
                        planChangeData.goal === option.value && styles.modalOptionButtonTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Diet Type */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Diet Type</Text>
                <View style={styles.optionsGrid}>
                  {[
                    { value: 'veg', label: 'Vegetarian' },
                    { value: 'non_veg', label: 'Non-Vegetarian' },
                    { value: 'jain', label: 'Jain' }
                  ].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.modalOptionButton,
                        planChangeData.dietaryRestrictions.includes(option.value) && styles.modalOptionButtonSelected
                      ]}
                      onPress={() => setPlanChangeData(prev => ({
                        ...prev,
                        dietaryRestrictions: [option.value]
                      }))}
                    >
                      <Text style={[
                        styles.modalOptionButtonText,
                        planChangeData.dietaryRestrictions.includes(option.value) && styles.modalOptionButtonTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Cuisine Preferences */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Cuisine Preferences</Text>
                <View style={styles.optionsGrid}>
                  {[
                    { value: 'north_indian', label: 'North Indian' },
                    { value: 'south_indian', label: 'South Indian' },
                    { value: 'east_indian', label: 'East Indian' },
                    { value: 'west_indian', label: 'West Indian' }
                  ].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.modalOptionButton,
                        planChangeData.cuisinePreferences.includes(option.value) && styles.modalOptionButtonSelected
                      ]}
                      onPress={() => setPlanChangeData(prev => ({
                        ...prev,
                        cuisinePreferences: toggleArrayItem(prev.cuisinePreferences, option.value)
                      }))}
                    >
                      <Text style={[
                        styles.modalOptionButtonText,
                        planChangeData.cuisinePreferences.includes(option.value) && styles.modalOptionButtonTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Activity Level */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Activity Level</Text>
                <View style={styles.optionsGrid}>
                  {[
                    { value: 'sedentary', label: 'Sedentary' },
                    { value: 'moderate', label: 'Moderately Active' },
                    { value: 'very', label: 'Very Active' }
                  ].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.modalOptionButton,
                        planChangeData.activityLevel === option.value && styles.modalOptionButtonSelected
                      ]}
                      onPress={() => setPlanChangeData(prev => ({ ...prev, activityLevel: option.value as any }))}
                    >
                      <Text style={[
                        styles.modalOptionButtonText,
                        planChangeData.activityLevel === option.value && styles.modalOptionButtonTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Allergies */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Food Allergies</Text>
                <View style={styles.optionsGrid}>
                  {[
                    { value: 'dairy', label: 'Dairy' },
                    { value: 'nuts', label: 'Nuts' },
                    { value: 'gluten', label: 'Gluten' },
                    { value: 'seafood', label: 'Seafood' },
                    { value: 'eggs', label: 'Eggs' },
                    { value: 'soy', label: 'Soy' }
                  ].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.modalOptionButton,
                        planChangeData.allergies.includes(option.value) && styles.modalOptionButtonSelected
                      ]}
                      onPress={() => setPlanChangeData(prev => ({
                        ...prev,
                        allergies: toggleArrayItem(prev.allergies, option.value)
                      }))}
                    >
                      <Text style={[
                        styles.modalOptionButtonText,
                        planChangeData.allergies.includes(option.value) && styles.modalOptionButtonTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Health Conditions */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Health Conditions</Text>
                <View style={styles.optionsGrid}>
                  {[
                    { value: 'diabetes', label: 'Diabetes' },
                    { value: 'hypertension', label: 'Hypertension' },
                    { value: 'pcos', label: 'PCOS' },
                    { value: 'thyroid', label: 'Thyroid' },
                    { value: 'cholesterol', label: 'High Cholesterol' },
                    { value: 'ibs', label: 'IBS' },
                    { value: 'heart_disease', label: 'Heart Disease' },
                    { value: 'kidney_disease', label: 'Kidney Disease' }
                  ].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.modalOptionButton,
                        planChangeData.healthConditions.includes(option.value) && styles.modalOptionButtonSelected
                      ]}
                      onPress={() => setPlanChangeData(prev => ({
                        ...prev,
                        healthConditions: toggleArrayItem(prev.healthConditions, option.value)
                      }))}
                    >
                      <Text style={[
                        styles.modalOptionButtonText,
                        planChangeData.healthConditions.includes(option.value) && styles.modalOptionButtonTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Cooking Time */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Cooking Time Preference</Text>
                <View style={styles.optionsGrid}>
                  {[
                    { value: 'quick', label: 'Quick (< 15 min)' },
                    { value: 'medium', label: 'Medium (15-30 min)' },
                    { value: 'long', label: 'Elaborate (> 30 min)' }
                  ].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.modalOptionButton,
                        planChangeData.cookingTime === option.value && styles.modalOptionButtonSelected
                      ]}
                      onPress={() => setPlanChangeData(prev => ({ ...prev, cookingTime: option.value as any }))}
                    >
                      <Text style={[
                        styles.modalOptionButtonText,
                        planChangeData.cookingTime === option.value && styles.modalOptionButtonTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Spice Level */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Preferred Spice Level</Text>
                <View style={styles.optionsGrid}>
                  {[
                    { value: 'mild', label: 'Mild' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'spicy', label: 'Spicy' }
                  ].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.modalOptionButton,
                        planChangeData.spiceLevel === option.value && styles.modalOptionButtonSelected
                      ]}
                      onPress={() => setPlanChangeData(prev => ({ ...prev, spiceLevel: option.value as any }))}
                    >
                      <Text style={[
                        styles.modalOptionButtonText,
                        planChangeData.spiceLevel === option.value && styles.modalOptionButtonTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowPlanModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSubmitButton}
                onPress={() => {
                  handlePlanChangeSubmit();
                  setShowPlanModal(false);
                }}
              >
                <Text style={styles.modalSubmitButtonText}>Update Plan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaContextView>
  );
};

type ProfileRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
  editable?: boolean;
};

const ProfileRow: React.FC<ProfileRowProps> = ({ icon, label, value, onPress, editable = false }) => (
  <TouchableOpacity 
    style={styles.profileRow} 
    onPress={onPress}
    activeOpacity={editable ? 0.7 : 1}
  >
    <View style={styles.rowLeft}>
      <Ionicons name={icon} size={22} color="#666" />
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
    <View style={styles.rowRight}>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
      {editable && <Ionicons name="chevron-forward" size={20} color="#999" />}
    </View>
  </TouchableOpacity>
);

type MetricCardProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  value: string;
  subtitle?: string;
};

const MetricCard: React.FC<MetricCardProps> = ({ icon, title, value, subtitle = '' }) => (
  <View style={styles.metricCard}>
    <View style={styles.metricHeader}>
      <MaterialCommunityIcons name={icon} size={18} color="#6C63FF" />
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
  </View>
);

const getBmiCategory = (bmi: number) => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi >= 18.5 && bmi < 25) return 'Normal';
  if (bmi >= 25 && bmi < 30) return 'Overweight';
  return 'Obese';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: '#999',
  },
  premiumBanner: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 10,
  },
  premiumGradient: {
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 10,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '50%',
  },
  rowValue: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  dietPlanContainer: {
    paddingVertical: 12,
  },
  planInfo: {
    marginBottom: 12,
  },
  dietPlanText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginBottom: 4,
  },
  planSubtext: {
    fontSize: 14,
    color: '#666',
  },
  changePlanButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  changePlanButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Form styles
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  optionButtonSelected: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  optionButtonTextSelected: {
    color: 'white',
  },
  submitButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Settings styles
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    maxHeight: 500,
    paddingHorizontal: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  modalOptionButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  modalOptionButtonSelected: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  modalOptionButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  modalOptionButtonTextSelected: {
    color: 'white',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSubmitButton: {
    flex: 1,
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalSubmitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  logoutButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;