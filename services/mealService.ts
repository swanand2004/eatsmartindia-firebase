import { mealsData, Meal, getPersonalizedMeals } from '../data/mealsData';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
const SPOONACULAR_API_KEY = 'YOUR_SPOONACULAR_API_KEY'; // Get from https://spoonacular.com/food-api
const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com/recipes';

export interface MealSearchParams {
  query?: string;
  cuisine?: string;
  diet?: string;
  intolerances?: string[];
  maxReadyTime?: number;
  minProtein?: number;
  maxCalories?: number;
  number?: number;
}

export interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  nutrition: {
    nutrients: Array<{
      name: string;
      amount: number;
      unit: string;
    }>;
  };
  analyzedInstructions: Array<{
    steps: Array<{
      step: string;
      ingredients: Array<{
        name: string;
      }>;
    }>;
  }>;
  cuisines: string[];
  dishTypes: string[];
  diets: string[];
  intolerances: string[];
}

class MealService {
  /**
   * Search meals from Spoonacular API
   */
  async searchMealsFromAPI(params: MealSearchParams): Promise<Meal[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.query) queryParams.append('query', params.query);
      if (params.cuisine) queryParams.append('cuisine', params.cuisine);
      if (params.diet) queryParams.append('diet', params.diet);
      if (params.intolerances) queryParams.append('intolerances', params.intolerances.join(','));
      if (params.maxReadyTime) queryParams.append('maxReadyTime', params.maxReadyTime.toString());
      if (params.minProtein) queryParams.append('minProtein', params.minProtein.toString());
      if (params.maxCalories) queryParams.append('maxCalories', params.maxCalories.toString());
      if (params.number) queryParams.append('number', params.number.toString());
      
      queryParams.append('apiKey', SPOONACULAR_API_KEY);
      queryParams.append('addRecipeNutrition', 'true');
      queryParams.append('instructionsRequired', 'true');

