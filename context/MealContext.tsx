// context/MealContext.tsx
import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { planService, DietPlan } from '../services/firestoreService';
import { useAuth } from './AuthContext';

type Meal = {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  ingredients: string[];
  completed: boolean;
};

type MealsData = {
  [date: string]: Meal[];
};

export type GroceryItem = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  checked: boolean;
};

type CompletionState = {
  [date: string]: {
    [mealId: string]: boolean;
  };
};

type MealContextType = {
  completion: CompletionState;
  toggleMealCompletion: (date: string, mealId: string) => void;
  plan: DietPlan | null;
  refreshPlan: () => Promise<void>;
  loading: boolean;
};

const MealContext = createContext<MealContextType | undefined>(undefined);

export const MealProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [completion, setCompletion] = useState<CompletionState>({});
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();

  const refreshPlan = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    setLoading(true);
    try {
      const userPlan = await planService.getUserPlan(currentUser.uid);
      setPlan(userPlan);
    } catch (error) {
      console.error('Error refreshing plan:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const toggleMealCompletion = (date: string, mealId: string) => {
    setCompletion(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        [mealId]: !prev[date]?.[mealId],
      },
    }));
  };

  // Initial plan load
  React.useEffect(() => {
    refreshPlan();
  }, [refreshPlan]);

  const value = useMemo(() => ({
    completion,
    toggleMealCompletion,
    plan,
    refreshPlan,
    loading
  }), [completion, plan, refreshPlan, loading]);

  return (
    <MealContext.Provider value={value}>
      {children}
    </MealContext.Provider>
  );
};

export const useMeals = () => {
  const context = useContext(MealContext);
  if (!context) {
    throw new Error('useMeals must be used within a MealProvider');
  }
  return context;
};