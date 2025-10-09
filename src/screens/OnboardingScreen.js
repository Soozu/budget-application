import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Animated,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: 1,
    title: 'Welcome SHS Student!',
    description: 'Track your allowance and expenses for Guinayangan Senior High School. Manage your budget for the 2025-2026 school year!',
    icon: '🎓',
    backgroundColor: '#4F46E5',
  },
  {
    id: 2,
    title: 'Track Your Allowance',
    description: 'Record your daily or weekly allowance. See how much money you have available to spend.',
    icon: '💵',
    backgroundColor: '#7C3AED',
  },
  {
    id: 3,
    title: 'Monitor Your Expenses',
    description: 'Log your spending on food, supplies, transportation, and more. Know where your money goes!',
    icon: '📝',
    backgroundColor: '#2563EB',
  },
  {
    id: 4,
    title: 'Save Money',
    description: 'Track your savings and reach your goals. Build better money habits while studying!',
    icon: '🎯',
    backgroundColor: '#059669',
  },
];

const budgetCategories = [
  { key: 'transportation', label: 'Transportation', icon: '🚌', example: 'Jeep/Trike fare' },
  { key: 'food', label: 'Food & Snacks', icon: '🍔', example: 'Meals, snacks' },
  { key: 'supplies', label: 'School Supplies', icon: '📚', example: 'Pens, paper' },
  { key: 'load', label: 'Load/Data', icon: '📱', example: 'Mobile load' },
  { key: 'projects', label: 'Projects', icon: '📝', example: 'Materials' },
];

