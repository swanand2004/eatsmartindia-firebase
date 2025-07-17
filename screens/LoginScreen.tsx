import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  StatusBar
} from 'react-native';
import { SafeAreaView as SafeAreaContextView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner-native';
import { getAuth, signInWithPhoneNumber, PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { EmailService } from '../services/emailService';
import { OnboardingService } from '../services/onboardingService';
import AsyncStorage from '@react-native-async-storage/async-storage';


// Define navigation types
type RootStackParamList = {
  EmailVerification: undefined;
  Onboarding: undefined;
  Home: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;

const { width } = Dimensions.get('window');

// Professional OTP Input Component
const OTPInput = ({ value, onChangeText, maxLength = 6 }: { value: string; onChangeText: (text: string) => void; maxLength?: number }) => {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  const renderOTPCircles = () => {
    const circles = [];
    for (let i = 0; i < maxLength; i++) {
      const digit = value[i] || '';
      const isActive = i === value.length && isFocused;
      
      circles.push(
        <View key={i} style={[styles.otpCircle, isActive && styles.otpCircleActive]}>
          <Text style={[styles.otpDigit, digit && styles.otpDigitFilled]}>
            {digit}
          </Text>
          {isActive && <View style={styles.cursor} />}
        </View>
      );
    }
    return circles;
  };

  return (
    <TouchableOpacity style={styles.otpContainer} onPress={handlePress} activeOpacity={1}>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        maxLength={maxLength}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoFocus={true}
      />
      <View style={styles.otpCirclesContainer}>
        {renderOTPCircles()}
      </View>
    </TouchableOpacity>
  );
};

const LoginScreen = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { signIn, signUp, currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isOTPSent, setIsOTPSent] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Note: Phone authentication requires proper reCAPTCHA setup
  // For now, we'll focus on email authentication which is more reliable

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const animateTransition = (direction: 'left' | 'right') => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: direction === 'left' ? -width : width,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        const userCredential = await signUp(email, password);
        await EmailService.sendVerificationEmail(userCredential.user);
        EmailService.logEmailAttempt(userCredential.user);
        
        const emailValidation = EmailService.validateEmail(email);
        const tips = EmailService.getDeliveryTips(emailValidation.provider);
        
        toast.success(`Account created! Check your ${emailValidation.provider} email.`);
        console.log('Email delivery tips:', tips);
        
        navigation.navigate('EmailVerification');
      } else {
        const userCredential = await signIn(email, password);
        toast.success('Welcome back!');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Phone OTP
  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    setIsLoading(true);
    try {
      const auth = getAuth();
      const confirmation = await signInWithPhoneNumber(auth, `+91${phoneNumber}`);
      setVerificationId(confirmation.verificationId);
      setIsOTPSent(true);
      toast.success('OTP sent successfully!');
    } catch (error: any) {
      toast.error('Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 6) {
      toast.error('Please enter a valid OTP');
      return;
    }
    setIsLoading(true);
    try {
      const auth = getAuth();
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      await signInWithCredential(auth, credential);
      toast.success('Phone verified successfully!');
    } catch (error: any) {
      toast.error('Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    await handleSendOTP();
  };

  const handleBackToPhone = () => {
    setIsOTPSent(false);
    setOtp('');
    animateTransition('left');
  };

  const handleMethodChange = (method: 'email' | 'phone') => {
    setLoginMethod(method);
    setIsOTPSent(false);
    setOtp('');
    setPhoneNumber('');
    animateTransition(method === 'phone' ? 'right' : 'left');
  };

  return (
    <SafeAreaContextView style={{ flex: 1, backgroundColor: 'white' }} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="restaurant" size={60} color="#6C63FF" />
            <Text style={styles.title}>Eatsmart India</Text>
            <Text style={styles.subtitle}>Your personalized nutrition guide</Text>
          </View>

          {/* Login Method Toggle */}
          <View style={styles.methodToggle}>
            <TouchableOpacity 
              style={[styles.toggleButton, loginMethod === 'email' && styles.activeToggle]}
              onPress={() => setLoginMethod('email')}
            >
              <Ionicons name="mail" size={20} color={loginMethod === 'email' ? 'white' : '#6C63FF'} />
              <Text style={[styles.toggleText, loginMethod === 'email' && styles.activeToggleText]}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleButton, loginMethod === 'phone' && styles.activeToggle]}
              onPress={() => setLoginMethod('phone')}
            >
              <Ionicons name="call" size={20} color={loginMethod === 'phone' ? 'white' : '#6C63FF'} />
              <Text style={[styles.toggleText, loginMethod === 'phone' && styles.activeToggleText]}>Phone OTP</Text>
            </TouchableOpacity>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            {loginMethod === 'email' ? (
              <>
                <Text style={styles.sectionTitle}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleEmailAuth}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={['#6C63FF', '#4ECDC4']}
                    style={styles.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isLoading ? (
                      <Text style={styles.buttonText}>
                        {isSignUp ? 'Creating Account...' : 'Signing In...'}
                      </Text>
                    ) : (
                      <Text style={styles.buttonText}>
                        {isSignUp ? 'Create Account' : 'Sign In'}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.switchButton}
                  onPress={() => setIsSignUp(!isSignUp)}
                >
                  <Text style={styles.switchText}>
                    {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {!isOTPSent ? (
                  <>
                    <Text style={styles.sectionTitle}>Login with Phone</Text>
                    <Text style={styles.sectionDescription}>
                      We'll send you a verification code
                    </Text>
                    <View style={styles.phoneInputContainer}>
                      <View style={styles.countryCode}>
                        <Text style={styles.countryCodeText}>+91</Text>
                        <Ionicons name="chevron-down" size={16} color="#6C63FF" />
                      </View>
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="Enter your phone number"
                        keyboardType="phone-pad"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        maxLength={10}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={handleSendOTP}
                      disabled={phoneNumber.length < 10 || isLoading}
                    >
                      <LinearGradient
                        colors={['#6C63FF', '#4ECDC4']}
                        style={styles.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        {isLoading ? (
                          <Text style={styles.buttonText}>Sending...</Text>
                        ) : (
                          <Text style={styles.buttonText}>Send OTP</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.sectionTitle}>Enter Verification Code</Text>
                    <Text style={styles.otpSentText}>
                      We've sent a 6-digit code to +91 {phoneNumber}
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter 6-digit OTP"
                      keyboardType="number-pad"
                      value={otp}
                      onChangeText={setOtp}
                      maxLength={6}
                    />
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={handleVerifyOTP}
                      disabled={otp.length < 6 || isLoading}
                    >
                      <LinearGradient
                        colors={['#6C63FF', '#4ECDC4']}
                        style={styles.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        {isLoading ? (
                          <Text style={styles.buttonText}>Verifying...</Text>
                        ) : (
                          <Text style={styles.buttonText}>Verify & Continue</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaContextView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 0,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  methodToggle: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 20,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  activeToggle: {
    backgroundColor: '#6C63FF',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C63FF',
  },
  activeToggleText: {
    color: 'white',
  },
  disabledToggle: {
    backgroundColor: '#F0F0F0',
  },
  disabledToggleText: {
    color: '#999',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 16,
    color: '#333',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#E9ECEF',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C63FF',
    marginRight: 4,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 16,
    paddingLeft: 12,
    color: '#333',
  },
  otpSentText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  otpContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  otpCirclesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  otpCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    position: 'relative',
  },
  otpCircleActive: {
    borderColor: '#6C63FF',
    backgroundColor: 'white',
  },
  otpDigit: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  otpDigitFilled: {
    color: '#6C63FF',
  },
  cursor: {
    position: 'absolute',
    width: 2,
    height: 20,
    backgroundColor: '#6C63FF',
    borderRadius: 1,
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  gradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchText: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '500',
  },
  otpFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkText: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '500',
  },
  disabledLink: {
    color: '#999',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E9ECEF',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#666',
    fontSize: 14,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
    gap: 12,
  },
  appleButton: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  disabledSocialButton: {
    backgroundColor: '#F0F0F0',
    borderColor: '#E0E0E0',
  },
  disabledSocialButtonText: {
    color: '#999',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
});

export default LoginScreen;