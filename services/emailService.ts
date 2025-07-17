import { sendEmailVerification, User, ActionCodeSettings } from 'firebase/auth';
import { toast } from 'sonner-native';

export interface EmailVerificationOptions {
  url?: string;
  handleCodeInApp?: boolean;
  iOS?: {
    bundleId: string;
  };
  android?: {
    packageName: string;
    installApp?: boolean;
    minimumVersion?: string;
  };
  dynamicLinkDomain?: string;
}

export class EmailService {
  /**
   * Send email verification with custom settings
   */
  static async sendVerificationEmail(
    user: User, 
    options: EmailVerificationOptions = {}
  ): Promise<void> {
    try {
      // Default settings to improve deliverability
      const defaultOptions: ActionCodeSettings = {
        url: 'https://eatsmartindia-16e75.firebaseapp.com/verify-email',
        handleCodeInApp: false,
        ...options
      };

      await sendEmailVerification(user, defaultOptions);
      
      console.log('Verification email sent successfully');
      console.log('User email:', user.email);
      console.log('Verification options:', defaultOptions);
      
    } catch (error: any) {
      console.error('Email verification error:', error);
      
      // Provide specific error messages
      switch (error.code) {
        case 'auth/too-many-requests':
          toast.error('Too many requests. Please wait before trying again.');
          break;
        case 'auth/user-not-found':
          toast.error('User not found. Please try logging in again.');
          break;
        case 'auth/invalid-email':
          toast.error('Invalid email address.');
          break;
        default:
          toast.error(`Email verification failed: ${error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Check if email is likely to be delivered
   */
  static validateEmail(email: string): { isValid: boolean; provider: string; risk: 'low' | 'medium' | 'high' } {
    const emailLower = email.toLowerCase();
    
    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, provider: 'unknown', risk: 'high' };
    }

    // Identify email provider
    let provider = 'unknown';
    let risk: 'low' | 'medium' | 'high' = 'medium';

    if (emailLower.includes('gmail.com')) {
      provider = 'Gmail';
      risk = 'low';
    } else if (emailLower.includes('outlook.com') || emailLower.includes('hotmail.com')) {
      provider = 'Outlook';
      risk = 'medium';
    } else if (emailLower.includes('yahoo.com')) {
      provider = 'Yahoo';
      risk = 'medium';
    } else if (emailLower.includes('icloud.com')) {
      provider = 'iCloud';
      risk = 'low';
    } else {
      // Custom domain or other provider
      provider = 'Custom';
      risk = 'high';
    }

    return { isValid: true, provider, risk };
  }

  /**
   * Get email delivery tips based on provider
   */
  static getDeliveryTips(provider: string): string[] {
    const tips: { [key: string]: string[] } = {
      'Gmail': [
        'Check your Gmail inbox and spam folder',
        'Add noreply@firebaseapp.com to your contacts',
        'Check the "Promotions" tab in Gmail'
      ],
      'Outlook': [
        'Check your Outlook inbox and junk folder',
        'Add noreply@firebaseapp.com to safe senders',
        'Check "Other" tab in Outlook'
      ],
      'Yahoo': [
        'Check your Yahoo inbox and spam folder',
        'Add noreply@firebaseapp.com to contacts',
        'Check "Bulk" folder in Yahoo'
      ],
      'iCloud': [
        'Check your iCloud Mail inbox and junk folder',
        'Add noreply@firebaseapp.com to contacts',
        'Check Mail app on all your devices'
      ],
      'Custom': [
        'Check your email inbox and spam folder',
        'Add noreply@firebaseapp.com to safe senders',
        'Contact your email administrator if needed'
      ]
    };

    return tips[provider] || tips['Custom'];
  }

  /**
   * Log email sending for debugging
   */
  static logEmailAttempt(user: User, options: EmailVerificationOptions = {}): void {
    console.log('=== Email Verification Attempt ===');
    console.log('User ID:', user.uid);
    console.log('Email:', user.email);
    console.log('Email Verified:', user.emailVerified);
    console.log('Creation Time:', user.metadata.creationTime);
    console.log('Options:', options);
    console.log('==================================');
  }
} 