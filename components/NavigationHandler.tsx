import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { OnboardingService } from '../services/onboardingService';

type RootStackParamList = {
  Login: undefined;
  EmailVerification: undefined;
  Onboarding: undefined;
  Home: undefined;
  FirebaseTest: undefined;
};

type NavigationHandlerNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface NavigationHandlerProps {
  children: React.ReactNode;
}

export default function NavigationHandler({ children }: NavigationHandlerProps) {
  const { currentUser, loading } = useAuth();
  const navigation = useNavigation<NavigationHandlerNavigationProp>();
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      console.log('NavigationHandler: Starting check...', { currentUser: !!currentUser, loading });
      
      if (loading) {
        console.log('NavigationHandler: Still loading, waiting...');
        return;
      }

      try {
        if (!currentUser) {
          console.log('NavigationHandler: No user, going to Login');
          // Clear any old onboarding flags when no user is logged in
          try {
            const keys = await AsyncStorage.getAllKeys();
            const onboardingKeys = keys.filter(key => key.startsWith('@hasCompletedOnboarding_'));
            if (onboardingKeys.length > 0) {
              await AsyncStorage.multiRemove(onboardingKeys);
              console.log('NavigationHandler: Cleared old onboarding flags');
            }
          } catch (error) {
            console.log('NavigationHandler: Error clearing old flags:', error);
          }
          
          // No user logged in, stay on login screen
          setTimeout(() => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }, 100);
          return;
        }

        console.log('NavigationHandler: User found, checking onboarding status...');
        
        // Always check Firestore first for the current user's onboarding status
        try {
          const onboardingData = await OnboardingService.getOnboardingData(currentUser.uid);
          console.log('NavigationHandler: Firestore onboarding data:', onboardingData);
          
          if (onboardingData?.isOnboardingComplete) {
            console.log('NavigationHandler: Onboarding completed in Firestore, syncing to AsyncStorage and going to Home');
            // User has completed onboarding, sync to AsyncStorage and go to home
            await AsyncStorage.setItem(`@hasCompletedOnboarding_${currentUser.uid}`, 'true');
            setTimeout(() => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            }, 100);
          } else {
            console.log('NavigationHandler: Onboarding not completed, going to Onboarding');
            // User hasn't completed onboarding, clear any old flags and go to onboarding screen
            await AsyncStorage.removeItem(`@hasCompletedOnboarding_${currentUser.uid}`);
            setTimeout(() => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Onboarding' }],
              });
            }, 100);
          }
        } catch (error) {
          console.error('NavigationHandler: Error checking onboarding data:', error);
          // If there's an error checking Firestore, default to onboarding
          await AsyncStorage.removeItem(`@hasCompletedOnboarding_${currentUser.uid}`);
          setTimeout(() => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Onboarding' }],
            });
          }, 100);
        }
      } catch (error) {
        console.error('NavigationHandler: Error in navigation handler:', error);
        // Default to login screen on error
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }, 100);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [currentUser, loading, navigation]);

  if (loading || isCheckingOnboarding) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return <>{children}</>;
} 