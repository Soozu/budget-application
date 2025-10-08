import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

export default function StatisticsScreen() {
  const [period, setPeriod] = useState('daily'); // daily, weekly, monthly
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalIncome: 0,
    byCategory: {},
    transactionCount: 0,
  });

  useEffect(() => {
    loadStatistics();
  }, [period]);

  const loadStatistics = async () => {
    try {
      const stored = await AsyncStorage.getItem('transactions');
      if (stored) {
        const allTransactions = JSON.parse(stored);
        const filtered = filterByPeriod(allTransactions);
        setTransactions(filtered);
        calculateStats(filtered);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const filterByPeriod = (txns) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return txns.filter((txn) => {
      const txnDate = new Date(txn.timestamp);
      
      if (period === 'daily') {
        return txnDate >= today;
      } else if (period === 'weekly') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return txnDate >= weekAgo;
      } else if (period === 'monthly') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return txnDate >= monthAgo;
      }
      return true;
    });
  };

  const calculateStats = (txns) => {
    const spent = txns
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const income = txns
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const byCategory = {};
    txns
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
      });

    setStats({
      totalSpent: spent,
      totalIncome: income,
      byCategory,
      transactionCount: txns.length,
    });
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
      'Allowance': '💵',
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
      
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[styles.periodButton, period === 'daily' && styles.periodButtonActive]}
          onPress={() => setPeriod('daily')}
        >
          <Text style={[styles.periodText, period === 'daily' && styles.periodTextActive]}>
            Daily
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.periodButton, period === 'weekly' && styles.periodButtonActive]}
          onPress={() => setPeriod('weekly')}
        >
          <Text style={[styles.periodText, period === 'weekly' && styles.periodTextActive]}>
            Weekly
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.periodButton, period === 'monthly' && styles.periodButtonActive]}
          onPress={() => setPeriod('monthly')}
        >
          <Text style={[styles.periodText, period === 'monthly' && styles.periodTextActive]}>
            Monthly
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.periodLabel}>{getPeriodLabel()}</Text>
          
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryIcon}>💵</Text>
              <Text style={styles.summaryLabel}>Allowance</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                ₱{stats.totalIncome.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryIcon}>💸</Text>
              <Text style={styles.summaryLabel}>Spent</Text>
              <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                ₱{stats.totalSpent.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Remaining</Text>
            <Text style={[
              styles.balanceValue,
              { color: stats.totalIncome - stats.totalSpent >= 0 ? '#10B981' : '#EF4444' }
            ]}>
              ₱{(stats.totalIncome - stats.totalSpent).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spending by Category</Text>
          
          {Object.keys(stats.byCategory).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyText}>No expenses {getPeriodLabel().toLowerCase()}</Text>
            </View>
          ) : (
            Object.entries(stats.byCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([category, amount]) => {
                const percentage = stats.totalSpent > 0 
                  ? (amount / stats.totalSpent * 100).toFixed(1)
                  : 0;
                
                return (
                  <View key={category} style={styles.categoryCard}>
                    <View style={styles.categoryHeader}>
                      <View style={styles.categoryLeft}>
                        <Text style={styles.categoryIcon}>
                          {getCategoryIcon(category)}
                        </Text>
                        <Text style={styles.categoryName}>{category}</Text>
                      </View>
                      <Text style={styles.categoryAmount}>₱{amount.toFixed(2)}</Text>
                    </View>
                    
                    <View style={styles.progressBar}>
                      <View 
                        style={[styles.progressFill, { width: `${percentage}%` }]} 
                      />
                    </View>
                    <Text style={styles.percentageText}>{percentage}% of total</Text>
                  </View>
                );
              })
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          
          <View style={styles.quickStatsCard}>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatLabel}>Transactions</Text>
              <Text style={styles.quickStatValue}>{stats.transactionCount}</Text>
            </View>
            
            <View style={styles.quickStatDivider} />
            
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatLabel}>Avg per Day</Text>
              <Text style={styles.quickStatValue}>
                ₱{period === 'daily' 
                  ? stats.totalSpent.toFixed(0)
                  : period === 'weekly'
                  ? (stats.totalSpent / 7).toFixed(0)
                  : (stats.totalSpent / 30).toFixed(0)
                }
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    padding: 4,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#4F46E5',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#4F46E5',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  periodLabel: {
    color: '#E0E7FF',
    fontSize: 14,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#E0E7FF',
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  balanceLabel: {
    color: '#E0E7FF',
    fontSize: 16,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
  },
  percentageText: {
    fontSize: 12,
    color: '#6B7280',
  },
  quickStatsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
});