      const response = await fetch(`${SPOONACULAR_BASE_URL}/complexSearch?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return this.convertSpoonacularToMeals(data.results);
      
    } catch (error) {
      console.error('Error fetching meals from API:', error);
      // Fallback to local data
      return this.searchLocalMeals(params);
    }
  }

  /**
   * Convert Spoonacular recipe to our Meal format
   */
  private convertSpoonacularToMeals(recipes: SpoonacularRecipe[]): Meal[] {
    return recipes.map(recipe => {
      const nutrition = recipe.nutrition.nutrients;
      
      return {
        id: recipe.id.toString(),
        name: recipe.title,
        description: `${recipe.title} - Ready in ${recipe.readyInMinutes} minutes`,
        cuisine: this.mapCuisine(recipe.cuisines),
        category: this.mapCategory(recipe.dishTypes),
        dietType: this.mapDietType(recipe.diets),
        cookingTime: this.mapCookingTime(recipe.readyInMinutes),
        spiceLevel: 'medium', // Default since API doesn't provide this
        calories: this.getNutrientValue(nutrition, 'Calories'),
        protein: this.getNutrientValue(nutrition, 'Protein'),
        carbs: this.getNutrientValue(nutrition, 'Carbohydrates'),
        fat: this.getNutrientValue(nutrition, 'Fat'),
        fiber: this.getNutrientValue(nutrition, 'Fiber'),
        ingredients: this.extractIngredients(recipe.analyzedInstructions),
        instructions: this.extractInstructions(recipe.analyzedInstructions),
        imageUrl: recipe.image,
        tags: [...recipe.cuisines, ...recipe.dishTypes, ...recipe.diets],
        prepTime: Math.floor(recipe.readyInMinutes * 0.3),
        cookTime: Math.floor(recipe.readyInMinutes * 0.7),
        servings: recipe.servings,
        difficulty: this.mapDifficulty(recipe.readyInMinutes),
        allergens: recipe.intolerances,
        healthBenefits: this.generateHealthBenefits(nutrition)
      };
    });
  }

  /**
   * Search meals from local data
   */
  searchLocalMeals(params: MealSearchParams): Meal[] {
    let filteredMeals = [...mealsData];

    if (params.query) {
      filteredMeals = filteredMeals.filter(meal => 
        meal.name.toLowerCase().includes(params.query!.toLowerCase()) ||
        meal.description.toLowerCase().includes(params.query!.toLowerCase())
      );
    }

    if (params.cuisine) {
      filteredMeals = filteredMeals.filter(meal => meal.cuisine === params.cuisine);
    }

    if (params.diet) {
      filteredMeals = filteredMeals.filter(meal => meal.dietType === params.diet);
    }

    if (params.maxCalories) {
      filteredMeals = filteredMeals.filter(meal => meal.calories <= params.maxCalories!);
    }

    return filteredMeals;
  }

  /**
   * Get personalized meals based on user preferences
   */
  async getPersonalizedMeals(): Promise<Meal[]> {
    try {
      const userPreferences = await this.getUserPreferences();
      return getPersonalizedMeals(mealsData, userPreferences);
    } catch (error) {
      console.error('Error getting personalized meals:', error);
      return mealsData;
    }
  }

  /**
   * Get user preferences from AsyncStorage
   */
  private async getUserPreferences() {
    try {
      const preferences = await AsyncStorage.getItem('@userPreferences');
      if (preferences) {
        return JSON.parse(preferences);
      }
      return {};
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return {};
    }
  }

  /**
   * Get meal by ID
   */
  async getMealById(id: string): Promise<Meal | null> {
    // First check local data
    const localMeal = mealsData.find(meal => meal.id === id);
    if (localMeal) {
      return localMeal;
    }

    // If not found locally, try API
    try {
      const response = await fetch(`${SPOONACULAR_BASE_URL}/${id}/information?apiKey=${SPOONACULAR_API_KEY}`);
      if (response.ok) {
        const recipe = await response.json();
        return this.convertSpoonacularToMeals([recipe])[0];
      }
    } catch (error) {
      console.error('Error fetching meal by ID:', error);
    }

    return null;
  }

  /**
   * Get random meals
   */
  async getRandomMeals(count: number = 5): Promise<Meal[]> {
    try {
      const response = await fetch(`${SPOONACULAR_BASE_URL}/random?apiKey=${SPOONACULAR_API_KEY}&number=${count}`);
      if (response.ok) {
        const data = await response.json();
        return this.convertSpoonacularToMeals(data.recipes);
      }
    } catch (error) {
      console.error('Error fetching random meals:', error);
    }

    // Fallback to local random meals
    const shuffled = [...mealsData].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Get meals by category
   */
  getMealsByCategory(category: string): Meal[] {
    return mealsData.filter(meal => meal.category === category);
  }

  /**
   * Get meals by cuisine
   */
  getMealsByCuisine(cuisine: string): Meal[] {
    return mealsData.filter(meal => meal.cuisine === cuisine);
  }

  /**
   * Get meals by cooking time
   */
  getMealsByCookingTime(cookingTime: string): Meal[] {
    return mealsData.filter(meal => meal.cookingTime === cookingTime);
  }

  // Helper methods for converting API data
  private mapCuisine(cuisines: string[]): 'north_indian' | 'south_indian' | 'east_indian' | 'west_indian' {
    if (cuisines.includes('indian')) {
      // You can add logic to determine specific Indian region based on ingredients or other factors
      return 'north_indian';
    }
    return 'north_indian'; // Default
  }

  private mapCategory(dishTypes: string[]): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
    if (dishTypes.includes('breakfast')) return 'breakfast';
    if (dishTypes.includes('lunch')) return 'lunch';
    if (dishTypes.includes('dinner')) return 'dinner';
    return 'lunch'; // Default
  }

  private mapDietType(diets: string[]): 'veg' | 'non_veg' | 'jain' {
    if (diets.includes('vegetarian')) return 'veg';
    if (diets.includes('vegan')) return 'veg';
    return 'non_veg'; // Default
  }

  private mapCookingTime(readyInMinutes: number): 'quick' | 'medium' | 'long' {
    if (readyInMinutes <= 15) return 'quick';
    if (readyInMinutes <= 30) return 'medium';
    return 'long';
  }

  private mapDifficulty(readyInMinutes: number): 'easy' | 'medium' | 'hard' {
    if (readyInMinutes <= 20) return 'easy';
    if (readyInMinutes <= 45) return 'medium';
    return 'hard';
  }

  private getNutrientValue(nutrients: any[], name: string): number {
    const nutrient = nutrients.find(n => n.name === name);
    return nutrient ? nutrient.amount : 0;
  }

  private extractIngredients(analyzedInstructions: any[]): string[] {
    const ingredients: string[] = [];
    analyzedInstructions.forEach(instruction => {
      instruction.steps.forEach((step: any) => {
        step.ingredients.forEach((ingredient: any) => {
          if (!ingredients.includes(ingredient.name)) {
            ingredients.push(ingredient.name);
          }
        });
      });
    });
    return ingredients;
  }

  private extractInstructions(analyzedInstructions: any[]): string[] {
    const instructions: string[] = [];
    analyzedInstructions.forEach(instruction => {
      instruction.steps.forEach((step: any) => {
        instructions.push(step.step);
      });
    });
    return instructions;
  }

  private generateHealthBenefits(nutrition: any[]): string[] {
    const benefits: string[] = [];
    const protein = this.getNutrientValue(nutrition, 'Protein');
    const fiber = this.getNutrientValue(nutrition, 'Fiber');
    const calories = this.getNutrientValue(nutrition, 'Calories');

    if (protein > 15) benefits.push('High protein');
    if (fiber > 5) benefits.push('High fiber');
    if (calories < 300) benefits.push('Low calorie');

    return benefits;
  }
}

export const mealService = new MealService(); 