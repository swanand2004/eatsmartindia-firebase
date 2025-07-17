import { 
  doc, 
  setDoc, 
  getDoc, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface OnboardingData {
  uid: string;
  // Basic Information
  name?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  height?: number; // in cm
  weight?: number; // in kg
  
  // Health Information
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal?: 'lose_weight' | 'maintain_weight' | 'gain_weight' | 'build_muscle';
  dietaryRestrictions?: string[];
  allergies?: string[];
  healthConditions?: string[];
  
  // Preferences
  cuisinePreferences?: string[];
  spiceLevel?: 'mild' | 'medium' | 'hot';
  cookingTime?: 'quick' | 'moderate' | 'elaborate';
  budget?: 'low' | 'medium' | 'high';
  
  // App Settings
  notifications?: boolean;
  mealReminders?: boolean;
  weeklyReports?: boolean;
  
  // Progress Tracking
  isOnboardingComplete?: boolean;
  onboardingStep?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class OnboardingService {
  /**
   * Create or update onboarding data
   */
  static async saveOnboardingData(
    uid: string, 
    data: Partial<OnboardingData>
  ): Promise<void> {
    try {
      const userRef = doc(db, 'onboarding', uid);
      
      const onboardingData: OnboardingData = {
        uid,
        ...data,
        updatedAt: Timestamp.now(),
        createdAt: data.createdAt || Timestamp.now()
      };

      await setDoc(userRef, onboardingData, { merge: true });
      console.log('Onboarding data saved successfully for user:', uid);
      
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      throw error;
    }
  }

  /**
   * Get onboarding data for a user
   */
  static async getOnboardingData(uid: string): Promise<OnboardingData | null> {
    try {
      const userRef = doc(db, 'onboarding', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data() as OnboardingData;
      }
      return null;
      
    } catch (error) {
      console.error('Error getting onboarding data:', error);
      throw error;
    }
  }

  /**
   * Update specific onboarding fields
   */
  static async updateOnboardingData(
    uid: string, 
    updates: Partial<OnboardingData>
  ): Promise<void> {
    try {
      console.log('Updating onboarding data for user:', uid, 'with updates:', updates);
      
      const userRef = doc(db, 'onboarding', uid);
      
      // First check if document exists
      const docSnap = await getDoc(userRef);
      console.log('Document exists:', docSnap.exists());
      
      if (docSnap.exists()) {
        // Document exists, use setDoc with merge
        console.log('Updating existing document');
        await setDoc(userRef, {
          ...updates,
          updatedAt: Timestamp.now()
        }, { merge: true });
      } else {
        // Document doesn't exist, create it with all required fields
        console.log('Creating new document');
        await setDoc(userRef, {
          uid,
          ...updates,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
      
      console.log('Onboarding data updated successfully for user:', uid);
      
    } catch (error) {
      console.error('Error updating onboarding data for user:', uid, 'Error:', error);
      console.error('Updates that failed:', updates);
      throw error;
    }
  }

  /**
   * Mark onboarding as complete
   */
  static async completeOnboarding(uid: string): Promise<void> {
    try {
      await this.updateOnboardingData(uid, {
        isOnboardingComplete: true,
        onboardingStep: 100
      });
      
      console.log('Onboarding marked as complete for user:', uid);
      
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
  }

  /**
   * Update onboarding step
   */
  static async updateOnboardingStep(uid: string, step: number): Promise<void> {
    try {
      await this.updateOnboardingData(uid, {
        onboardingStep: step
      });
      
      console.log('Onboarding step updated to:', step, 'for user:', uid);
      
    } catch (error) {
      console.error('Error updating onboarding step:', error);
      throw error;
    }
  }

  /**
   * Calculate BMI and health metrics
   */
  static calculateHealthMetrics(height: number, weight: number) {
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    
    let bmiCategory = '';
    if (bmi < 18.5) bmiCategory = 'Underweight';
    else if (bmi < 25) bmiCategory = 'Normal weight';
    else if (bmi < 30) bmiCategory = 'Overweight';
    else bmiCategory = 'Obese';

    // Calculate daily calorie needs (basic formula)
    const bmr = 10 * weight + 6.25 * height - 5 * 25; // Assuming age 25
    const dailyCalories = bmr * 1.2; // Sedentary activity

    return {
      bmi: Math.round(bmi * 10) / 10,
      bmiCategory,
      dailyCalories: Math.round(dailyCalories),
      idealWeightRange: {
        min: Math.round(18.5 * heightInMeters * heightInMeters),
        max: Math.round(24.9 * heightInMeters * heightInMeters)
      }
    };
  }

  /**
   * Get onboarding progress percentage
   */
  static getOnboardingProgress(data: Partial<OnboardingData>): number {
    const requiredFields = [
      'name', 'age', 'gender', 'height', 'weight',
      'activityLevel', 'goal', 'dietaryRestrictions'
    ];
    
    const completedFields = requiredFields.filter(field => 
      data[field as keyof OnboardingData] !== undefined && 
      data[field as keyof OnboardingData] !== null
    );
    
    return Math.round((completedFields.length / requiredFields.length) * 100);
  }

  /**
   * Validate onboarding data
   */
  static validateOnboardingData(data: Partial<OnboardingData>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!data.name || data.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
    
    if (!data.age || data.age < 13 || data.age > 120) {
      errors.push('Age must be between 13 and 120');
    }
    
    if (!data.height || data.height < 100 || data.height > 250) {
      errors.push('Height must be between 100 and 250 cm');
    }
    
    if (!data.weight || data.weight < 30 || data.weight > 300) {
      errors.push('Weight must be between 30 and 300 kg');
    }
    
    if (!data.activityLevel) {
      errors.push('Activity level is required');
    }
    
    if (!data.goal) {
      errors.push('Goal is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 

/**
 * Calculate daily calorie and protein goals based on user info
 * @param {Object} params - User info
 * @param {number} params.height - Height in cm
 * @param {number} params.weight - Weight in kg
 * @param {number} params.age - Age in years
 * @param {'male'|'female'|'other'} params.gender - Gender
 * @param {'sedentary'|'light'|'moderate'|'active'|'very_active'} params.activityLevel - Activity level
 * @param {'lose_weight'|'maintain_weight'|'gain_weight'|'build_muscle'} params.goal - Diet goal
 * @returns {{caloriesGoal: number, proteinGoal: number}}
 */
export function calculateCalorieAndProteinGoals({
  height,
  weight,
  age,
  gender,
  activityLevel,
  goal
}: {
  height?: number;
  weight?: number;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal?: 'lose_weight' | 'maintain_weight' | 'gain_weight' | 'build_muscle';
}): { caloriesGoal: number; proteinGoal: number } {
  // Defaults for missing info
  const _weight = weight || 70;
  const _height = height || 170;
  const _age = age || 30;
  const _gender = gender || 'male';
  const _activity = activityLevel || 'sedentary';
  const _goal = goal || 'maintain_weight';

  // Mifflin-St Jeor BMR
  let bmr = 10 * _weight + 6.25 * _height - 5 * _age;
  bmr += _gender === 'male' ? 5 : _gender === 'female' ? -161 : -78;

  // Activity factor
  const activityFactors: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const activityMult = activityFactors[_activity] || 1.2;
  let caloriesGoal = bmr * activityMult;

  // Adjust for goal
  if (_goal === 'lose_weight') caloriesGoal -= 500;
  else if (_goal === 'gain_weight' || _goal === 'build_muscle') caloriesGoal += 500;
  caloriesGoal = Math.round(caloriesGoal);

  // Protein
  let proteinPerKg = 1.6;
  if (_goal === 'build_muscle' || _goal === 'gain_weight') proteinPerKg = 2.0;
  const proteinGoal = Math.round(_weight * proteinPerKg);

  return { caloriesGoal, proteinGoal };
} 