import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import GlobalBackground from '../components/GlobalBackground';
import { useFocusEffect } from '@react-navigation/native';

/**
 * StatisticsScreen provides a detailed visual breakdown of user spending.
 * Features:
 * 1. Spending filters (Daily, Weekly, Monthly)
 * 2. Visual progress bars for savings goals
 * 3. Category distribution lists
 * 4. Recent history log with insights
 */
export default function StatisticsScreen({ navigation }) {
  // --- STATE MANAGEMENT ---
  const [period, setPeriod] = useState('weekly'); // 'daily', 'weekly', or 'monthly'
  const [transactions, setTransactions] = useState([]); // All stored logs
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalIncome: 0,
    byCategory: {},
    transactionCount: 0,
    dailyAllowance: 0,
    weeklyAllowance: 0,
    monthlyAllowance: 0,
  }); // Calculated metrics for the current period

  const [savingsGoal, setSavingsGoal] = useState(0); // Weekly target
  const [currentSavings, setCurrentSavings] = useState(0); // Calculated leftover amount

  const fadeAnim = useState(new Animated.Value(0))[0]; // Screen transition animation

  /**
   * Reload data whenever the period filter changes
   */
  useEffect(() => {
    loadData();
  }, [period]);

  /**
   * Refresh data when screen receives focus
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
   * Main data loading and analysis function
   */
  const loadData = async () => {
    try {
      const storedTxns = await AsyncStorage.getItem('transactions');
      const storedBudgets = await AsyncStorage.getItem('budgets');

      const allTransactions = storedTxns ? JSON.parse(storedTxns) : [];
      const budgets = storedBudgets ? JSON.parse(storedBudgets) : null;

      setTransactions(allTransactions);
      calculateStatistics(allTransactions, budgets);
    } catch (error) {
      console.error('Error loading statistics data:', error);
    }
  };

  /**
   * Filters and aggregates transactions based on the active period
   */
  const calculateStatistics = async (txns, budgetData) => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // 1. Filter transactions by period
      const filtered = txns.filter((txn) => {
        const txnDate = new Date(txn.timestamp);
        if (period === 'daily') return txnDate >= today;
        if (period === 'weekly') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return txnDate >= weekAgo;
        }
        if (period === 'monthly') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return txnDate >= monthAgo;
        }
        return true;
      });

      // 2. Load budget settings
      let dailyAllowanceVal = 0;
      let weeklyAllowanceVal = 0;
      let goal = 0;

      if (budgetData) {
        dailyAllowanceVal = parseFloat(budgetData.dailyAllowance) || 0;
        weeklyAllowanceVal = parseFloat(budgetData.weeklyAllowance) || (dailyAllowanceVal * 7);
        goal = parseFloat(budgetData.savingsGoal) || 0;
        setSavingsGoal(goal);
      }

      // 3. Aggregate totals
      const spent = filtered
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const byCategory = {};
      filtered
        .filter((t) => t.type === 'expense')
        .forEach((t) => {
          byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
        });

      // 4. Calculate period income (allowance)
      let periodIncome = 0;
      if (period === 'daily') periodIncome = dailyAllowanceVal;
      else if (period === 'weekly') periodIncome = weeklyAllowanceVal;
      else if (period === 'monthly') periodIncome = dailyAllowanceVal * 30;

      setStats({
        totalSpent: spent,
        totalIncome: periodIncome,
        byCategory,
        transactionCount: filtered.length,
        dailyAllowance: dailyAllowanceVal,
        weeklyAllowance: weeklyAllowanceVal,
        monthlyAllowance: dailyAllowanceVal * 30,
      });

      // 5. Calculate Savings (Weekly context for goal progress)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklySpentVal = txns
        .filter((t) => t.type === 'expense' && new Date(t.timestamp) >= weekAgo)
        .reduce((sum, t) => sum + t.amount, 0);

      setCurrentSavings(Math.max(0, weeklyAllowanceVal - weeklySpentVal));

    } catch (error) {
      console.error('Error calculating statistics:', error);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Food & Snacks': '🍔',
      'Transportation': '🚌',
      'School Supplies': '📚',
      'Projects': '📝',
      'Load/Data': '📱',
      'Entertainment': '🎮',
      'Savings': '💰',
      'Other': '📦',
    };
    return icons[category] || '📦';
  };

  const getPeriodLabel = () => {
    if (period === 'daily') return 'Today';
    if (period === 'weekly') return 'This Week';
    if (period === 'monthly') return 'This Month';
    return '';
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <GlobalBackground />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Statistics</Text>
        <Text style={styles.headerSubtitle}>Track your spending & savings</Text>
      </View>

      <View style={styles.periodSelector}>
        {['daily', 'weekly', 'monthly'].map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, period === p && styles.periodButtonActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Summary Overview */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.periodLabel}>{getPeriodLabel()}</Text>
            <Text style={styles.periodIcon}>{period === 'daily' ? '📅' : '📆'}</Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Allowance</Text>
              <Text style={styles.summaryItemValue}>₱{stats.totalIncome.toFixed(0)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Spent</Text>
              <Text style={[styles.summaryItemValue, { color: '#EF4444' }]}>₱{stats.totalSpent.toFixed(0)}</Text>
            </View>
          </View>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Remaining</Text>
            <Text style={[styles.balanceValue, { color: stats.totalIncome >= stats.totalSpent ? '#10B981' : '#EF4444' }]}>
              ₱{(stats.totalIncome - stats.totalSpent).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Savings Goal progress */}
        {!!(savingsGoal > 0) && (
          <View style={styles.section}>
            <View style={styles.goalCard}>
              <Text style={styles.sectionTitle}>💰 Savings Goal Progress</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressBarFill, { width: `${Math.min(100, (currentSavings / savingsGoal) * 100)}%`, backgroundColor: '#10B981' }]} />
              </View>
              <Text style={styles.progressText}>{((currentSavings / savingsGoal) * 100).toFixed(0)}% reached (₱{currentSavings.toFixed(0)} / ₱{savingsGoal})</Text>
            </View>
          </View>
        )}

        {/* Category breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Spending by Category</Text>
          {Object.entries(stats.byCategory).length === 0 ? (
            <View style={styles.emptyState}><Text style={styles.emptyText}>No transactions this period</Text></View>
          ) : (
            Object.entries(stats.byCategory).sort(([, a], [, b]) => b - a).map(([category, amount]) => (
              <View key={category} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryEmoji}>{getCategoryIcon(category)}</Text>
                  <Text style={styles.categoryName}>{category}</Text>
                </View>
                <Text style={styles.categoryAmount}>₱{amount.toFixed(2)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Future/Detailed Breakdown */}
        <View style={styles.section}>
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>📅 Allowance Overview</Text>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Daily:</Text><Text style={styles.detailValue}>₱{stats.dailyAllowance.toFixed(0)}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Weekly:</Text><Text style={styles.detailValue}>₱{stats.weeklyAllowance.toFixed(0)}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Monthly:</Text><Text style={styles.detailValue}>₱{stats.monthlyAllowance.toFixed(0)}</Text></View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { paddingTop: 60, paddingHorizontal: 20, marginBottom: 10 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#1F2937' },
  headerSubtitle: { fontSize: 16, color: '#6B7280' },
  periodSelector: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 12, padding: 4, elevation: 4, marginBottom: 20 },
  periodButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  periodButtonActive: { backgroundColor: '#4F46E5' },
  periodText: { fontWeight: '600', color: '#6B7280' },
  periodTextActive: { color: '#fff' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  summaryCard: { backgroundColor: '#4F46E5', marginHorizontal: 20, padding: 24, borderRadius: 24, elevation: 8, shadowColor: '#4F46E5' },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  periodLabel: { color: '#E0E7FF', fontSize: 18, fontWeight: 'bold' },
  periodIcon: { fontSize: 24 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { flex: 1 },
  summaryItemLabel: { color: '#E0E7FF', fontSize: 12, marginBottom: 4 },
  summaryItemValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  balanceRow: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { color: '#fff', fontSize: 16 },
  balanceValue: { fontSize: 24, fontWeight: 'bold' },
  section: { marginHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },
  goalCard: { backgroundColor: '#fff', padding: 20, borderRadius: 20, elevation: 2 },
  progressBar: { height: 10, backgroundColor: '#F3F4F6', borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 5 },
  progressText: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#9CA3AF' },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 8 },
  categoryInfo: { flexDirection: 'row', alignItems: 'center' },
  categoryEmoji: { fontSize: 24, marginRight: 12 },
  categoryName: { fontSize: 16, fontWeight: '500' },
  categoryAmount: { fontSize: 16, fontWeight: 'bold', color: '#EF4444' },
  detailsCard: { backgroundColor: '#fff', padding: 20, borderRadius: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  detailLabel: { color: '#6B7280' },
  detailValue: { fontWeight: 'bold', color: '#1F2937' },
});
