import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

// User Profile Interface
export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  age?: number;
  weight?: number;
  height?: number;
  dietaryPreferences?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Meal Interface
export interface Meal {
  id?: string;
  userId: string;
  name: string;
  description?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  instructions?: string[];
  imageUrl?: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Grocery Item Interface
export interface GroceryItem {
  id?: string;
  userId: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  isCompleted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  weekStartDate?: string;
}

// Diet Plan Interfaces
export interface DietPlanMeal {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
  completed: boolean;
}

export interface DietPlanDay {
  date: string; // YYYY-MM-DD
  meals: DietPlanMeal[];
}

export interface DietPlan {
  id?: string;
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  days: DietPlanDay[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// User Profile Service
export const userProfileService = {
  // Create or update user profile
  async createOrUpdateProfile(profile: UserProfile): Promise<void> {
    const userRef = doc(db, 'users', profile.uid);
    await setDoc(userRef, {
      ...profile,
      updatedAt: Timestamp.now()
    }, { merge: true });
  },

  // Get user profile
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  },

  // Listen to user profile changes
  subscribeToUserProfile(uid: string, callback: (profile: UserProfile | null) => void) {
    const userRef = doc(db, 'users', uid);
    return onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as UserProfile);
      } else {
        callback(null);
      }
    });
  }
};

// Meal Service
export const mealService = {
  // Create a new meal
  async createMeal(meal: Omit<Meal, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const mealData = {
      ...meal,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    const docRef = await addDoc(collection(db, 'meals'), mealData);
    return docRef.id;
  },

  // Get meals for a user
  async getUserMeals(userId: string): Promise<Meal[]> {
    const q = query(
      collection(db, 'meals'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Meal[];
  },

  // Get meals by type
  async getMealsByType(userId: string, mealType: Meal['mealType']): Promise<Meal[]> {
    const q = query(
      collection(db, 'meals'),
      where('userId', '==', userId),
      where('mealType', '==', mealType),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Meal[];
  },

  // Update a meal
  async updateMeal(mealId: string, updates: Partial<Meal>): Promise<void> {
    const mealRef = doc(db, 'meals', mealId);
    await updateDoc(mealRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  },

  // Delete a meal
  async deleteMeal(mealId: string): Promise<void> {
    const mealRef = doc(db, 'meals', mealId);
    await deleteDoc(mealRef);
  },

  // Listen to user meals
  subscribeToUserMeals(userId: string, callback: (meals: Meal[]) => void) {
    const q = query(
      collection(db, 'meals'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (querySnapshot) => {
      const meals = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Meal[];
      callback(meals);
    });
  }
};

// Grocery Service
export const groceryService = {
  // Add grocery item
  async addGroceryItem(item: Omit<GroceryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const itemData = {
      ...item,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    const docRef = await addDoc(collection(db, 'grocery'), itemData);
    return docRef.id;
  },

  // Get user's grocery list
  async getUserGroceryList(userId: string): Promise<GroceryItem[]> {
    const q = query(
      collection(db, 'grocery'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as GroceryItem[];
  },

  // Update grocery item
  async updateGroceryItem(itemId: string, updates: Partial<GroceryItem>): Promise<void> {
    const itemRef = doc(db, 'grocery', itemId);
    await updateDoc(itemRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  },

  // Delete grocery item
  async deleteGroceryItem(itemId: string): Promise<void> {
    const itemRef = doc(db, 'grocery', itemId);
    await deleteDoc(itemRef);
  },

  // Toggle grocery item completion
  async toggleGroceryItem(itemId: string, isCompleted: boolean): Promise<void> {
    const itemRef = doc(db, 'grocery', itemId);
    await updateDoc(itemRef, {
      isCompleted,
      updatedAt: Timestamp.now()
    });
  },

  // Listen to user's grocery list
  subscribeToUserGroceryList(userId: string, callback: (items: GroceryItem[]) => void) {
    const q = query(
      collection(db, 'grocery'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (querySnapshot) => {
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GroceryItem[];
      callback(items);
    });
  }
}; 

export const planService = {
  // Delete all existing plans for a user
  async deleteUserPlans(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'plans'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        console.log(`Deleted ${querySnapshot.docs.length} existing plan(s) for user ${userId}`);
      }
    } catch (error) {
      console.error('Error deleting user plans:', error);
      throw error;
    }
  },

  // Create a new 1-month diet plan for a user (deletes old plans first)
  async createPlan(plan: Omit<DietPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Delete existing plans for this user first
      await this.deleteUserPlans(plan.userId);
      
      const planData = {
        ...plan,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const docRef = await addDoc(collection(db, 'plans'), planData);
      console.log(`Created new plan with ID: ${docRef.id} for user ${plan.userId}`);
      return docRef.id;
    } catch (error) {
      console.error('Error creating plan:', error);
      throw error;
    }
  },

  // Get the latest plan for a user
  async getUserPlan(userId: string): Promise<DietPlan | null> {
    const q = query(
      collection(db, 'plans'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    const docSnap = querySnapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as DietPlan;
  },

  // Update a meal's completion status in a plan for a specific day/meal
  async updateMealCompletion(planId: string, date: string, mealId: string, completed: boolean): Promise<void> {
    const planRef = doc(db, 'plans', planId);
    const planSnap = await getDoc(planRef);
    if (!planSnap.exists()) return;
    const plan = planSnap.data() as DietPlan;
    const days = plan.days.map((day: DietPlanDay) => {
      if (day.date !== date) return day;
      return {
        ...day,
        meals: day.meals.map(meal =>
          meal.id === mealId ? { ...meal, completed } : meal
        ),
      };
    });
    await updateDoc(planRef, { days, updatedAt: Timestamp.now() });
  },
}; 