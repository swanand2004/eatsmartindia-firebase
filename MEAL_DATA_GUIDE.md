# 🍽️ Meal Data Sources Guide for EatSmart India

## 📋 **Quick Start Options**

### **1. Use Local Data (Immediate Start)**
I've created a local meals database with 8 popular Indian dishes in `data/mealsData.ts`. This includes:
- ✅ Masala Dosa, Palak Paneer, Chicken Biryani, Idli Sambar
- ✅ Complete nutritional information
- ✅ Cooking instructions and ingredients
- ✅ Filtering by cuisine, diet, cooking time, etc.

**Usage:**
```typescript
import { mealsData, getPersonalizedMeals } from './data/mealsData';

// Get all meals
const allMeals = mealsData;

// Get personalized meals based on user preferences
const personalizedMeals = getPersonalizedMeals(mealsData, userPreferences);
```

### **2. Spoonacular API (Recommended for Production)**

**Step 1: Get API Key**
1. Go to https://spoonacular.com/food-api
2. Sign up for free account
3. Get your API key (150 requests/day free)

**Step 2: Configure API**
```typescript
// In mealService.ts, replace:
const SPOONACULAR_API_KEY = 'YOUR_ACTUAL_API_KEY';
```

**Step 3: Use the Service**
```typescript
import { mealService } from './services/mealService';

// Search meals
const meals = await mealService.searchMealsFromAPI({
  query: 'chicken',
  cuisine: 'indian',
  diet: 'non-vegetarian',
  maxReadyTime: 30
});

// Get personalized meals
const personalizedMeals = await mealService.getPersonalizedMeals();
```

## 🌐 **Alternative API Sources**

### **1. Edamam Recipe API**
- **URL**: https://developer.edamam.com/edamam-recipe-api
- **Free Tier**: 10 requests/minute
- **Pros**: Good nutrition data, multiple diet options
- **Cons**: Limited Indian cuisine

### **2. TheMealDB API**
- **URL**: https://www.themealdb.com/api.php
- **Free Tier**: Unlimited
- **Pros**: Free, no API key needed
- **Cons**: Limited to specific cuisines, no nutrition data

### **3. Indian Food Specific APIs**
- **Tarla Dalal API**: Traditional Indian recipes
- **Sanjeev Kapoor API**: Celebrity chef recipes
- **Custom APIs**: Many Indian food bloggers provide APIs

## 📊 **Data Structure**

Each meal includes:
```typescript
interface Meal {
  id: string;
  name: string;
  description: string;
  cuisine: 'north_indian' | 'south_indian' | 'east_indian' | 'west_indian';
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  dietType: 'veg' | 'non_veg' | 'jain';
  cookingTime: 'quick' | 'medium' | 'long';
  spiceLevel: 'mild' | 'medium' | 'spicy';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  ingredients: string[];
  instructions: string[];
  imageUrl: string;
  tags: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  allergens: string[];
  healthBenefits: string[];
}
```

## 🔧 **Integration Examples**

### **1. Update MealsScreen to Use Meal Service**
```typescript
import React, { useState, useEffect } from 'react';
import { mealService } from '../services/mealService';
import { Meal } from '../data/mealsData';

const MealsScreen = () => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeals();
  }, []);

  const loadMeals = async () => {
    try {
      setLoading(true);
      // Get personalized meals based on user preferences
      const personalizedMeals = await mealService.getPersonalizedMeals();
      setMeals(personalizedMeals);
    } catch (error) {
      console.error('Error loading meals:', error);
      // Fallback to local data
      setMeals(mealService.searchLocalMeals({}));
    } finally {
      setLoading(false);
    }
  };

  const searchMeals = async (query: string) => {
    try {
      const searchResults = await mealService.searchMealsFromAPI({ query });
      setMeals(searchResults);
    } catch (error) {
      console.error('Error searching meals:', error);
    }
  };

  // ... rest of your component
};
```

### **2. Add Meal Categories**
```typescript
const getMealsByCategory = (category: string) => {
  return mealService.getMealsByCategory(category);
};

const getMealsByCuisine = (cuisine: string) => {
  return mealService.getMealsByCuisine(cuisine);
};

const getQuickMeals = () => {
  return mealService.getMealsByCookingTime('quick');
};
```

