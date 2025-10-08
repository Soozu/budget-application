import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

const budgetCategories = [
  { key: 'transportation', label: 'Transportation (Jeep/Trike)', icon: '🚌', example: 'Daily fare to school and back' },
  { key: 'food', label: 'Food & Snacks', icon: '🍔', example: 'Breakfast, lunch, merienda' },
  { key: 'supplies', label: 'School Supplies', icon: '📚', example: 'Notebooks, pens, paper' },
  { key: 'load', label: 'Load/Internet', icon: '📱', example: 'Mobile load, WiFi' },
  { key: 'projects', label: 'Projects', icon: '📝', example: 'Group projects, art materials' },
  { key: 'savings', label: 'Savings Goal', icon: '💰', example: 'Money to save weekly' },
];

export default function BudgetPlannerScreen({ navigation }) {
  const [budgets, setBudgets] = useState({});
  const [spending, setSpending] = useState({});
  const [weeklyAllowance, setWeeklyAllowance] = useState('');

  useEffect(() => {
    loadBudgets();
    loadSpending();
  }, []);

  const loadBudgets = async () => {
    try {
      const stored = await AsyncStorage.getItem('budgets');
      if (stored) {
        const parsed = JSON.parse(stored);
        setBudgets(parsed.categories || {});
        setWeeklyAllowance(parsed.weeklyAllowance || '');
      }
    } catch (error) {
      console.error('Error loading budgets:', error);
    }
  };

  const loadSpending = async () => {
    try {
      const stored = await AsyncStorage.getItem('transactions');
      if (stored) {
        const transactions = JSON.parse(stored);
        
        // Calculate spending for this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const weeklySpending = {};
        transactions
          .filter((t) => t.type === 'expense' && new Date(t.timestamp) >= weekAgo)
          .forEach((t) => {
            const category = getCategoryKey(t.category);
            weeklySpending[category] = (weeklySpending[category] || 0) + t.amount;
          });
        
        setSpending(weeklySpending);
      }
    } catch (error) {
      console.error('Error loading spending:', error);
    }
  };

  const getCategoryKey = (category) => {
    const mapping = {
      'Transportation': 'transportation',
      'Food & Snacks': 'food',
      'School Supplies': 'supplies',
      'Load/Data': 'load',
      'Projects': 'projects',
      'Savings': 'savings',
    };
    return mapping[category] || 'other';
  };

  const saveBudgets = async () => {
    try {
      const data = {
        categories: budgets,
        weeklyAllowance,
      };
      await AsyncStorage.setItem('budgets', JSON.stringify(data));
      Alert.alert('Success', 'Budget plan saved!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save budget plan');
    }
  };

  const updateBudget = (category, value) => {
    setBudgets({
      ...budgets,
      [category]: value,
    });
  };

  const getStatus = (category) => {
    const budget = parseFloat(budgets[category]) || 0;
    const spent = spending[category] || 0;
    
    if (budget === 0) return null;
    
    const percentage = (spent / budget) * 100;
    
    if (percentage >= 100) return { color: '#EF4444', text: 'Over Budget!', icon: '⚠️' };
    if (percentage >= 80) return { color: '#F59E0B', text: 'Almost Over', icon: '⚡' };
    if (percentage >= 50) return { color: '#3B82F6', text: 'On Track', icon: '✓' };
    return { color: '#10B981', text: 'Good', icon: '✓' };
  };

  const getTotalBudgeted = () => {
    return Object.values(budgets).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  };

  const getTotalSpent = () => {
    return Object.values(spending).reduce((sum, val) => sum + val, 0);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView style={styles.scrollView}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>Weekly Budget Planner</Text>
          <Text style={styles.headerSubtitle}>
            Plan how much you'll spend on each category weekly
          </Text>
        </View>

        {/* Weekly Allowance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💵 Weekly Allowance</Text>
          <View style={styles.allowanceCard}>
            <Text style={styles.allowanceLabel}>How much do you receive per week?</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>₱</Text>
              <TextInput
                style={styles.input}
                value={weeklyAllowance}
                onChangeText={setWeeklyAllowance}
                placeholder="0"
                keyboardType="decimal-pad"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        </View>

        {/* Budget Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Plan Your Spending</Text>
          
          {budgetCategories.map((cat) => {
            const status = getStatus(cat.key);
            const spent = spending[cat.key] || 0;
            const budget = parseFloat(budgets[cat.key]) || 0;
            const remaining = budget - spent;
            
            return (
              <View key={cat.key} style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryLabel}>{cat.label}</Text>
                    <Text style={styles.categoryExample}>{cat.example}</Text>
                  </View>
                </View>

                <View style={styles.budgetInputContainer}>
                  <View style={styles.budgetInput}>
                    <Text style={styles.inputLabel}>Weekly Budget</Text>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.currencySymbol}>₱</Text>
                      <TextInput
                        style={styles.budgetField}
                        value={budgets[cat.key]}
                        onChangeText={(val) => updateBudget(cat.key, val)}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>

                  {budget > 0 && (
                    <View style={styles.spendingInfo}>
                      <View style={styles.spendingRow}>
                        <Text style={styles.spendingLabel}>Spent this week:</Text>
                        <Text style={styles.spendingValue}>₱{spent.toFixed(2)}</Text>
                      </View>
                      <View style={styles.spendingRow}>
                        <Text style={styles.spendingLabel}>Remaining:</Text>
                        <Text style={[
                          styles.spendingValue,
                          { color: remaining >= 0 ? '#10B981' : '#EF4444' }
                        ]}>
                          ₱{remaining.toFixed(2)}
                        </Text>
                      </View>
                      {status && (
                        <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                          <Text style={styles.statusText}>{status.icon} {status.text}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Summary</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Budgeted:</Text>
              <Text style={styles.summaryValue}>₱{getTotalBudgeted().toFixed(2)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Spent:</Text>
              <Text style={styles.summaryValue}>₱{getTotalSpent().toFixed(2)}</Text>
            </View>
            
            {weeklyAllowance && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Unallocated:</Text>
                <Text style={[
                  styles.summaryValue,
                  { color: parseFloat(weeklyAllowance) - getTotalBudgeted() >= 0 ? '#10B981' : '#EF4444' }
                ]}>
                  ₱{(parseFloat(weeklyAllowance) - getTotalBudgeted()).toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Daily Breakdown */}
        {weeklyAllowance && getTotalBudgeted() > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Daily Breakdown</Text>
            <View style={styles.dailyCard}>
              <View style={styles.dailyRow}>
                <Text style={styles.dailyLabel}>Daily Budget:</Text>
                <Text style={styles.dailyValue}>
                  ₱{(getTotalBudgeted() / 7).toFixed(2)}/day
                </Text>
              </View>
              <Text style={styles.dailyHint}>
                This is how much you can spend per day to stay within budget
              </Text>
            </View>

            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Example Weekly Schedule:</Text>
              
              <View style={styles.dayExample}>
                <Text style={styles.dayLabel}>Monday - Friday (School Days)</Text>
                <Text style={styles.dayDetail}>
                  • Jeep to school: ₱{((budgets.transportation || 0) / 5).toFixed(0)}/day
                </Text>
                <Text style={styles.dayDetail}>
                  • Food/Snacks: ₱{((budgets.food || 0) / 5).toFixed(0)}/day
                </Text>
                <Text style={styles.dayDetail}>
                  • Load/Data: ₱{((budgets.load || 0) / 7).toFixed(0)}/day
                </Text>
              </View>

              <View style={styles.dayExample}>
                <Text style={styles.dayLabel}>Weekend</Text>
                <Text style={styles.dayDetail}>• Save or use for entertainment</Text>
                <Text style={styles.dayDetail}>• Plan for projects if needed</Text>
              </View>
            </View>
          </View>
        )}

        {/* Smart Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Smart Budget Recommendations</Text>
          
          <View style={styles.recommendCard}>
            <Text style={styles.recommendIcon}>💡</Text>
            <View style={styles.recommendContent}>
              <Text style={styles.recommendTitle}>Transportation Tip</Text>
              <Text style={styles.recommendText}>
                Jeep fare ₱20/ride x 2 rides/day x 5 days = ₱200/week. 
                Walking once a day saves ₱100!
              </Text>
            </View>
          </View>

          <View style={styles.recommendCard}>
            <Text style={styles.recommendIcon}>🍱</Text>
            <View style={styles.recommendContent}>
              <Text style={styles.recommendTitle}>Food Savings</Text>
              <Text style={styles.recommendText}>
                Lunch at cafeteria: ₱60/day = ₱300/week. 
                Bringing baon 3x: ₱120/week (Save ₱180!)
              </Text>
            </View>
          </View>

          <View style={styles.recommendCard}>
            <Text style={styles.recommendIcon}>📱</Text>
            <View style={styles.recommendContent}>
              <Text style={styles.recommendTitle}>Load Strategy</Text>
              <Text style={styles.recommendText}>
                Use school WiFi for research. Only buy load for important calls/messages.
                Target: ₱50/week instead of ₱100
              </Text>
            </View>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Money-Saving Tips</Text>
          <View style={styles.tipsCard}>
            <Text style={styles.tipItem}>• Walk to school when possible to save on fare</Text>
            <Text style={styles.tipItem}>• Bring baon instead of buying food</Text>
            <Text style={styles.tipItem}>• Share rides with classmates to split costs</Text>
            <Text style={styles.tipItem}>• Buy supplies in bulk with friends</Text>
            <Text style={styles.tipItem}>• Use free WiFi at school instead of mobile data</Text>
            <Text style={styles.tipItem}>• Set aside savings first before spending</Text>
            <Text style={styles.tipItem}>• Avoid buying snacks daily - bring from home</Text>
            <Text style={styles.tipItem}>• Join group orders for better prices</Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={saveBudgets}>
          <Text style={styles.saveButtonText}>Save Budget Plan</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  headerCard: {
    backgroundColor: '#4F46E5',
    padding: 24,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  allowanceCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  allowanceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    paddingVertical: 12,
    color: '#1F2937',
  },
  categoryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  categoryExample: {
    fontSize: 12,
    color: '#6B7280',
  },
  budgetInputContainer: {
    gap: 12,
  },
  budgetInput: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  budgetField: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 10,
    color: '#1F2937',
  },
  spendingInfo: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  spendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  spendingLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  spendingValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  tipsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tipItem: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 10,
    lineHeight: 20,
  },
  dailyCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  dailyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dailyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  dailyValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  dailyHint: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  breakdownCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  dayExample: {
    marginBottom: 16,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
    marginBottom: 6,
  },
  dayDetail: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 3,
    paddingLeft: 8,
  },
  recommendCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  recommendIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  recommendContent: {
    flex: 1,
  },
  recommendTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
  },
  recommendText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
