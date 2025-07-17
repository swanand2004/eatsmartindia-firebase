import 'react-native-gesture-handler';
import React from 'react';
import { Toaster } from 'sonner-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './screens/HomeScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import MealsScreen from './screens/MealsScreen';
import GroceryScreen from './screens/GroceryScreen';
import ProfileScreen from './screens/ProfileScreen';
import LoginScreen from './screens/LoginScreen';
import FirebaseTestScreen from './screens/FirebaseTestScreen';
import EmailVerificationScreen from './screens/EmailVerificationScreen';
import NavigationHandler from './components/NavigationHandler';
import { MealProvider } from './context/MealContext';
import { AuthProvider } from './context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
import { i18n } from './i18n';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import OverviewAnalyticsScreen from './screens/analytics/OverviewAnalyticsScreen';
import AnalyticsScreen from './screens/analytics/AnalyticsScreen';

export type RootStackParamList = {
  Login: undefined;
  EmailVerification: undefined;
  Onboarding: undefined;
  Home: undefined; // Keeping 'Home' as you requested
  FirebaseTest: undefined;
};

type HomeTabParamList = {
  HomeTab: undefined;
  Meals: undefined;
  Grocery: undefined;
  Profile: undefined;
  Analytics: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<HomeTabParamList>();

function HomeTabsNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Meals') {
            iconName = focused ? 'restaurant' : 'restaurant-outline';
          } else if (route.name === 'Grocery') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'analytics' : 'bar-chart-outline';
          } else {
            iconName = 'help-circle';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          paddingBottom: Math.max(insets.bottom, 2),
          paddingTop: 0,
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          paddingBottom: 0,
          marginBottom: 0,
          paddingTop: 0,
          marginTop: 0,
          lineHeight: 12,
        },
        tabBarIconStyle: {
          marginTop: 0,
          paddingTop: 0,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="Meals" component={MealsScreen} />
      <Tab.Screen name="Grocery" component={GroceryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <MealProvider>
              <Toaster
                position="top-center"
                duration={3000}
                toastOptions={{
                  style: {
                    backgroundColor: '#333',
                    padding: 16,
                    borderRadius: 8,
                  },
                  titleStyle: {
                    color: '#fff',
                  },
                  actionButtonTextStyle: {
                    color: '#fff',
                  }
                }}
              />
              <NavigationContainer>
                <NavigationHandler>
                  <Stack.Navigator initialRouteName="Login">
                    <Stack.Screen
                      name="Login"
                      component={LoginScreen}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="EmailVerification"
                      component={EmailVerificationScreen}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="Onboarding"
                      component={OnboardingScreen}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="Home"
                      component={HomeTabsNavigator}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="FirebaseTest"
                      component={FirebaseTestScreen}
                      options={{ headerShown: false }}
                    />
                  </Stack.Navigator>
                </NavigationHandler>
              </NavigationContainer>
            </MealProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </I18nextProvider>
  );
}