import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [totalAllowance, setTotalAllowance] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [savings, setSavings] = useState(0);
  const [budgetWarnings, setBudgetWarnings] = useState([]);

  useEffect(() => {
    loadTransactions();
    const unsubscribe = navigation.addListener('focus', () => {
      loadTransactions();
    });
    return unsubscribe;
  }, [navigation]);

  const loadTransactions = async () => {
    try {
      const stored = await AsyncStorage.getItem('transactions');
      if (stored) {
        const parsedTransactions = JSON.parse(stored);
        setTransactions(parsedTransactions);
        calculateStats(parsedTransactions);
        await checkBudgetWarnings(parsedTransactions);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    }
  };

  const checkBudgetWarnings = async (txns) => {
    try {
      const budgetData = await AsyncStorage.getItem('budgets');
      if (!budgetData) return;

      const budgets = JSON.parse(budgetData).categories || {};
      
      // Get weekly spending
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const weeklySpending = {};
      txns
        .filter((t) => t.type === 'expense' && new Date(t.timestamp) >= weekAgo)
        .forEach((t) => {
          const categoryKey = getCategoryKey(t.category);
          weeklySpending[categoryKey] = (weeklySpending[categoryKey] || 0) + t.amount;
        });

      const warnings = [];
      Object.entries(budgets).forEach(([key, budget]) => {
        const spent = weeklySpending[key] || 0;
        const budgetAmount = parseFloat(budget) || 0;
        
        if (budgetAmount > 0 && spent >= budgetAmount * 0.8) {
          const percentage = (spent / budgetAmount * 100).toFixed(0);
          warnings.push({
            category: getCategoryLabel(key),
            percentage,
            isOver: spent >= budgetAmount,
          });
        }
      });

      setBudgetWarnings(warnings);
    } catch (error) {
      console.error('Error checking budgets:', error);
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

  const calculateStats = (txns) => {
    const allowance = txns
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const spent = txns
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const savingsAmount = txns
      .filter((t) => t.category === 'Savings')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const currentBalance = allowance - spent;
    
    setTotalAllowance(allowance);
    setTotalSpent(spent);
    setSavings(savingsAmount);
    setBalance(currentBalance);
  };

  const handleDeleteTransaction = async (id) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = transactions.filter((txn) => txn.id !== id);
              await AsyncStorage.setItem('transactions', JSON.stringify(updated));
              setTransactions(updated);
              calculateStats(updated);
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert('Error', 'Failed to delete transaction');
            }
          },
        },
      ]
    );
  };

  const renderTransaction = ({ item }) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onLongPress={() => handleDeleteTransaction(item.id)}
    >
      <View style={styles.transactionLeft}>
        <View
          style={[
            styles.typeIndicator,
            { backgroundColor: item.type === 'income' ? '#10B981' : '#EF4444' },
          ]}
        />
        <View>
          <Text style={styles.transactionTitle}>{item.title}</Text>
          <Text style={styles.transactionCategory}>{item.category}</Text>
          <Text style={styles.transactionDate}>{item.date}</Text>
        </View>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          { color: item.type === 'income' ? '#10B981' : '#EF4444' },
        ]}
      >
        {item.type === 'income' ? '+' : '-'}₱{item.amount.toFixed(2)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Budget Warnings */}
      {budgetWarnings.length > 0 && (
        <View style={styles.warningContainer}>
          {budgetWarnings.map((warning, index) => (
            <View 
              key={index} 
              style={[
                styles.warningCard,
                { backgroundColor: warning.isOver ? '#FEE2E2' : '#FEF3C7' }
              ]}
            >
              <Text style={styles.warningIcon}>{warning.isOver ? '⚠️' : '⚡'}</Text>
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>
                  {warning.isOver ? 'Over Budget!' : 'Budget Alert'}
                </Text>
                <Text style={styles.warningText}>
                  {warning.category}: {warning.percentage}% of weekly budget used
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={styles.quickActionIcon}>🔔</Text>
          <Text style={styles.quickActionText}>Alerts</Text>
          {budgetWarnings.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{budgetWarnings.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('Statistics')}
        >
          <Text style={styles.quickActionIcon}>📊</Text>
          <Text style={styles.quickActionText}>Statistics</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('BudgetPlanner')}
        >
          <Text style={styles.quickActionIcon}>📋</Text>
          <Text style={styles.quickActionText}>Budget Plan</Text>
        </TouchableOpacity>
      </View>
      
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>My Budget</Text>
        <Text style={[
          styles.balanceAmount,
          { color: balance >= 0 ? '#10B981' : '#EF4444' }
        ]}>
          ₱{balance.toFixed(2)}
        </Text>
        <Text style={styles.balanceSubtext}>Available Money</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>💵</Text>
            <Text style={styles.statLabel}>Allowance</Text>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              ₱{totalAllowance.toFixed(2)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>💸</Text>
            <Text style={styles.statLabel}>Spent</Text>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              ₱{totalSpent.toFixed(2)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🎯</Text>
            <Text style={styles.statLabel}>Savings</Text>
            <Text style={[styles.statValue, { color: '#2563EB' }]}>
              ₱{savings.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Transactions List */}
      <View style={styles.transactionsContainer}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎓</Text>
            <Text style={styles.emptyText}>Start tracking your budget!</Text>
            <Text style={styles.emptySubtext}>Add your allowance and expenses</Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddTransaction')}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  balanceCard: {
    backgroundColor: '#4F46E5',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  balanceLabel: {
    color: '#E0E7FF',
    fontSize: 14,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  balanceSubtext: {
    color: '#E0E7FF',
    fontSize: 14,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statLabel: {
    color: '#E0E7FF',
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 80,
  },
  transactionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  transactionCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
  },
  warningContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  warningCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    color: '#6B7280',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    position: 'relative',
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

