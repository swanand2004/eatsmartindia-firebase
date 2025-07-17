import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMeals } from '../../context/MealContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';

const screenWidth = Dimensions.get('window').width;
const chartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
  barPercentage: 0.6,
  decimalPlaces: 0,
  style: { borderRadius: 16 },
};

function getWeekDates() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getPastNDates(n: number) {
  const arr = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    arr.push(d);
  }
  return arr;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function AnalyticsScreen() {
  const { plan } = useMeals();
  const insets = useSafeAreaInsets();
  // --- Overview Section ---
  const weekDates = getWeekDates();
  let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0, totalMeals = 0, completedMeals = 0;
  const weekCompletion = weekDates.map((date, idx) => {
    const dateStr = date.toISOString().split('T')[0];
    const day = plan?.days.find((d) => d.date === dateStr);
    if (!day) return { completed: 0, total: 0, calories: 0, protein: 0, carbs: 0, fat: 0 };
    const completed = day.meals.filter((m) => m.completed).length;
    const total = day.meals.length;
    const calories = day.meals.reduce((sum, m) => sum + (m.completed ? m.calories || 0 : 0), 0);
    const protein = day.meals.reduce((sum, m) => sum + (m.completed ? m.protein || 0 : 0), 0);
    const carbs = day.meals.reduce((sum, m) => sum + (m.completed ? m.carbs || 0 : 0), 0);
    const fat = day.meals.reduce((sum, m) => sum + (m.completed ? m.fat || 0 : 0), 0);
    totalCalories += calories;
    totalProtein += protein;
    totalCarbs += carbs;
    totalFat += fat;
    totalMeals += total;
    completedMeals += completed;
    return { completed, total, calories, protein, carbs, fat };
  });
  // Best/worst
  let max = -1, min = 1000, maxIdx = 0, minIdx = 0;
  weekCompletion.forEach((d, i) => {
    if (d.completed > max) { max = d.completed; maxIdx = i; }
    if (d.completed < min) { min = d.completed; minIdx = i; }
  });
  // Water analytics (from AsyncStorage)
  const [waterData, setWaterData] = useState<number[]>([0,0,0,0,0,0,0]);
  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const arr = await Promise.all(weekDates.map(async (date) => {
          const key = `@water_${date.toISOString().split('T')[0]}_`;
          const allKeys = await AsyncStorage.getAllKeys();
          const waterKey = allKeys.find(k => k.startsWith(key));
          if (!waterKey) return 0;
          const val = await AsyncStorage.getItem(waterKey);
          return val ? parseInt(val) : 0;
        }));
        setWaterData(arr);
      })();
    }, [plan, weekDates])
  );
  // Completion %
  const completionPercent = totalMeals ? Math.round((completedMeals / totalMeals) * 100) : 0;
  // Progress ring data
  const waterPercent = Math.min(100, (waterData.reduce((a,b)=>a+b,0) / (8*7)) * 100);
  const mealPercent = Math.min(100, (completedMeals / (totalMeals || 1)) * 100);
  const streakPercent = Math.min(100, (weekCompletion.filter(d => d.completed === d.total && d.total > 0).length / 7) * 100);
  // Chart data
  const chartData = {
    labels: weekDates.map(d => d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)),
    datasets: [
      { data: weekCompletion.map(d => d.completed), color: () => '#6C63FF' },
    ],
  };
  // Macro nutrients breakdown (all real data)
  const macroData = [
    { name: 'Carbs', grams: totalCarbs, color: '#FFD700', legendFontColor: '#333', legendFontSize: 14 },
    { name: 'Protein', grams: totalProtein, color: '#4ECDC4', legendFontColor: '#333', legendFontSize: 14 },
    { name: 'Fat', grams: totalFat, color: '#FF6F61', legendFontColor: '#333', legendFontSize: 14 },
  ];
  const waterLineData = {
    labels: weekDates.map(d => d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)),
    datasets: [
      { data: waterData, color: () => '#4ECDC4', strokeWidth: 2 }
    ]
  };
  // Streaks
  const currentStreak = weekCompletion.reduce((streak, d) => d.completed === d.total && d.total > 0 ? streak + 1 : 0, 0);
  const longestStreak = (() => {
    let max = 0, curr = 0;
    for (let d of weekCompletion) {
      if (d.completed === d.total && d.total > 0) curr++;
      else { max = Math.max(max, curr); curr = 0; }
    }
    return Math.max(max, curr);
  })();

  // --- Meals Analytics Section ---
  // Gather meal data
  let totalMeals2 = 0, completedMeals2 = 0, missedMeals = 0;
  const mealTypeCounts: Record<string, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  const mealCompletionByDay = weekDates.map((date) => {
    const dateStr = date.toISOString().split('T')[0];
    const day = plan?.days.find((d) => d.date === dateStr);
    if (!day) return 0;
    day.meals.forEach(m => { mealTypeCounts[m.type] = (mealTypeCounts[m.type] || 0) + 1; });
    totalMeals2 += day.meals.length;
    completedMeals2 += day.meals.filter(m => m.completed).length;
    missedMeals += day.meals.filter(m => !m.completed).length;
    return day.meals.filter(m => m.completed).length;
  });
  // Pie chart data
  const pieData = Object.entries(mealTypeCounts).map(([type, count], i) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    population: count,
    color: ['#6C63FF', '#FF6B6B', '#4ECDC4', '#FFD700'][i],
    legendFontColor: '#333',
    legendFontSize: 13,
  })).filter(d => d.population > 0);
  // Favorite meals (most completed)
  const mealCounts: Record<string, { name: string, count: number }> = {};
  plan?.days.forEach(day => {
    day.meals.forEach(m => {
      if (!mealCounts[m.id]) mealCounts[m.id] = { name: m.name, count: 0 };
      if (m.completed) mealCounts[m.id].count++;
    });
  });
  const favoriteMeals = Object.values(mealCounts).sort((a, b) => b.count - a.count).slice(0, 3);
  // Missed meals (most missed)
  const missedMealCounts: Record<string, { name: string, count: number }> = {};
  plan?.days.forEach(day => {
    day.meals.forEach(m => {
      if (!missedMealCounts[m.id]) missedMealCounts[m.id] = { name: m.name, count: 0 };
      if (!m.completed) missedMealCounts[m.id].count++;
    });
  });
  const mostMissedMeals = Object.values(missedMealCounts).sort((a, b) => b.count - a.count).slice(0, 3);

  // --- Water Analytics Section ---
  const totalWater = waterData.reduce((a, b) => a + b, 0);
  const avgWater = Math.round(totalWater / 7);
  let goalStreak = 0, bestDayIdxWater = 0;
  // Calculate goal streak (consecutive days with 8+ glasses)
  let streak = 0, maxStreak = 0;
  waterData.forEach(val => {
    if (val >= 8) { streak++; if (streak > maxStreak) maxStreak = streak; }
    else streak = 0;
  });
  goalStreak = maxStreak;
  // Best hydration day
  let maxWater = -1, idxWater = 0;
  waterData.forEach((v, i) => { if (v > maxWater) { maxWater = v; idxWater = i; } });
  bestDayIdxWater = idxWater;

  // --- Streaks Analytics Section ---
  const past30Dates = getPastNDates(30);
  let currentStreak30 = 0, longestStreak30 = 0, streak30 = 0;
  const streakData = past30Dates.map((date) => {
    const dateStr = date.toISOString().split('T')[0];
    const day = plan?.days.find((d) => d.date === dateStr);
    const completed = day && day.meals.length > 0 && day.meals.every(m => m.completed);
    if (completed) {
      streak30++;
      if (streak30 > longestStreak30) longestStreak30 = streak30;
    } else {
      streak30 = 0;
    }
    return completed ? 1 : 0;
  });
  currentStreak30 = streak30;
  // Bar chart: streak length per week (last 8 weeks)
  const weekStreaks: number[] = [];
  for (let i = 0; i < 8; i++) {
    let weekStreak = 0;
    for (let j = 0; j < 7; j++) {
      const idx = i * 7 + j;
      if (idx < streakData.length && streakData[idx]) weekStreak++;
    }
    weekStreaks.push(weekStreak);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 4 }]}> 
        {/* --- Overview Section --- */}
        <Text style={styles.sectionTitle}>Macro Nutrients Report (Weekly)</Text>
        <View style={styles.card}>
          <PieChart
            data={macroData.map(m => ({
              name: m.name,
              population: m.grams,
              color: m.color,
              legendFontColor: m.legendFontColor,
              legendFontSize: m.legendFontSize
            }))}
            width={screenWidth - 60}
            height={160}
            chartConfig={chartConfig}
            accessor={'population'}
            backgroundColor={'transparent'}
            paddingLeft={'10'}
            absolute
            style={{ marginBottom: 8 }}
          />
          <View style={styles.summaryRow}>
            {macroData.map(m => (
              <View style={styles.summaryItem} key={m.name}>
                <Text style={[styles.summaryValue, { color: m.color }]}>{m.grams}</Text>
                <Text style={styles.summaryLabel}>{m.name} (g)</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.sectionTitle}>Water Intake Report (Weekly)</Text>
        <View style={styles.card}>
          <LineChart
            data={waterLineData}
            width={screenWidth - 60}
            height={160}
            chartConfig={{ ...chartConfig, color: (o) => '#4ECDC4' }}
            bezier
            style={{ borderRadius: 12, marginTop: 12 }}
            fromZero
            withDots
            withShadow
            withInnerLines
            withOuterLines
          />
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="water" size={24} color="#4ECDC4" />
              <Text style={styles.summaryValue}>{waterData.reduce((a,b)=>a+b,0)}</Text>
              <Text style={styles.summaryLabel}>Total Glasses</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="star" size={24} color="#FFD700" />
              <Text style={styles.summaryValue}>{Math.max(...waterData)}</Text>
              <Text style={styles.summaryLabel}>Best Day</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="calendar" size={24} color="#6C63FF" />
              <Text style={styles.summaryValue}>{(waterData.reduce((a,b)=>a+b,0)/7).toFixed(1)}</Text>
              <Text style={styles.summaryLabel}>Avg/Day</Text>
            </View>
          </View>
        </View>
        <Text style={styles.sectionTitle}>Meals Analytics (Weekly)</Text>
        <View style={styles.card}>
          <BarChart
            data={chartData}
            width={screenWidth - 60}
            height={180}
            chartConfig={chartConfig}
            style={{ borderRadius: 12, marginTop: 12 }}
            fromZero
            showValuesOnTopOfBars
            yAxisLabel=""
            yAxisSuffix=""
            withHorizontalLabels
            withVerticalLabels
          />
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="fast-food" size={24} color="#6C63FF" />
              <Text style={styles.summaryValue}>{completedMeals}</Text>
              <Text style={styles.summaryLabel}>Meals Completed</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="calendar" size={24} color="#FFB75E" />
              <Text style={styles.summaryValue}>{completionPercent}%</Text>
              <Text style={styles.summaryLabel}>Completion Rate</Text>
            </View>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Meal Type Breakdown</Text>
          <PieChart
            data={pieData}
            width={screenWidth - 60}
            height={160}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
        <Text style={styles.sectionTitle}>Water Analytics (Weekly)</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Summary (This Week)</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}><Ionicons name="water" size={24} color="#4ECDC4" /><Text style={styles.summaryValue}>{totalWater}</Text><Text style={styles.summaryLabel}>Total Glasses</Text></View>
            <View style={styles.summaryItem}><Ionicons name="stats-chart" size={24} color="#6C63FF" /><Text style={styles.summaryValue}>{avgWater}</Text><Text style={styles.summaryLabel}>Avg/Day</Text></View>
            <View style={styles.summaryItem}><Ionicons name="trophy" size={24} color="#FFD700" /><Text style={styles.summaryValue}>{goalStreak}</Text><Text style={styles.summaryLabel}>Goal Streak</Text></View>
          </View>
        </View>
        <Text style={styles.sectionTitle}>Streaks & Progress (Weekly)</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}><Ionicons name="flame" size={24} color="#FF6B6B" /><Text style={styles.summaryValue}>{currentStreak30}</Text><Text style={styles.summaryLabel}>Current Streak</Text></View>
            <View style={styles.summaryItem}><Ionicons name="trophy" size={24} color="#FFD700" /><Text style={styles.summaryValue}>{longestStreak30}</Text><Text style={styles.summaryLabel}>Longest Streak</Text></View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#6C63FF', marginBottom: 10, marginTop: 24 },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#6C63FF', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 4 },
  summaryLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  detailText: { fontSize: 16, color: '#333', marginTop: 8 },
  detailValue: { fontSize: 16, color: '#4ECDC4', fontWeight: 'bold', marginTop: 2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  heatmapRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  heatmapCell: { width: 12, height: 12, borderRadius: 2, margin: 2 },
}); 