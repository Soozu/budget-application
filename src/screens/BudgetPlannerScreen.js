import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import GlobalBackground from '../components/GlobalBackground';

const budgetCategories = [
  { key: 'transportation', label: 'Transportation (Jeep/Trike)', icon: '🚌', example: 'Daily fare to school and back' },
  { key: 'food', label: 'Food & Snacks', icon: '🍔', example: 'Breakfast, lunch, merienda' },
  { key: 'supplies', label: 'School Supplies', icon: '📚', example: 'Notebooks, pens, paper' },
  { key: 'load', label: 'Load/Internet', icon: '📱', example: 'Mobile load, WiFi' },
  { key: 'projects', label: 'Projects', icon: '📝', example: 'Group projects, art materials' },
];

/**
 * BudgetPlannerScreen allows users to define and adjust their budget settings.
 * Features:
 * 1. Daily allowance setting
 * 2. Per-category budget allocation
 * 3. Weekly savings target
 * 4. Financial "Insights" based on budget vs spending comparison
 */
export default function BudgetPlannerScreen({ navigation }) {
  // --- STATE MANAGEMENT ---
  const [dailyAllowance, setDailyAllowance] = useState(''); // Current daily allowance from user
  const [savingsGoal, setSavingsGoal] = useState(''); // Target weekly savings
  const [budgets, setBudgets] = useState({
    transportation: '',
    food: '',
    supplies: '',
    load: '',
    projects: '',
    savings: '',
    entertainment: '',
  }); // Current budget allocations for each category

  const [transactions, setTransactions] = useState([]); // Loaded history to provide context
  const [financialInsights, setFinancialInsights] = useState([]); // Dynamic advice based on current settings
  const [isSaving, setIsSaving] = useState(false); // UI state for save action feedback
  const [spending, setSpending] = useState({}); // Current weekly spending per category
  const [currentSavings, setCurrentSavings] = useState(0); // Calculated savings for the week
  const [showEducation, setShowEducation] = useState(false); // Toggle for educational tips

  const fadeAnim = useState(new Animated.Value(0))[0]; // Screen transition animation

  /**
   * Refreshes local data whenever the screen is focused
   */
  useFocusEffect(
    React.useCallback(() => {
      loadData();

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, [])
  );

  /**
   * Recalculate insights whenever key data changes
   */
  useEffect(() => {
    if (transactions.length > 0 || Object.keys(budgets).length > 0) {
      generateFinancialInsights();
    }
  }, [budgets, spending, dailyAllowance, savingsGoal, transactions]);

  /**
   * Fetches data from storage and generates financial insights
   */
  const loadData = async () => {
    try {
      const [storedBudgets, storedTxns] = await Promise.all([
        AsyncStorage.getItem('budgets'),
        AsyncStorage.getItem('transactions'),
      ]);

      const txns = storedTxns ? JSON.parse(storedTxns) : [];
      setTransactions(txns);

      if (storedBudgets) {
        const parsed = JSON.parse(storedBudgets);
        setDailyAllowance(parsed.dailyAllowance || '');
        setSavingsGoal(parsed.savingsGoal || '');
        setBudgets({
          transportation: parsed.categories?.transportation || '',
          food: parsed.categories?.food || '',
          supplies: parsed.categories?.supplies || '',
          load: parsed.categories?.load || '',
          projects: parsed.categories?.projects || '',
          savings: parsed.categories?.savings || '',
          entertainment: parsed.categories?.entertainment || '',
        });
      }

      // Calculate weekly spending distribution
      calculateSpendingBreakdown(txns);
      calculateCurrentSavings(txns, storedBudgets ? JSON.parse(storedBudgets) : null);
    } catch (error) {
      console.error('Error loading budget data:', error);
    }
  };

  /**
   * Groups spending by category for the last 7 days
   */
  const calculateSpendingBreakdown = (txns) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const breakdown = {};
    txns
      .filter((t) => t.type === 'expense' && new Date(t.timestamp) >= weekAgo)
      .forEach((t) => {
        const categoryKey = getCategoryKey(t.category);
        breakdown[categoryKey] = (breakdown[categoryKey] || 0) + t.amount;
      });
    setSpending(breakdown);
  };

  /**
   * Calculates current weekly savings (Allowance - Spending)
   */
  const calculateCurrentSavings = (txns, budgetData) => {
    if (!budgetData) {
      setCurrentSavings(0);
      return;
    }

    const weeklyAllowance = (parseFloat(budgetData.dailyAllowance) || 0) * 7;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklySpent = txns
      .filter((t) => t.type === 'expense' && new Date(t.timestamp) >= weekAgo)
      .reduce((sum, t) => sum + t.amount, 0);

    setCurrentSavings(Math.max(0, weeklyAllowance - weeklySpent));
  };

  /**
   * Provides actionable financial advice based on spending patterns
   */
  const generateFinancialInsights = () => {
    const insights = [];
    const totalBudgeted = getTotalBudgeted();
    const totalSpent = Object.values(spending).reduce((sum, val) => sum + val, 0);
    const dailyAmount = parseFloat(dailyAllowance) || 0;
    const weeklyAmount = dailyAmount * 7;
    const potentialSavings = weeklyAmount - totalSpent;

    // 1. Overall Savings Potential
    if (weeklyAmount > 0) {
      const savingsPercentage = (potentialSavings / weeklyAmount) * 100;

      if (savingsPercentage > 20) {
        insights.push({
          type: 'excellent',
          icon: '🌟',
          title: 'Excellent Savings Potential!',
          message: `You can save ₱${potentialSavings.toFixed(2)} weekly (${savingsPercentage.toFixed(0)}% of allowance)`,
          tip: 'This is great! You\'re building strong money habits early.',
          action: 'Consider opening a savings account to earn interest!'
        });
      } else if (savingsPercentage < 0) {
        insights.push({
          type: 'danger',
          icon: '🚨',
          title: 'Overspending Alert!',
          message: `You're spending ₱${Math.abs(potentialSavings).toFixed(2)} more than your allowance!`,
          tip: 'This is unsustainable and will lead to debt.',
          action: 'Immediately reduce spending or find ways to earn extra money.'
        });
      }
    }

    // 2. Budget vs Spending Analysis
    Object.entries(spending).forEach(([category, catSpent]) => {
      const dailyBudget = parseFloat(budgets[category]) || 0;
      const weeklyBudget = dailyBudget * 7;
      if (dailyBudget > 0 && catSpent > weeklyBudget) {
        insights.push({
          type: 'warning',
          icon: '📊',
          title: `Over Budget: ${getCategoryLabel(category)}`,
          message: `Spent ₱${catSpent.toFixed(2)} vs weekly budget of ₱${weeklyBudget.toFixed(2)}`,
          tip: getCategorySavingTip(category),
          action: 'Try to cut back in this area next week.'
        });
      }
    });

    // 3. Goal Progress
    if (savingsGoal && parseFloat(savingsGoal) > 0) {
      const goal = parseFloat(savingsGoal);
      const progress = (currentSavings / goal) * 100;
      if (progress >= 100) {
        insights.push({
          type: 'excellent',
          icon: '🎉',
          title: 'Savings Goal Achieved!',
          message: `You've reached your week's goal of ₱${goal}!`,
          tip: 'Great discipline! Reward yourself with something small and free.',
          action: 'Keep it up next week!'
        });
      }
    }

    setFinancialInsights(insights);
  };

  /**
   * Persists the budget plan to storage
   */
  const saveBudgets = async () => {
    try {
      setIsSaving(true);
      const dailyAmount = parseFloat(dailyAllowance) || 0;
      const totalBudgeted = getTotalBudgeted();

      if (totalBudgeted > dailyAmount) {
        Alert.alert('Caution', 'Your daily budget exceeds your allowance. Are you sure?', [
          { text: 'Cancel', style: 'cancel', onPress: () => setIsSaving(false) },
          { text: 'Yes, Save', onPress: () => performSave(dailyAmount) }
        ]);
      } else {
        performSave(dailyAmount);
      }
    } catch (error) {
      console.error('Error in saveBudgets:', error);
      setIsSaving(false);
    }
  };

  const performSave = async (dailyAmount) => {
    try {
      const data = {
        categories: budgets,
        dailyAllowance: dailyAmount.toString(),
        weeklyAllowance: (dailyAmount * 7).toString(),
        savingsGoal: savingsGoal || '',
      };
      await AsyncStorage.setItem('budgets', JSON.stringify(data));
      Alert.alert('Success', 'Budget plan saved!');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save budget');
    } finally {
      setIsSaving(false);
    }
  };

  // --- HELPER FUNCTIONS ---

  const getCategoryKey = (categoryName) => {
    const map = {
      'Transportation': 'transportation',
      'Food & Snacks': 'food',
      'School Supplies': 'supplies',
      'Load/Data': 'load',
      'Projects': 'projects',
    };
    return map[categoryName] || 'other';
  };

  const getCategoryLabel = (key) => {
    const item = budgetCategories.find(c => c.key === key);
    return item ? item.label : 'Other';
  };

  const getCategorySavingTip = (key) => {
    const tips = {
      transportation: 'Walk short distances or carpool with friends.',
      food: 'Try bringing home-cooked meals (baon) more often.',
      supplies: 'Buy in bulk or reuse existing materials.',
      load: 'Use free WiFi at school or limit non-essential data used.',
      projects: 'Coordinate with members to share material costs.'
    };
    return tips[key] || 'Look for cheaper alternatives.';
  };

  const getTotalBudgeted = () => {
    return Object.values(budgets).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  };

  const updateBudget = (category, value) => {
    setBudgets({ ...budgets, [category]: value });
  };

  const getStatus = (category) => {
    const dailyBudget = parseFloat(budgets[category]) || 0;
    const weeklyBudget = dailyBudget * 7;
    const weeklySpent = spending[category] || 0;

    if (dailyBudget === 0) return null;
    const percent = (weeklySpent / weeklyBudget) * 100;

    if (percent >= 100) return { color: '#EF4444', text: 'Over Budget!', icon: '⚠️' };
    if (percent >= 80) return { color: '#F59E0B', text: 'Almost Over', icon: '⚡' };
    return { color: '#10B981', text: 'Good', icon: '✓' };
  };

  const calculateEmergencyFund = () => (parseFloat(dailyAllowance) || 0) * 30 * 3;
  const calculateCollegeFund = () => (parseFloat(dailyAllowance) || 0) * 365 * 0.2 * 4;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <GlobalBackground />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Budget Planner</Text>
          <Text style={styles.headerSubtitle}>Plan your spending, secure your future</Text>
        </View>

        {/* Daily Allowance Input */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>💵</Text>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Daily Allowance</Text>
                <Text style={styles.cardSubtitle}>Total money you get per day</Text>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>₱</Text>
              <TextInput
                style={styles.input}
                value={dailyAllowance}
                onChangeText={setDailyAllowance}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        {/* Savings Goal Progress */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎯 Savings Target</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>₱</Text>
              <TextInput
                style={styles.input}
                value={savingsGoal}
                onChangeText={setSavingsGoal}
                placeholder="Weekly Goal"
                keyboardType="decimal-pad"
              />
            </View>
            {!!savingsGoal && (
              <View style={styles.savingsProgressCard}>
                <Text style={styles.progressText}>{((currentSavings / parseFloat(savingsGoal)) * 100).toFixed(0)}% reached</Text>
                <View style={styles.progressBar}><View style={[styles.progressBarFill, { width: `${Math.min(100, (currentSavings / parseFloat(savingsGoal)) * 100)}%`, backgroundColor: '#10B981' }]} /></View>
              </View>
            )}
          </View>
        </View>

        {/* Category Budgeting */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Daily Category Limits</Text>
          {budgetCategories.map((cat) => {
            const status = getStatus(cat.key);
            return (
              <View key={cat.key} style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryLabel}>{cat.label}</Text>
                    <Text style={styles.categoryExample}>{cat.example}</Text>
                  </View>
                </View>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencySymbol}>₱</Text>
                  <TextInput
                    style={styles.budgetField}
                    value={budgets[cat.key]}
                    onChangeText={(val) => updateBudget(cat.key, val)}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                </View>
                {status && (
                  <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                    <Text style={styles.statusText}>{status.icon} {status.text}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Insights */}
        {financialInsights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 Smart Insights</Text>
            {financialInsights.map((insight, idx) => (
              <View key={idx} style={[styles.insightCard, styles[`insight${insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}`]]}>
                <Text style={styles.insightTitle}>{insight.icon} {insight.title}</Text>
                <Text style={styles.insightMessage}>{insight.message}</Text>
                <View style={styles.tipBox}><Text style={styles.tipText}>💡 Tip: {insight.tip}</Text></View>
              </View>
            ))}
          </View>
        )}

        {/* Education/Learn Toggle */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.educationButton} onPress={() => setShowEducation(!showEducation)}>
            <Text style={styles.educationButtonText}>{showEducation ? 'Hide' : 'Learn'} Financial Tips</Text>
          </TouchableOpacity>
          {showEducation && (
            <View style={styles.educationCard}>
              <Text style={styles.educationTitle}>Why Save?</Text>
              <Text style={styles.educationText}>Building an emergency fund of ₱{calculateEmergencyFund().toFixed(0)} provides a safety net. Saving 20% can lead to ₱{calculateCollegeFund().toFixed(0)} by graduation!</Text>
            </View>
          )}
        </View>

        {/* Save Button */}
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={saveBudgets}>
            <Text style={styles.saveButtonText}>Save Budget Plan</Text>
            <Text style={styles.saveButtonSubtext}>Persistence is key to financial success</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: { paddingTop: 60, paddingHorizontal: 20, marginBottom: 20 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#1F2937' },
  headerSubtitle: { fontSize: 16, color: '#6B7280' },
  section: { marginHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 16 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 20, elevation: 4, shadowOpacity: 0.1, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardIcon: { fontSize: 30, marginRight: 12 },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  cardSubtitle: { fontSize: 14, color: '#6B7280' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 8 },
  currencySymbol: { fontSize: 24, fontWeight: 'bold', color: '#4F46E5', marginRight: 8 },
  input: { flex: 1, fontSize: 24, fontWeight: 'bold', color: '#1F2937', paddingVertical: 12 },
  categoryCard: { backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#F3F4F6' },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  categoryIcon: { fontSize: 24, marginRight: 12 },
  categoryInfo: { flex: 1 },
  categoryLabel: { fontSize: 16, fontWeight: '600' },
  categoryExample: { fontSize: 12, color: '#9CA3AF' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  budgetField: { flex: 1, fontSize: 18, fontWeight: 'bold', paddingVertical: 10 },
  statusBadge: { marginTop: 8, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  insightCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 3 },
  insightExcellent: { borderLeftWidth: 5, borderLeftColor: '#10B981' },
  insightWarning: { borderLeftWidth: 5, borderLeftColor: '#F59E0B' },
  insightDanger: { borderLeftWidth: 5, borderLeftColor: '#EF4444' },
  insightTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  insightMessage: { fontSize: 14, color: '#4B5563', marginBottom: 8 },
  tipBox: { backgroundColor: '#EEF2FF', padding: 8, borderRadius: 8 },
  tipText: { fontSize: 12, color: '#4F46E5', fontWeight: '500' },
  educationButton: { backgroundColor: '#4F46E5', padding: 12, borderRadius: 12, alignItems: 'center' },
  educationButtonText: { color: '#fff', fontWeight: 'bold' },
  educationCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginTop: 12, borderWidth: 1, borderColor: '#4F46E5' },
  educationTitle: { fontSize: 16, fontWeight: 'bold', color: '#4F46E5', marginBottom: 4 },
  educationText: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  saveButtonContainer: { marginTop: 12 },
  saveButton: { backgroundColor: '#4F46E5', padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#4F46E5', shadowOpacity: 0.3, shadowRadius: 10 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  saveButtonSubtext: { color: '#E0E7FF', fontSize: 11, marginTop: 2 },
  savingsProgressCard: { marginTop: 12 },
  progressText: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  progressBar: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
});
