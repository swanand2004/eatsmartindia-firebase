import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  StatusBar
} from 'react-native';
import { SafeAreaView as SafeAreaContextView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner-native';
import { getAuth, onAuthStateChanged, User, sendEmailVerification } from 'firebase/auth';

type RootStackParamList = {
  Login: undefined;
  Onboarding: undefined;
  Home: undefined;
};

type EmailVerificationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;

const EmailVerificationScreen = () => {
  const navigation = useNavigation<EmailVerificationScreenNavigationProp>();
  const { currentUser, signOutUser } = useAuth();
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    // Check if user is verified every 3 seconds
    const checkVerification = setInterval(async () => {
      if (currentUser) {
        await currentUser.reload();
        if (currentUser.emailVerified) {
          setIsVerified(true);
          clearInterval(checkVerification);
          toast.success('Email verified successfully!');
          // NavigationHandler will automatically check onboarding status and navigate accordingly
          // No need to manually navigate here
        }
      }
    }, 3000);

    // Countdown timer for resend
    const countdown = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(checkVerification);
      clearInterval(countdown);
    };
  }, [currentUser, navigation]);

  const handleResendEmail = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      await sendEmailVerification(currentUser);
      setTimeLeft(60);
      toast.success('Verification email sent again!');
    } catch (error: any) {
      console.error('Resend error:', error);
      toast.error('Failed to resend email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEmail = () => {
    // Try to open default email app
    const emailProviders = [
      'mailto:',
      'https://mail.google.com',
      'https://outlook.live.com',
      'https://mail.yahoo.com'
    ];

    Alert.alert(
      'Open Email App',
      'Choose how to open your email:',
      [
        {
          text: 'Gmail',
          onPress: () => Linking.openURL('https://mail.google.com')
        },
        {
          text: 'Outlook',
          onPress: () => Linking.openURL('https://outlook.live.com')
        },
        {
          text: 'Yahoo Mail',
          onPress: () => Linking.openURL('https://mail.yahoo.com')
        },
        {
          text: 'Default App',
          onPress: () => Linking.openURL('mailto:')
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const handleBackToLogin = async () => {
    Alert.alert(
      'Go Back to Login',
      'Are you sure? You will be signed out.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOutUser();
              navigation.navigate('Login');
            } catch (error) {
              console.error('Sign out error:', error);
            }
          }
        }
      ]
    );
  };

  if (!currentUser) {
    return (
      <SafeAreaContextView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.content}>
          <Text style={styles.title}>No User Found</Text>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <LinearGradient
              colors={['#6C63FF', '#4ECDC4']}
              style={styles.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.buttonText}>Go to Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaContextView>
    );
  }

  return (
    <SafeAreaContextView style={{ flex: 1, backgroundColor: 'white' }} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="mail" size={80} color="#6C63FF" />
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a verification email to:
          </Text>
          <Text style={styles.email}>{currentUser.email}</Text>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            1. Check your email inbox (and spam folder)
          </Text>
          <Text style={styles.instructionText}>
            2. Click the verification link in the email
          </Text>
          <Text style={styles.instructionText}>
            3. Come back here and wait for automatic verification
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleOpenEmail}
          >
            <LinearGradient
              colors={['#6C63FF', '#4ECDC4']}
              style={styles.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="mail-open" size={20} color="white" />
              <Text style={styles.buttonText}>Open Email App</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.secondaryButton, timeLeft > 0 && styles.disabledButton]}
            onPress={handleResendEmail}
            disabled={timeLeft > 0 || isLoading}
          >
            <Text style={[styles.secondaryButtonText, timeLeft > 0 && styles.disabledText]}>
              {timeLeft > 0 ? `Resend in ${timeLeft}s` : 'Resend Email'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackToLogin}
          >
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>

        {/* Status */}
        <View style={styles.statusContainer}>
          <Ionicons 
            name={isVerified ? "checkmark-circle" : "time"} 
            size={24} 
            color={isVerified ? "#4ECDC4" : "#FFA500"} 
          />
          <Text style={styles.statusText}>
            {isVerified ? 'Email verified! Redirecting...' : 'Waiting for verification...'}
          </Text>
        </View>
      </View>
    </SafeAreaContextView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#6C63FF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  instructions: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
  },
  instructionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    lineHeight: 24,
  },
  buttonContainer: {
    marginBottom: 30,
  },
  primaryButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
  },
  gradient: {
    paddingVertical: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  secondaryButton: {
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  secondaryButtonText: {
    color: '#6C63FF',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#999',
  },
  backButton: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  statusText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default EmailVerificationScreen; 