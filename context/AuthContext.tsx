import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
  sendPasswordResetEmail,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendEmailVerification,
  applyActionCode,
  checkActionCode
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebaseConfig';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signInWithPhone: (phoneNumber: string) => Promise<any>;
  verifyPhoneOTP: (verificationId: string, otp: string) => Promise<any>;
  signOutUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  verifyEmail: (actionCode: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  function signUp(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function signIn(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function signInWithGoogle() {
    // For React Native, we'll need to implement Google sign-in differently
    // This is a placeholder - you'll need to use Expo Google Auth or react-native-google-signin
    return new Promise((resolve, reject) => {
      reject(new Error('Google sign-in requires additional setup for React Native. Please use Expo Google Auth or react-native-google-signin library.'));
    });
  }

  function signInWithPhone(phoneNumber: string) {
    // Note: For React Native, you'll need to implement recaptcha differently
    // This is a placeholder - you'll need to use a library like react-native-firebase
    // or implement recaptcha verification for mobile
    return new Promise((resolve, reject) => {
      reject(new Error('Phone authentication requires additional setup for React Native'));
    });
  }

  function verifyPhoneOTP(verificationId: string, otp: string) {
    // This would be implemented with the actual verification
    return new Promise((resolve, reject) => {
      reject(new Error('Phone OTP verification requires additional setup'));
    });
  }

  async function signOutUser() {
    try {
      // Clear user-specific AsyncStorage data when signing out
      if (currentUser) {
        await AsyncStorage.removeItem(`@hasCompletedOnboarding_${currentUser.uid}`);
        await AsyncStorage.removeItem('@userName');
        await AsyncStorage.removeItem('@userPreferences');
      }
      return signOut(auth);
    } catch (error) {
      console.error('Error clearing AsyncStorage during sign out:', error);
      return signOut(auth);
    }
  }

  function resetPassword(email: string) {
    return sendPasswordResetEmail(auth, email);
  }

  function sendEmailVerificationToUser() {
    if (currentUser) {
      return sendEmailVerification(currentUser);
    }
    throw new Error('No user logged in');
  }

  function verifyEmail(actionCode: string) {
    return applyActionCode(auth, actionCode);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    // Note: Google sign-in redirect handling removed for React Native compatibility

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithPhone,
    verifyPhoneOTP,
    signOutUser,
    resetPassword,
    sendEmailVerification: sendEmailVerificationToUser,
    verifyEmail
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 