export default function OnboardingScreen({ onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBudgetSetup, setShowBudgetSetup] = useState(false);
  const [frequency, setFrequency] = useState('daily');
  const [amount, setAmount] = useState('');
  const [budgets, setBudgets] = useState({});
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({
        x: width * nextIndex,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    } else {
      setShowBudgetSetup(true);
    }
  };

  const handleSaveBudget = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Required', 'Please enter your allowance amount');
      return;
    }

    try {
      // Calculate daily amount from daily allowance
      const dailyAmount = parseFloat(amount);
      const weeklyAmount = dailyAmount * 7;
      
      // Calculate total budgeted amount (daily)
      const totalBudgeted = Object.values(budgets).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
      
      // Check if total budget exceeds daily allowance
      if (totalBudgeted > dailyAmount) {
        Alert.alert(
          'Budget Exceeds Allowance',
          `Your planned daily spending (₱${totalBudgeted.toFixed(2)}) exceeds your daily allowance (₱${dailyAmount.toFixed(2)}).\n\nPlease adjust your budget to stay within your allowance.`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Save budget data
      const budgetData = {
        categories: budgets,
        weeklyAllowance: weeklyAmount.toString(),
        dailyAllowance: dailyAmount.toString(),
        frequency: 'daily',
        originalAmount: amount,
      };

      await AsyncStorage.setItem('budgets', JSON.stringify(budgetData));
      
      onComplete();
    } catch (error) {
      Alert.alert('Error', 'Failed to save budget');
    }
  };


  const updateBudget = (category, value) => {
    setBudgets({
      ...budgets,
      [category]: value,
    });
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / width);
        setCurrentIndex(index);
      },
    }
  );

  if (showBudgetSetup) {
    return (
      <View style={[styles.container, { backgroundColor: '#4F46E5' }]}>
        <StatusBar style="light" />
        
        <ScrollView style={styles.setupScrollView} contentContainerStyle={styles.setupContent}>
          <View style={styles.setupHeader}>
            <Text style={styles.setupIcon}>💰</Text>
            <Text style={styles.setupTitle}>Set Up Your Budget</Text>
            <Text style={styles.setupSubtitle}>
              Let's plan your spending for school
            </Text>
          </View>

          {/* Allowance Input */}
          <View style={styles.setupCard}>
            <Text style={styles.cardTitle}>How much allowance do you receive?</Text>
            
            <Text style={styles.frequencyLabel}>Daily Allowance</Text>

            <View style={styles.amountInput}>
              <Text style={styles.peso}>₱</Text>
              <TextInput
                style={styles.amountField}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                keyboardType="decimal-pad"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            
            {amount && (
              <Text style={styles.amountHint}>
                Weekly: ₱{(parseFloat(amount) * 7).toFixed(0)} per week
              </Text>
            )}
            
            {/* Budget Validation Warning */}
            {amount && Object.values(budgets).some(val => parseFloat(val) > 0) && (
              (() => {
                const dailyAmount = parseFloat(amount);
                const totalBudgeted = Object.values(budgets).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
                const isOverBudget = totalBudgeted > dailyAmount;
                
                return isOverBudget ? (
                  <View style={styles.warningBox}>
                    <Text style={styles.warningIcon}>⚠️</Text>
                    <Text style={styles.warningText}>
                      Daily budget exceeds daily allowance by ₱{(totalBudgeted - dailyAmount).toFixed(2)}
                    </Text>
                  </View>
                ) : null;
              })()
            )}
          </View>

          {/* Quick Budget Categories */}
          <View style={styles.setupCard}>
            <Text style={styles.cardTitle}>Plan Your Daily Spending (Optional)</Text>
            <Text style={styles.cardSubtitle}>You can adjust these later</Text>
            
            {budgetCategories.map((cat) => (
              <View key={cat.key} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <View style={styles.categoryText}>
                    <Text style={styles.categoryName}>{cat.label}</Text>
                    <Text style={styles.categoryExample}>{cat.example}</Text>
                  </View>
                </View>
                <View style={styles.categoryInputWrapper}>
                  <Text style={styles.pesoSmall}>₱</Text>
                  <TextInput
                    style={styles.categoryInput}
                    value={budgets[cat.key]}
                    onChangeText={(val) => updateBudget(cat.key, val)}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                {budgets[cat.key] && (
                  <Text style={styles.weeklyHint}>
                    Weekly: ₱{(parseFloat(budgets[cat.key]) * 7).toFixed(0)}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.setupActions}>
            <TouchableOpacity style={styles.skipSetupButton} onPress={onComplete}>
              <Text style={styles.skipSetupText}>Skip for now</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveBudget}>
              <Text style={styles.saveButtonText}>Save & Continue</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: slides[currentIndex].backgroundColor }]}>
      <StatusBar style="light" />
      
      {/* Skip Button */}
      {currentIndex < slides.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={styles.slide}>
            <Text style={styles.icon}>{slide.icon}</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.description}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {slides.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [10, 20, 10],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Next/Get Started Button */}
      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>
          {currentIndex === slides.length - 1 ? 'Continue' : 'Next'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  icon: {
    fontSize: 120,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  dot: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    marginHorizontal: 5,
  },
  button: {
    backgroundColor: '#fff',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 50,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  setupScrollView: {
    flex: 1,
  },
  setupContent: {
    padding: 20,
  },
  setupHeader: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  setupIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  setupTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  setupSubtitle: {
    fontSize: 16,
    color: '#E0E7FF',
    textAlign: 'center',
  },
  setupCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  frequencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
    marginBottom: 20,
    textAlign: 'center',
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  peso: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginRight: 10,
  },
  amountField: {
    flex: 1,
    fontSize: 32,
    fontWeight: 'bold',
    paddingVertical: 16,
    color: '#1F2937',
  },
  amountHint: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryText: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  categoryExample: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  categoryInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 100,
  },
  pesoSmall: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginRight: 4,
  },
  categoryInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    minWidth: 50,
  },
  weeklyHint: {
    fontSize: 11,
    color: '#4F46E5',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  setupActions: {
    marginTop: 10,
    marginBottom: 40,
    gap: 12,
  },
  skipSetupButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipSetupText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
});

