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
import { useFocusEffect } from '@react-navigation/native';

const budgetCategories = [
  { key: 'transportation', label: 'Transportation (Jeep/Trike)', icon: '🚌', example: 'Daily fare to school and back' },
  { key: 'food', label: 'Food & Snacks', icon: '🍔', example: 'Breakfast, lunch, merienda' },
  { key: 'supplies', label: 'School Supplies', icon: '📚', example: 'Notebooks, pens, paper' },
  { key: 'load', label: 'Load/Internet', icon: '📱', example: 'Mobile load, WiFi' },
  { key: 'projects', label: 'Projects', icon: '📝', example: 'Group projects, art materials' },
];

export default function BudgetPlannerScreen() {
  const [budgets, setBudgets] = useState({});
  const [spending, setSpending] = useState({});
  const [weeklyAllowance, setWeeklyAllowance] = useState('');
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [financialInsights, setFinancialInsights] = useState([]);
  const [showEducation, setShowEducation] = useState(false);

  useEffect(() => {
    loadBudgets();
    loadSpending();
  }, []);

  useEffect(() => {
    generateFinancialInsights();
  }, [budgets, spending, weeklyAllowance]);

  // Refresh data when screen comes into focus (after adding transactions)
  useFocusEffect(
    React.useCallback(() => {
      loadSpending();
    }, [])
  );

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
      const dailyAmount = parseFloat(weeklyAllowance) || 0;
      
      const data = {
        categories: budgets,
        weeklyAllowance: (dailyAmount * 7).toString(), // Store as weekly for compatibility
        dailyAllowance: dailyAmount.toString(),
      };
      await AsyncStorage.setItem('budgets', JSON.stringify(data));
      
      Alert.alert('Success', 'Budget plan saved!');
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

  const generateFinancialInsights = () => {
    const insights = [];
    const totalBudgeted = getTotalBudgeted();
    const totalSpent = getTotalSpent();
    const dailyAmount = parseFloat(weeklyAllowance) || 0;
    const weeklyAmount = dailyAmount * 7;
    const potentialSavings = weeklyAmount - totalSpent;
    
    // Savings potential analysis
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
      } else if (savingsPercentage > 10) {
        insights.push({
          type: 'good',
          icon: '👍',
          title: 'Good Savings Potential',
          message: `You can save ₱${potentialSavings.toFixed(2)} weekly (${savingsPercentage.toFixed(0)}% of allowance)`,
          tip: 'Try to increase this to 20% for better financial security.',
          action: 'Look for ways to reduce unnecessary expenses.'
        });
      } else if (savingsPercentage > 0) {
        insights.push({
          type: 'warning',
          icon: '⚠️',
          title: 'Low Savings Rate',
          message: `You can only save ₱${potentialSavings.toFixed(2)} weekly (${savingsPercentage.toFixed(0)}% of allowance)`,
          tip: 'Aim to save at least 10-20% of your allowance.',
          action: 'Review your spending and cut back on non-essentials.'
        });
      } else {
        insights.push({
          type: 'danger',
          icon: '🚨',
          title: 'Overspending Alert!',
          message: `You\'re spending ₱${Math.abs(potentialSavings).toFixed(2)} more than your allowance!`,
          tip: 'This is unsustainable and will lead to debt.',
          action: 'Immediately reduce spending or find ways to earn extra money.'
        });
      }
    }

    // Category analysis
    Object.entries(spending).forEach(([category, amount]) => {
      const budgetAmount = parseFloat(budgets[category]) || 0;
      if (budgetAmount > 0) {
        const percentage = (amount / budgetAmount) * 100;
        if (percentage > 100) {
          insights.push({
            type: 'warning',
            icon: '📊',
            title: `Over Budget: ${getCategoryLabel(category)}`,
            message: `Spent ₱${amount.toFixed(2)} vs budgeted ₱${budgetAmount.toFixed(2)}`,
            tip: getCategorySavingTip(category),
            action: 'Adjust your budget or reduce spending in this category.'
          });
        }
      }
    });

    // Future planning insights
    if (weeklyAmount > 0 && potentialSavings > 0) {
      const monthlySavings = potentialSavings * 4;
      const yearlySavings = monthlySavings * 12;
      
      insights.push({
        type: 'info',
        icon: '🎯',
        title: 'Future Planning',
        message: `If you save consistently: ₱${monthlySavings.toFixed(0)}/month, ₱${yearlySavings.toFixed(0)}/year`,
        tip: 'This money can help with college, emergencies, or future goals.',
        action: 'Set specific savings goals like a laptop, college fund, or emergency fund.'
      });
    }

    // Weekly savings insight
    const leftoverAmount = dailyAmount - totalBudgeted;
    if (leftoverAmount > 0) {
      insights.push({
        type: 'excellent',
        icon: '💰',
        title: 'Weekly Savings Potential!',
        message: `You can save ₱${(leftoverAmount * 7).toFixed(2)} per week if you stick to your budget`,
        tip: 'Great job! You\'re budgeting wisely and building savings potential.',
        action: 'Track your spending to see how much you actually save each week!'
      });
    }

    setFinancialInsights(insights);
  };

  const getCategorySavingTip = (category) => {
    const tips = {
      'transportation': 'Walk or bike when possible. Share rides with classmates.',
      'food': 'Bring baon 3-4 times a week. Pack snacks from home.',
      'supplies': 'Buy in bulk with friends. Look for student discounts.',
      'load': 'Use free WiFi at school. Only buy load for essential calls.',
      'projects': 'Share materials with group mates. Reuse when possible.'
    };
    return tips[category] || 'Look for ways to reduce spending in this category.';
  };

  const getCategoryLabel = (key) => {
    const mapping = {
      'transportation': 'Transportation',
      'food': 'Food & Snacks',
      'supplies': 'School Supplies',
      'load': 'Load/Data',
      'projects': 'Projects',
      'savings': 'Savings',
    };
    return mapping[key] || 'Other';
  };

  const calculateEmergencyFund = () => {
    const dailyAmount = parseFloat(weeklyAllowance) || 0;
    const monthlyAllowance = dailyAmount * 30; // 30 days per month
    const emergencyFund = monthlyAllowance * 3; // 3 months of expenses
    return emergencyFund;
  };

  const calculateCollegeFund = () => {
    const dailyAmount = parseFloat(weeklyAllowance) || 0;
    const yearlySavings = dailyAmount * 365 * 0.2; // 20% savings
    const collegeYears = 4;
    return yearlySavings * collegeYears;
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

        {/* Daily Allowance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💵 Daily Allowance</Text>
          <View style={styles.allowanceCard}>
            <Text style={styles.allowanceLabel}>How much do you receive per day?</Text>
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
            {weeklyAllowance && (
              <Text style={styles.allowanceHint}>
                Weekly: ₱{(parseFloat(weeklyAllowance) * 7).toFixed(2)}/week
              </Text>
            )}
          </View>
        </View>

        {/* Budget Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Plan Your Daily Spending</Text>
          
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
                    <Text style={styles.inputLabel}>Daily Budget</Text>
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
                    {budgets[cat.key] && (
                      <Text style={styles.weeklyHint}>
                        Weekly: ₱{(parseFloat(budgets[cat.key]) * 7).toFixed(2)}
                      </Text>
                    )}
                  </View>

                  {budget > 0 && (
                    <View style={styles.spendingInfo}>
                      <View style={styles.spendingRow}>
                        <Text style={styles.spendingLabel}>Spent this week:</Text>
                        <Text style={styles.spendingValue}>₱{spent.toFixed(2)}</Text>
                      </View>
                      <View style={styles.spendingRow}>
                        <Text style={styles.spendingLabel}>Weekly Budget:</Text>
                        <Text style={styles.spendingValue}>₱{(budget * 7).toFixed(2)}</Text>
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
                <Text style={styles.summaryLabel}>Potential Weekly Savings:</Text>
                <Text style={[
                  styles.summaryValue,
                  { color: (parseFloat(weeklyAllowance) * 7) - (getTotalBudgeted() * 7) >= 0 ? '#10B981' : '#EF4444' }
                ]}>
                  ₱{((parseFloat(weeklyAllowance) * 7) - (getTotalBudgeted() * 7)).toFixed(2)}
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
                <Text style={styles.dailyLabel}>Total Daily Budget:</Text>
                <Text style={styles.dailyValue}>
                  ₱{getTotalBudgeted().toFixed(2)}/day
                </Text>
              </View>
              <Text style={styles.dailyHint}>
                This is how much you can spend per day to stay within budget
              </Text>
            </View>

            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Daily Budget Breakdown:</Text>
              
              <View style={styles.dayExample}>
                <Text style={styles.dayLabel}>Monday - Friday (School Days)</Text>
                <Text style={styles.dayDetail}>
                  • Transportation: ₱{(parseFloat(budgets.transportation) || 0).toFixed(0)}/day
                </Text>
                <Text style={styles.dayDetail}>
                  • Food/Snacks: ₱{(parseFloat(budgets.food) || 0).toFixed(0)}/day
                </Text>
                <Text style={styles.dayDetail}>
                  • Load/Data: ₱{(parseFloat(budgets.load) || 0).toFixed(0)}/day
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

        {/* Financial Insights */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>💡 Financial Insights</Text>
            <TouchableOpacity 
              style={styles.educationButton}
              onPress={() => setShowEducation(!showEducation)}
            >
              <Text style={styles.educationButtonText}>
                {showEducation ? 'Hide' : 'Learn'} Why Save?
              </Text>
            </TouchableOpacity>
          </View>
          
          {financialInsights.map((insight, index) => (
            <View key={index} style={[styles.insightCard, styles[`insight${insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}`]]}>
              <View style={styles.insightHeader}>
                <Text style={styles.insightIcon}>{insight.icon}</Text>
                <Text style={styles.insightTitle}>{insight.title}</Text>
              </View>
              <Text style={styles.insightMessage}>{insight.message}</Text>
              <View style={styles.tipBox}>
                <Text style={styles.tipLabel}>💡 Tip:</Text>
                <Text style={styles.tipText}>{insight.tip}</Text>
              </View>
              <Text style={styles.actionText}>🎯 {insight.action}</Text>
            </View>
          ))}
        </View>

        {/* Educational Content */}
        {showEducation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎓 Why Students Should Save Money</Text>
            
            <View style={styles.educationCard}>
              <Text style={styles.educationTitle}>1. Emergency Fund</Text>
              <Text style={styles.educationText}>
                Life is unpredictable. Having ₱{calculateEmergencyFund().toFixed(0)} saved (3 months of expenses) 
                protects you from unexpected situations like medical emergencies or family needs.
              </Text>
            </View>

            <View style={styles.educationCard}>
              <Text style={styles.educationTitle}>2. Future Education</Text>
              <Text style={styles.educationText}>
                College is expensive! Saving ₱{calculateCollegeFund().toFixed(0)} over 4 years 
                can help pay for tuition, books, or living expenses when you go to university.
              </Text>
            </View>

            <View style={styles.educationCard}>
              <Text style={styles.educationTitle}>3. Financial Independence</Text>
              <Text style={styles.educationText}>
                Learning to save now builds habits that will help you become financially independent. 
                You'll be ahead of your peers who spend everything they earn.
              </Text>
            </View>

            <View style={styles.educationCard}>
              <Text style={styles.educationTitle}>4. Goal Achievement</Text>
              <Text style={styles.educationText}>
                Want a new laptop? A phone? To travel? Saving money helps you achieve your dreams 
                without relying on parents or going into debt.
              </Text>
            </View>

            <View style={styles.educationCard}>
              <Text style={styles.educationTitle}>5. Investment Opportunities</Text>
              <Text style={styles.educationText}>
                Even small amounts saved can be invested. ₱1,000 invested at 18 can grow to ₱10,000+ 
                by the time you're 30 through compound interest!
              </Text>
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

        {/* Advanced Calculations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Advanced Financial Analysis</Text>
          
          <View style={styles.calculationCard}>
            <Text style={styles.calculationTitle}>Emergency Fund Calculator</Text>
            <Text style={styles.calculationValue}>
              ₱{calculateEmergencyFund().toFixed(0)}
            </Text>
            <Text style={styles.calculationDesc}>
              Recommended 3-month emergency fund based on your allowance
            </Text>
          </View>

          <View style={styles.calculationCard}>
            <Text style={styles.calculationTitle}>College Fund Potential</Text>
            <Text style={styles.calculationValue}>
              ₱{calculateCollegeFund().toFixed(0)}
            </Text>
            <Text style={styles.calculationDesc}>
              If you save 20% of allowance for 4 years
            </Text>
          </View>

          <View style={styles.calculationCard}>
            <Text style={styles.calculationTitle}>Daily Allowance</Text>
            <Text style={styles.calculationValue}>
              ₱{(parseFloat(weeklyAllowance) || 0).toFixed(0)}/day
            </Text>
            <Text style={styles.calculationDesc}>
              Your daily allowance amount
            </Text>
          </View>

          <View style={styles.calculationCard}>
            <Text style={styles.calculationTitle}>Weekly Savings Potential</Text>
            <Text style={styles.calculationValue}>
              ₱{(((parseFloat(weeklyAllowance) || 0) - getTotalBudgeted()) * 7).toFixed(0)}/week
            </Text>
            <Text style={styles.calculationDesc}>
              Potential savings if you stick to your budget
            </Text>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Money-Saving Tips for Students</Text>
          <View style={styles.tipsCard}>
            <Text style={styles.tipItem}>• Walk to school when possible to save on fare</Text>
            <Text style={styles.tipItem}>• Bring baon instead of buying food</Text>
            <Text style={styles.tipItem}>• Share rides with classmates to split costs</Text>
            <Text style={styles.tipItem}>• Buy supplies in bulk with friends</Text>
            <Text style={styles.tipItem}>• Use free WiFi at school instead of mobile data</Text>
            <Text style={styles.tipItem}>• Set aside savings first before spending</Text>
            <Text style={styles.tipItem}>• Avoid buying snacks daily - bring from home</Text>
            <Text style={styles.tipItem}>• Join group orders for better prices</Text>
            <Text style={styles.tipItem}>• Look for student discounts everywhere</Text>
            <Text style={styles.tipItem}>• Track every peso you spend</Text>
            <Text style={styles.tipItem}>• Set specific savings goals</Text>
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
  weeklyHint: {
    fontSize: 12,
    color: '#4F46E5',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
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
  allowanceHint: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  educationButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  educationButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  insightCard: {
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
  insightExcellent: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  insightGood: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  insightWarning: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  insightDanger: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  insightInfo: {
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  insightMessage: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  tipBox: {
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  tipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#4F46E5',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    fontStyle: 'italic',
  },
  educationCard: {
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
  educationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 8,
  },
  educationText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  calculationCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    alignItems: 'center',
  },
  calculationTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  calculationValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 4,
  },
  calculationDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