### **3. Filter by User Preferences**
```typescript
const getFilteredMeals = async () => {
  const userPreferences = await AsyncStorage.getItem('@userPreferences');
  if (userPreferences) {
    const preferences = JSON.parse(userPreferences);
    return getPersonalizedMeals(mealsData, preferences);
  }
  return mealsData;
};
```

## 🎯 **Recommended Implementation Steps**

### **Phase 1: Local Data (Week 1)**
1. ✅ Use the provided `mealsData.ts` (already created)
2. Update MealsScreen to display meals
3. Add meal detail screens
4. Implement basic filtering

### **Phase 2: API Integration (Week 2)**
1. Get Spoonacular API key
2. Test API integration
3. Add error handling and fallbacks
4. Implement search functionality

### **Phase 3: Personalization (Week 3)**
1. Connect with user onboarding preferences
2. Implement personalized meal recommendations
3. Add meal planning features
4. Add favorites and history

### **Phase 4: Advanced Features (Week 4)**
1. Add meal images
2. Implement nutritional tracking
3. Add meal sharing features
4. Add user-generated content

## 📱 **UI Components to Create**

### **1. Meal Card Component**
```typescript
const MealCard = ({ meal, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <View>
      <Image source={{ uri: meal.imageUrl }} />
      <Text>{meal.name}</Text>
      <Text>{meal.calories} cal</Text>
      <Text>{meal.cookingTime}</Text>
    </View>
  </TouchableOpacity>
);
```

### **2. Meal Detail Screen**
```typescript
const MealDetailScreen = ({ route }) => {
  const { mealId } = route.params;
  const [meal, setMeal] = useState(null);

  useEffect(() => {
    loadMealDetails();
  }, [mealId]);

  const loadMealDetails = async () => {
    const mealDetails = await mealService.getMealById(mealId);
    setMeal(mealDetails);
  };

  // Display meal details, ingredients, instructions
};
```

### **3. Meal Search Component**
```typescript
const MealSearch = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    onSearch(query);
  };

  return (
    <View>
      <TextInput 
        value={query}
        onChangeText={setQuery}
        placeholder="Search meals..."
      />
      <Button title="Search" onPress={handleSearch} />
    </View>
  );
};
```

## 🔒 **Security & Best Practices**

### **1. API Key Security**
```typescript
// Use environment variables
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

// Or store in secure storage
import * as SecureStore from 'expo-secure-store';

const getApiKey = async () => {
  return await SecureStore.getItemAsync('spoonacular_api_key');
};
```

### **2. Rate Limiting**
```typescript
class RateLimiter {
  private requests: number = 0;
  private lastReset: number = Date.now();

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastReset > 24 * 60 * 60 * 1000) {
      this.requests = 0;
      this.lastReset = now;
    }
    
    if (this.requests >= 150) {
      return false; // Limit reached
    }
    
    this.requests++;
    return true;
  }
}
```

### **3. Caching**
```typescript
const cacheMeals = async (meals: Meal[]) => {
  await AsyncStorage.setItem('@cached_meals', JSON.stringify(meals));
};

const getCachedMeals = async (): Promise<Meal[]> => {
  const cached = await AsyncStorage.getItem('@cached_meals');
  return cached ? JSON.parse(cached) : [];
};
```

## 📈 **Scaling Considerations**

### **1. Database Storage**
- Store popular meals in Firestore
- Cache frequently accessed data
- Implement offline support

### **2. Image Optimization**
- Use CDN for meal images
- Implement lazy loading
- Compress images for mobile

### **3. Performance**
- Implement pagination for large meal lists
- Use React.memo for meal components
- Optimize re-renders

## 🚀 **Next Steps**

1. **Start with local data** - Use the provided `mealsData.ts`
2. **Get API key** - Sign up for Spoonacular
3. **Update MealsScreen** - Integrate with meal service
4. **Add meal details** - Create detailed meal view
5. **Implement search** - Add search functionality
6. **Add personalization** - Connect with user preferences

The meal service is designed to work seamlessly with both local data and external APIs, providing a robust foundation for your EatSmart app! 🎉 