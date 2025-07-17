import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar
} from 'react-native';
import { SafeAreaView as SafeAreaContextView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { userProfileService, mealService, groceryService } from '../services/firestoreService';
import { toast } from 'sonner-native';

const FirebaseTestScreen = () => {
  const { currentUser, signOutUser } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testAuthentication = () => {
    if (currentUser) {
      addTestResult(`✅ User authenticated: ${currentUser.email}`);
    } else {
      addTestResult('❌ No user authenticated');
    }
  };

  const testUserProfile = async () => {
    if (!currentUser) {
      addTestResult('❌ No user to test profile');
      return;
    }

    try {
      // Test creating/updating profile
      const profile = {
        uid: currentUser.uid,
        email: currentUser.email || '',
        name: 'Test User',
        age: 25,
        weight: 70,
        height: 175,
        dietaryPreferences: ['vegetarian'],
        createdAt: new Date() as any,
        updatedAt: new Date() as any
      };

      await userProfileService.createOrUpdateProfile(profile);
      addTestResult('✅ User profile created/updated');

      // Test reading profile
      const readProfile = await userProfileService.getUserProfile(currentUser.uid);
      if (readProfile) {
        addTestResult('✅ User profile read successfully');
      } else {
        addTestResult('❌ Failed to read user profile');
      }
    } catch (error) {
      addTestResult(`❌ User profile test failed: ${error}`);
    }
  };

  const testMealService = async () => {
    if (!currentUser) {
      addTestResult('❌ No user to test meals');
      return;
    }

    try {
      // Test creating a meal
      const meal = {
        userId: currentUser.uid,
        name: 'Test Meal',
        description: 'A test meal for Firebase testing',
        calories: 500,
        protein: 25,
        carbs: 50,
        fat: 20,
        ingredients: ['ingredient1', 'ingredient2'],
        instructions: ['step1', 'step2'],
        mealType: 'lunch' as const
      };

      const mealId = await mealService.createMeal(meal);
      addTestResult(`✅ Meal created with ID: ${mealId}`);

      // Test reading meals
      const meals = await mealService.getUserMeals(currentUser.uid);
      addTestResult(`✅ Read ${meals.length} meals for user`);

      // Test deleting the test meal
      await mealService.deleteMeal(mealId);
      addTestResult('✅ Test meal deleted');
    } catch (error) {
      addTestResult(`❌ Meal service test failed: ${error}`);
    }
  };

  const testGroceryService = async () => {
    if (!currentUser) {
      addTestResult('❌ No user to test grocery');
      return;
    }

    try {
      // Test adding grocery item
      const item = {
        userId: currentUser.uid,
        name: 'Test Item',
        quantity: 2,
        unit: 'pieces',
        category: 'vegetables',
        isCompleted: false
      };

      const itemId = await groceryService.addGroceryItem(item);
      addTestResult(`✅ Grocery item added with ID: ${itemId}`);

      // Test reading grocery list
      const items = await groceryService.getUserGroceryList(currentUser.uid);
      addTestResult(`✅ Read ${items.length} grocery items`);

      // Test updating item
      await groceryService.toggleGroceryItem(itemId, true);
      addTestResult('✅ Grocery item updated');

      // Test deleting the test item
      await groceryService.deleteGroceryItem(itemId);
      addTestResult('✅ Test grocery item deleted');
    } catch (error) {
      addTestResult(`❌ Grocery service test failed: ${error}`);
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    addTestResult('🚀 Starting Firebase tests...');
    
    testAuthentication();
    await testUserProfile();
    await testMealService();
    await testGroceryService();
    
    addTestResult('✅ All tests completed!');
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  return (
    <SafeAreaContextView style={{ flex: 1, backgroundColor: 'white' }} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Firebase Test Screen</Text>
          <Text style={styles.subtitle}>Test Firebase integration</Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userInfoText}>
            Current User: {currentUser?.email || 'Not logged in'}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.testButton} onPress={runAllTests}>
            <Text style={styles.buttonText}>Run All Tests</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Test Results:</Text>
          {testResults.map((result, index) => (
            <Text key={index} style={styles.resultText}>
              {result}
            </Text>
          ))}
        </View>
      </ScrollView>
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
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  userInfo: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  userInfoText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  buttonContainer: {
    marginBottom: 30,
  },
  testButton: {
    backgroundColor: '#6C63FF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    fontFamily: 'monospace',
  },
});

export default FirebaseTestScreen; 