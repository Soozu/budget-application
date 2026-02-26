import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import GlobalBackground from '../components/GlobalBackground';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * NotificationsScreen displays budget alerts, saving tips, and challenges.
 * Features:
 * 1. Automatic alerts when categories are near or over budget
 * 2. Time-relevant saving tips
 * 3. Monthly/Weekly savings challenges
 * 4. Education cards about financial literacy
 */
export default function NotificationsScreen() {
  // --- STATE MANAGEMENT ---
  const [notifications, setNotifications] = useState([]); // List of current budget alerts
  const [insights, setInsights] = useState([]); // Dynamic financial advice
  const [refreshing, setRefreshing] = useState(false); // State for pull-to-refresh
  const [dismissedNotifications, setDismissedNotifications] = useState([]); // List of notification IDs that have been dismissed
  const [notificationPermission, setNotificationPermission] = useState(null); // Current notification permission status
  const notificationListener = useRef(); // Ref to store the notification received listener subscription
  const responseListener = useRef(); // Ref to store the notification response listener subscription

  useEffect(() => {
    requestNotificationPermissions();
    loadNotifications();

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // Refresh notifications when a new one arrives
      loadNotifications();
    });

    // Listen for user tapping on notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // Refresh notifications when user interacts with notification
      loadNotifications();
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadNotifications();
      checkNotificationPermission();
    }, [])
  );

  const requestNotificationPermissions = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setNotificationPermission(finalStatus);

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Notification Permission',
          'Please enable notifications in your device settings to receive budget alerts and reminders.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('budget-alerts', {
          name: 'Budget Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4F46E5',
        });
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
    }
  };

  const checkNotificationPermission = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationPermission(status);
    } catch (error) {
      console.error('Error checking notification permission:', error);
    }
  };

  const scheduleNotification = async (notificationId, title, body, data = {}) => {
    try {
      if (notificationPermission !== 'granted') {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        identifier: notificationId,
        content: {
          title: title,
          body: body,
          data: data,
          sound: true,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const [txnData, budgetData, dismissedData] = await Promise.all([
        AsyncStorage.getItem('transactions'),
        AsyncStorage.getItem('budgets'),
        AsyncStorage.getItem('dismissedNotifications'),
      ]);

      const transactions = txnData ? JSON.parse(txnData) : [];
      const budgets = budgetData ? JSON.parse(budgetData) : { categories: {}, weeklyAllowance: 0 };
      const dismissed = dismissedData ? JSON.parse(dismissedData) : [];

      setDismissedNotifications(dismissed);
      generateNotifications(transactions, budgets, dismissed);
      generateInsights(transactions, budgets);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadDismissedNotifications = async () => {
    try {
      const dismissed = await AsyncStorage.getItem('dismissedNotifications');
      setDismissedNotifications(dismissed ? JSON.parse(dismissed) : []);
    } catch (error) {
      console.error('Error loading dismissed notifications:', error);
    }
  };

  const dismissNotification = async (notificationId) => {
    try {
      const updatedDismissed = [...dismissedNotifications, notificationId];
      await AsyncStorage.setItem('dismissedNotifications', JSON.stringify(updatedDismissed));
      setDismissedNotifications(updatedDismissed);

      // Remove from current notifications
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const clearAllNotifications = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to dismiss all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const allIds = notifications.map(n => n.id);
              const updatedDismissed = [...dismissedNotifications, ...allIds];
              await AsyncStorage.setItem('dismissedNotifications', JSON.stringify(updatedDismissed));
              setDismissedNotifications(updatedDismissed);
              setNotifications([]);
            } catch (error) {
              console.error('Error clearing notifications:', error);
            }
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const generateNotifications = (transactions, budgets, dismissed = []) => {
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

    // Budget alerts (using daily budget * 7 for weekly comparison)
    Object.entries(budgets.categories || {}).forEach(([key, budget]) => {
      const spent = weeklySpending[key] || 0;
      const dailyBudgetAmount = parseFloat(budget) || 0;
      const weeklyBudgetAmount = dailyBudgetAmount * 7; // Convert daily to weekly

      if (dailyBudgetAmount > 0) {
        const percentage = (spent / weeklyBudgetAmount * 100);
        const remaining = weeklyBudgetAmount - spent;

        if (percentage >= 100) {
          const notif = {
            id: `over-${key}`,
            type: 'alert',
            icon: '🚨',
            title: `Over Budget: ${getCategoryLabel(key)}`,
            message: `You've exceeded your weekly budget by ₱${Math.abs(remaining).toFixed(2)}. Consider cutting back.`,
            color: '#EF4444',
            priority: 'high',
            timestamp: Date.now(),
          };
          notifs.push(notif);
          // Schedule push notification
          scheduleNotification(notif.id, notif.title, notif.message, { type: 'budget_alert', category: key });
        } else if (percentage >= 80) {
          const notif = {
            id: `warning-${key}`,
            type: 'warning',
            icon: '⚠️',
            title: `Budget Warning: ${getCategoryLabel(key)}`,
            message: `You've used ${percentage.toFixed(0)}% of your weekly budget. Only ₱${remaining.toFixed(2)} left.`,
            color: '#F59E0B',
            priority: 'medium',
            timestamp: Date.now(),
          };
          notifs.push(notif);
          // Schedule push notification
          scheduleNotification(notif.id, notif.title, notif.message, { type: 'budget_warning', category: key });
        }
      }
    });

    // Daily spending check
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySpending = transactions
      .filter((t) => t.type === 'expense' && new Date(t.timestamp) >= today)
      .reduce((sum, t) => sum + t.amount, 0);

    // Dynamic daily spending threshold based on allowance
    const dailyAllowance = parseFloat(budgets.dailyAllowance) || 0;
    const dailyThreshold = dailyAllowance > 0 ? dailyAllowance * 0.8 : 200; // 80% of daily allowance

    if (todaySpending > dailyThreshold) {
      const notif = {
        id: 'high-daily',
        type: 'info',
        icon: '💸',
        title: 'High Spending Today',
        message: `You've spent ₱${todaySpending.toFixed(2)} today. That's ${dailyAllowance > 0 ? `${((todaySpending / dailyAllowance) * 100).toFixed(0)}%` : 'quite high'} of your daily allowance!`,
        color: '#3B82F6',
        priority: 'medium',
        timestamp: Date.now(),
      };
      notifs.push(notif);
      // Schedule push notification
      scheduleNotification(notif.id, notif.title, notif.message, { type: 'daily_spending' });
    }

    // No transactions today reminder
    const hasTransactionToday = transactions.some((t) => new Date(t.timestamp) >= today);
    if (!hasTransactionToday && new Date().getHours() > 16) {
      const notif = {
        id: 'no-tracking',
        type: 'reminder',
        icon: '📝',
        title: 'Don\'t Forget to Track',
        message: 'You haven\'t logged any transactions today. Did you spend anything at school?',
        color: '#8B5CF6',
        priority: 'low',
        timestamp: Date.now(),
      };
      notifs.push(notif);
      // Schedule push notification
      scheduleNotification(notif.id, notif.title, notif.message, { type: 'reminder' });
    }

    // Weekly savings potential notification
    const weeklyAllowance = parseFloat(budgets.weeklyAllowance) || 0;
    const weeklySpent = transactions
      .filter((t) => t.type === 'expense' && new Date(t.timestamp) >= weekAgo)
      .reduce((sum, t) => sum + t.amount, 0);

    if (weeklyAllowance > 0) {
      const savingsPotential = weeklyAllowance - weeklySpent;
      if (savingsPotential > 0 && savingsPotential < weeklyAllowance * 0.1) {
        const notif = {
          id: 'low-savings',
          type: 'tip',
          icon: '💰',
          title: 'Low Savings This Week',
          message: `You've only saved ₱${savingsPotential.toFixed(2)} this week. Try to save at least ₱${(weeklyAllowance * 0.2).toFixed(2)} (20% of allowance).`,
          color: '#10B981',
          priority: 'medium',
          timestamp: Date.now(),
        };
        notifs.push(notif);
        // Schedule push notification
        scheduleNotification(notif.id, notif.title, notif.message, { type: 'savings_tip' });
      } else if (savingsPotential > weeklyAllowance * 0.2) {
        const notif = {
          id: 'good-savings',
          type: 'success',
          icon: '🎉',
          title: 'Great Savings!',
          message: `Excellent! You've saved ₱${savingsPotential.toFixed(2)} this week (${((savingsPotential / weeklyAllowance) * 100).toFixed(0)}% of allowance). Keep it up!`,
          color: '#10B981',
          priority: 'low',
          timestamp: Date.now(),
        };
        notifs.push(notif);
        // Schedule push notification
        scheduleNotification(notif.id, notif.title, notif.message, { type: 'savings_success' });
      }
    }

    // Weekend spending alert
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 5 || dayOfWeek === 6) { // Friday or Saturday
      const weekendSpending = transactions
        .filter((t) => {
          const txnDate = new Date(t.timestamp);
          return t.type === 'expense' && (txnDate.getDay() === 5 || txnDate.getDay() === 6);
        })
        .reduce((sum, t) => sum + t.amount, 0);

      if (weekendSpending > (dailyAllowance * 1.5)) {
        const notif = {
          id: 'weekend-spending',
          type: 'warning',
          icon: '🎉',
          title: 'Weekend Spending Alert',
          message: `You've spent ₱${weekendSpending.toFixed(2)} this weekend. Consider budgeting for leisure activities.`,
          color: '#F59E0B',
          priority: 'medium',
          timestamp: Date.now(),
        };
        notifs.push(notif);
        // Schedule push notification
        scheduleNotification(notif.id, notif.title, notif.message, { type: 'weekend_spending' });
      }
    }

    // Streak notifications
    const streakDays = calculateTrackingStreak(transactions);
    if (streakDays >= 7) {
      const notif = {
        id: 'tracking-streak',
        type: 'success',
        icon: '🔥',
        title: `${streakDays} Day Tracking Streak!`,
        message: `Amazing! You've been tracking your expenses for ${streakDays} days straight. Consistency is key to good money habits!`,
        color: '#10B981',
        priority: 'low',
        timestamp: Date.now(),
      };
      notifs.push(notif);
      // Schedule push notification
      scheduleNotification(notif.id, notif.title, notif.message, { type: 'streak' });
    }

    // Filter out dismissed notifications
    const filteredNotifs = notifs.filter(notif => !dismissed.includes(notif.id));

    setNotifications(filteredNotifs.sort((a, b) => {
      const priority = { high: 3, medium: 2, low: 1 };
      return priority[b.priority] - priority[a.priority];
    }));
  };

  const calculateTrackingStreak = (transactions) => {
    const today = new Date();
    let streak = 0;

    for (let i = 0; i < 30; i++) { // Check last 30 days
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);

      const nextDay = new Date(checkDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const hasTransactionOnDay = transactions.some(t => {
        const txnDate = new Date(t.timestamp);
        return txnDate >= checkDate && txnDate < nextDay;
      });

      if (hasTransactionOnDay) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
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

    // Spending frequency analysis
    const spendingDays = new Set();
    weeklyTxns.forEach(t => {
      const date = new Date(t.timestamp).toDateString();
      spendingDays.add(date);
    });

    insightsList.push({
      icon: '📅',
      title: 'Spending Frequency',
      message: `You spent money on ${spendingDays.size} out of 7 days this week`,
      tip: spendingDays.size >= 5 ? 'Consider planning no-spend days to save more' : 'Good job spacing out your expenses!',
    });

    // Category distribution
    if (Object.keys(categoryTotals).length > 1) {
      const totalSpent = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
      const topCategory = Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)[0];
      const topCategoryPercentage = (topCategory[1] / totalSpent * 100);

      insightsList.push({
        icon: '📊',
        title: 'Spending Distribution',
        message: `${topCategory[0]} accounts for ${topCategoryPercentage.toFixed(0)}% of your spending`,
        tip: topCategoryPercentage > 50 ? 'Consider diversifying your spending across categories' : 'Good balance in your spending categories',
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
      <StatusBar style="dark" />
      <GlobalBackground />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>Stay updated with your budget</Text>
          {notificationPermission !== 'granted' && (
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestNotificationPermissions}
              activeOpacity={0.7}
            >
              <Text style={styles.permissionButtonText}>🔔 Enable Push Notifications</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          {notifications.length > 0 && (
            <TouchableOpacity
              style={styles.clearAllButton}
              onPress={clearAllNotifications}
              activeOpacity={0.7}
            >
              <Text style={styles.clearAllButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔔 Alerts & Reminders</Text>
            <Text style={styles.sectionSubtitle}>
              {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
            </Text>
          </View>

          {notifications.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconContainer}>
                <Text style={styles.emptyIcon}>✓</Text>
              </View>
              <Text style={styles.emptyTitle}>All Good!</Text>
              <Text style={styles.emptyText}>
                You're on track with your budget. Keep up the good work!
              </Text>
            </View>
          ) : (
            notifications.map((notif) => (
              <View key={notif.id} style={[styles.notifCard, { borderLeftColor: notif.color }]}>
                <View style={styles.notifHeader}>
                  <View style={[styles.notifIconContainer, { backgroundColor: `${notif.color}15` }]}>
                    <Text style={styles.notifIcon}>{notif.icon}</Text>
                  </View>
                  <View style={styles.notifContent}>
                    <Text style={styles.notifTitle}>{notif.title}</Text>
                    <Text style={styles.notifMessage}>{notif.message}</Text>
                    <Text style={styles.notifTime}>
                      {new Date(notif.timestamp).toLocaleTimeString('en-PH', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.dismissButton}
                    onPress={() => dismissNotification(notif.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dismissButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Insights Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>💡 Spending Insights</Text>
            <Text style={styles.sectionSubtitle}>Weekly analysis</Text>
          </View>

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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎯 Weekly Challenges</Text>
            <Text style={styles.sectionSubtitle}>Save more money</Text>
          </View>

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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🧠 Smart Money Tips</Text>
            <Text style={styles.sectionSubtitle}>For students</Text>
          </View>

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

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  permissionButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  clearAllButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  clearAllButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyCard: {
    backgroundColor: '#fff',
    padding: 48,
    borderRadius: 24,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 48,
    color: '#10B981',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  notifCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    borderLeftWidth: 5,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notifIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notifIcon: {
    fontSize: 28,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  notifMessage: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 8,
  },
  notifTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  dismissButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  dismissButtonText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  insightCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  insightMessage: {
    fontSize: 15,
    color: '#4B5563',
    marginBottom: 16,
    lineHeight: 22,
  },
  tipBox: {
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  tipLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginRight: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#4F46E5',
    flex: 1,
    lineHeight: 20,
  },
  challengeCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  challengeIcon: {
    fontSize: 48,
    marginRight: 20,
  },
  challengeContent: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  challengeDesc: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  challengeReward: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
  },
  tipsCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tipNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4F46E5',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 36,
    marginRight: 16,
  },
  tipContent: {
    flex: 1,
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  tipBold: {
    fontWeight: 'bold',
    color: '#1F2937',
  },
});
