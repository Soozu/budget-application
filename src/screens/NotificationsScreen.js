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

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const [txnData, budgetData] = await Promise.all([
        AsyncStorage.getItem('transactions'),
        AsyncStorage.getItem('budgets'),
      ]);

      const transactions = txnData ? JSON.parse(txnData) : [];
      const budgets = budgetData ? JSON.parse(budgetData) : { categories: {}, weeklyAllowance: 0 };

      generateNotifications(transactions, budgets);
      generateInsights(transactions, budgets);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const generateNotifications = (transactions, budgets) => {
    const notifs = [];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Calculate weekly spending
    const weeklySpending = {};
    transactions
      .filter((t) => t.type === 'expense' && new Date(t.timestamp) >= weekAgo)
      .forEach((t) => {
        const key = getCategoryKey(t.category);
        weeklySpending[key] = (weeklySpending[key] || 0) + t.amount;
      });

    // Budget alerts
    Object.entries(budgets.categories || {}).forEach(([key, budget]) => {
      const spent = weeklySpending[key] || 0;
      const budgetAmount = parseFloat(budget) || 0;
      
      if (budgetAmount > 0) {
        const percentage = (spent / budgetAmount * 100);
        const remaining = budgetAmount - spent;
        
        if (percentage >= 100) {
          notifs.push({
            id: `over-${key}`,
            type: 'alert',
            icon: '🚨',
            title: `Over Budget: ${getCategoryLabel(key)}`,
            message: `You've exceeded your weekly budget by ₱${Math.abs(remaining).toFixed(2)}. Consider cutting back.`,
            color: '#EF4444',
            priority: 'high',
          });
        } else if (percentage >= 80) {
          notifs.push({
            id: `warning-${key}`,
            type: 'warning',
            icon: '⚠️',
            title: `Budget Warning: ${getCategoryLabel(key)}`,
            message: `You've used ${percentage.toFixed(0)}% of your budget. Only ₱${remaining.toFixed(2)} left.`,
            color: '#F59E0B',
            priority: 'medium',
          });
        }
      }
    });

    // Daily spending check
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySpending = transactions
      .filter((t) => t.type === 'expense' && new Date(t.timestamp) >= today)
      .reduce((sum, t) => sum + t.amount, 0);

    if (todaySpending > 200) {
      notifs.push({
        id: 'high-daily',
        type: 'info',
        icon: '💸',
        title: 'High Spending Today',
        message: `You've spent ₱${todaySpending.toFixed(2)} today. That's quite high for a school day!`,
        color: '#3B82F6',
        priority: 'low',
      });
    }

    // No transactions today
    const hasTransactionToday = transactions.some((t) => new Date(t.timestamp) >= today);
    if (!hasTransactionToday && new Date().getHours() > 16) {
      notifs.push({
        id: 'no-tracking',
        type: 'reminder',
        icon: '📝',
        title: 'Don\'t Forget to Track',
        message: 'You haven\'t logged any transactions today. Did you spend anything at school?',
        color: '#8B5CF6',
        priority: 'low',
      });
    }

    // Savings goal
    const savings = transactions
      .filter((t) => t.category === 'Savings')
      .reduce((sum, t) => sum + t.amount, 0);
    
    if (savings === 0 && transactions.length > 10) {
      notifs.push({
        id: 'no-savings',
        type: 'tip',
        icon: '🎯',
        title: 'Start Saving!',
        message: 'You haven\'t set aside any savings yet. Try to save at least 10% of your allowance.',
        color: '#10B981',
        priority: 'medium',
      });
    }

    setNotifications(notifs.sort((a, b) => {
      const priority = { high: 3, medium: 2, low: 1 };
      return priority[b.priority] - priority[a.priority];
    }));
  };

  const generateInsights = (transactions, budgets) => {
    const insightsList = [];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Spending patterns
    const weeklyTxns = transactions.filter((t) => 
      t.type === 'expense' && new Date(t.timestamp) >= weekAgo
    );

    // Most expensive category
    const categoryTotals = {};
    weeklyTxns.forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    if (Object.keys(categoryTotals).length > 0) {
      const topCategory = Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)[0];
      
      insightsList.push({
        icon: '📊',
        title: 'Top Spending Category',
        message: `${topCategory[0]}: ₱${topCategory[1].toFixed(2)} this week`,
        tip: getSpecificTip(topCategory[0]),
      });
    }

    // Average daily spending
    const avgDaily = weeklyTxns.reduce((sum, t) => sum + t.amount, 0) / 7;
    insightsList.push({
      icon: '💵',
      title: 'Daily Average',
      message: `You spend about ₱${avgDaily.toFixed(2)} per day`,
      tip: avgDaily > 100 ? 'Try to bring baon to reduce daily expenses' : 'Great job keeping daily spending low!',
    });

    // Comparison with budget
    const weeklyAllowance = parseFloat(budgets.weeklyAllowance) || 0;
    const weeklySpent = weeklyTxns.reduce((sum, t) => sum + t.amount, 0);
    
    if (weeklyAllowance > 0) {
      const savingsRate = ((weeklyAllowance - weeklySpent) / weeklyAllowance * 100);
      insightsList.push({
        icon: '🎯',
        title: savingsRate >= 0 ? 'Savings Rate' : 'Overspending',
        message: savingsRate >= 0 
          ? `You're saving ${savingsRate.toFixed(0)}% of your allowance` 
          : `You're over budget by ${Math.abs(savingsRate).toFixed(0)}%`,
        tip: savingsRate >= 20 
          ? 'Excellent! Keep up the good savings habit!' 
          : savingsRate >= 0
          ? 'Try to save at least 20% of your allowance'
          : 'You need to cut back on spending to stay within budget',
      });
    }

    setInsights(insightsList);
  };

  const getSpecificTip = (category) => {
    const tips = {
      'Food & Snacks': 'Bring lunch from home 3x a week to save ₱150-200',
      'Transportation': 'Try walking to school or sharing rides to cut transport costs',
      'School Supplies': 'Buy supplies in bulk with classmates for better prices',
      'Load/Data': 'Use free WiFi at school instead of mobile data',
      'Projects': 'Share materials with group mates to split costs',
      'Entertainment': 'Look for free activities or student discounts',
    };
    return tips[category] || 'Look for ways to reduce spending in this category';
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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView style={styles.scrollView}>
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Alerts & Reminders</Text>
          
          {notifications.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>✓</Text>
              <Text style={styles.emptyTitle}>All Good!</Text>
              <Text style={styles.emptyText}>
                You're on track with your budget. Keep up the good work!
              </Text>
            </View>
          ) : (
            notifications.map((notif) => (
              <View key={notif.id} style={[styles.notifCard, { borderLeftColor: notif.color }]}>
                <View style={styles.notifHeader}>
                  <Text style={styles.notifIcon}>{notif.icon}</Text>
                  <Text style={styles.notifTitle}>{notif.title}</Text>
                </View>
                <Text style={styles.notifMessage}>{notif.message}</Text>
              </View>
            ))
          )}
        </View>

        {/* Insights Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Spending Insights</Text>
          
          {insights.map((insight, index) => (
            <View key={index} style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Text style={styles.insightIcon}>{insight.icon}</Text>
                <Text style={styles.insightTitle}>{insight.title}</Text>
              </View>
              <Text style={styles.insightMessage}>{insight.message}</Text>
              <View style={styles.tipBox}>
                <Text style={styles.tipLabel}>💡 Tip:</Text>
                <Text style={styles.tipText}>{insight.tip}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Money Saving Challenges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Weekly Challenges</Text>
          
          <View style={styles.challengeCard}>
            <Text style={styles.challengeIcon}>🍱</Text>
            <View style={styles.challengeContent}>
              <Text style={styles.challengeTitle}>Baon Challenge</Text>
              <Text style={styles.challengeDesc}>
                Bring lunch from home 4 days this week
              </Text>
              <Text style={styles.challengeReward}>💰 Save up to ₱200!</Text>
            </View>
          </View>

          <View style={styles.challengeCard}>
            <Text style={styles.challengeIcon}>🚶</Text>
            <View style={styles.challengeContent}>
              <Text style={styles.challengeTitle}>Walking Challenge</Text>
              <Text style={styles.challengeDesc}>
                Walk to/from school twice this week
              </Text>
              <Text style={styles.challengeReward}>💰 Save ₱40 on jeep fare!</Text>
            </View>
          </View>

          <View style={styles.challengeCard}>
            <Text style={styles.challengeIcon}>💧</Text>
            <View style={styles.challengeContent}>
              <Text style={styles.challengeTitle}>Water Over Soda</Text>
              <Text style={styles.challengeDesc}>
                Choose water instead of buying drinks all week
              </Text>
              <Text style={styles.challengeReward}>💰 Save ₱70-100!</Text>
            </View>
          </View>
        </View>

        {/* Smart Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧠 Smart Money Tips for Students</Text>
          
          <View style={styles.tipsCard}>
            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>1</Text>
              <Text style={styles.tipContent}>
                <Text style={styles.tipBold}>Track immediately:</Text> Log expenses right after purchasing so you don't forget
              </Text>
            </View>

            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>2</Text>
              <Text style={styles.tipContent}>
                <Text style={styles.tipBold}>50-30-20 Rule:</Text> 50% needs (food, transport), 30% wants (snacks, load), 20% savings
              </Text>
            </View>

            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>3</Text>
              <Text style={styles.tipContent}>
                <Text style={styles.tipBold}>Avoid impulse buying:</Text> Wait 24 hours before buying non-essential items
              </Text>
            </View>

            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>4</Text>
              <Text style={styles.tipContent}>
                <Text style={styles.tipBold}>Share with friends:</Text> Split costs for group projects, snacks, and rides
              </Text>
            </View>

            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>5</Text>
              <Text style={styles.tipContent}>
                <Text style={styles.tipBold}>Use student discounts:</Text> Many stores offer student discounts - always ask!
              </Text>
            </View>
          </View>
        </View>

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
  section: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  notifCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notifIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  notifMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
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
  },
  insightMessage: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
  },
  tipBox: {
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
  },
  tipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
    marginRight: 6,
  },
  tipText: {
    fontSize: 13,
    color: '#4F46E5',
    flex: 1,
  },
  challengeCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  challengeIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  challengeContent: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  challengeDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  challengeReward: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
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
    flexDirection: 'row',
    marginBottom: 16,
  },
  tipNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 28,
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  tipBold: {
    fontWeight: 'bold',
    color: '#1F2937',
  },
});
