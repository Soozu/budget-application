import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import GlobalBackground from '../components/GlobalBackground';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

/**
 * HomeScreen is the main dashboard of the application.
 * It displays:
 * 1. Current balance (Allowance - Expenses)
 * 2. Weekly spending and savings statistics
 * 3. Savings goal progress
 * 4. Recent transactions list
 * 5. Quick actions for navigation
 */
export default function HomeScreen({ navigation }) {
  // --- STATE MANAGEMENT ---
  const [balance, setBalance] = useState(0); // Total remaining money
  const [spentToday, setSpentToday] = useState(0); // Expenses for the current day
  const [spentThisWeek, setSpentThisWeek] = useState(0); // Expenses for the last 7 days
  const [transactions, setTransactions] = useState([]); // List of all expense logs
  const [isMenuVisible, setIsMenuVisible] = useState(false); // Sidebar menu toggle
  const [dailyAllowance, setDailyAllowance] = useState(0); // User's daily income
  const [weeklyAllowance, setWeeklyAllowance] = useState(0); // User's weekly income
  const [savingsGoal, setSavingsGoal] = useState(0); // Savings target amount
  const [currentSavings, setCurrentSavings] = useState(0); // Calculated savings for the week
  const [budgetWarnings, setBudgetWarnings] = useState([]); // List of categories over or near budget
  const [greeting, setGreeting] = useState('Welcome!'); // Time-based greeting message

  // --- ANIMATION VALUES ---
  const fadeAnim = useState(new Animated.Value(0))[0]; // Animation for screen entrance
  const menuAnim = useState(new Animated.Value(-width))[0]; // Animation for sliding sidebar menu
  const balanceAnim = useState(new Animated.Value(0))[0]; // Animation for balance card spring effect
  const backdropOpacityAnim = useRef(new Animated.Value(0)).current;
  const hamburgerRotateAnim = useRef(new Animated.Value(0)).current;
  const menuItemAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  /**
   * Refresh data whenever the home screen comes into focus
   */
  useFocusEffect(
    React.useCallback(() => {
      loadData();
      updateGreeting();

      // Entrance animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, [])
  );

  /**
   * Sets a greeting based on the current time of day
   */
  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good Morning!');
    } else if (hour < 18) {
      setGreeting('Good Afternoon!');
    } else {
      setGreeting('Good Evening!');
    }
  };

  /**
   * Opens the sidebar menu with animations.
   */
  const openMenu = () => {
    setIsMenuVisible(true);

    // Animate menu slide in
    Animated.parallel([
      Animated.timing(menuAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(hamburgerRotateAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Stagger menu items animation
    menuItemAnimations.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 200,
        delay: index * 50,
        useNativeDriver: true,
      }).start();
    });
  };

  /**
   * Closes the sidebar menu with animations.
   */
  const closeMenu = () => {
    // Animate menu slide out
    Animated.parallel([
      Animated.timing(menuAnim, {
        toValue: -width,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(hamburgerRotateAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsMenuVisible(false);
      // Reset menu item animations
      menuItemAnimations.forEach(anim => {
        anim.setValue(0);
      });
    });
  };

  /**
   * Loads all necessary budgeting and transaction data from storage
   */
  const loadData = async () => {
    try {
      // Fetch stored data
      const [storedTransactions, storedBudgets] = await Promise.all([
        AsyncStorage.getItem('transactions'),
        AsyncStorage.getItem('budgets'),
      ]);

      const txns = storedTransactions ? JSON.parse(storedTransactions) : [];
      const budgets = storedBudgets ? JSON.parse(storedBudgets) : null;

      setTransactions(txns);
      if (budgets) {
        setDailyAllowance(parseFloat(budgets.dailyAllowance) || 0);
        setWeeklyAllowance(parseFloat(budgets.weeklyAllowance) || 0);
        setSavingsGoal(parseFloat(budgets.savingsGoal) || 0);
      }

      calculateFinancials(txns, budgets);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  /**
   * Main logic for calculating balances, spending, and warnings
   * @param {Array} txns - List of all transactions
   * @param {Object} budgets - Budget settings object
   */
  const calculateFinancials = async (txns, budgets) => {
    try {
      let weeklyAllowanceVal = 0;
      let dailyAllowanceVal = 0;
      let goal = 0;

      if (budgets) {
        weeklyAllowanceVal = parseFloat(budgets.weeklyAllowance) || 0;
        dailyAllowanceVal = parseFloat(budgets.dailyAllowance) || 0;
        goal = parseFloat(budgets.savingsGoal) || 0;
      }

      // Calculate weekly spending (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const weeklySpent = txns
        .filter((t) => t.type === 'expense' && new Date(t.timestamp) >= weekAgo)
        .reduce((sum, t) => sum + t.amount, 0);
      setSpentThisWeek(weeklySpent);

      // Calculate daily spending (today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dailySpent = txns
        .filter((t) => t.type === 'expense' && new Date(t.timestamp) >= today)
        .reduce((sum, t) => sum + t.amount, 0);
      setSpentToday(dailySpent);

      // Current balance calculation
      const currentBalance = weeklyAllowanceVal - weeklySpent;
      setBalance(currentBalance);

      // Savings calculation (excess budget)
      const savingsAmount = Math.max(0, weeklyAllowanceVal - weeklySpent);
      setCurrentSavings(savingsAmount);

      // Check budget warnings for categories
      const warnings = [];
      if (budgets && budgets.categories) {
        const budgetCategories = budgets.categories;
        const weeklySpendingByCategory = {};

        txns
          .filter((t) => t.type === 'expense' && new Date(t.timestamp) >= weekAgo)
          .forEach((t) => {
            const categoryKey = getCategoryKey(t.category);
            weeklySpendingByCategory[categoryKey] = (weeklySpendingByCategory[categoryKey] || 0) + t.amount;
          });

        Object.entries(budgetCategories).forEach(([key, budget]) => {
          const catSpent = weeklySpendingByCategory[key] || 0;
          const catDailyBudget = parseFloat(budget) || 0;
          const catWeeklyBudget = catDailyBudget * 7;

          if (catDailyBudget > 0 && catSpent >= catWeeklyBudget * 0.8) {
            const percentage = (catSpent / catWeeklyBudget * 100).toFixed(0);
            warnings.push({
              category: getCategoryLabel(key),
              percentage,
              isOver: catSpent >= catWeeklyBudget,
            });
          }
        });
      }
      setBudgetWarnings(warnings);

      // Animate the balance card if there's data
      Animated.spring(balanceAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start(() => {
        balanceAnim.setValue(0);
      });

    } catch (error) {
      console.error('Error calculating financials:', error);
    }
  };

  /**
   * Maps a user-friendly category name to its internal key.
   * @param {string} category - The user-friendly category name.
   * @returns {string} The internal key for the category.
   */
  const getCategoryKey = (category) => {
    const mapping = {
      'Transportation': 'transportation',
      'Food & Snacks': 'food',
      'School Supplies': 'supplies',
      'Load/Data': 'load',
      'Projects': 'projects',
      'Savings': 'savings',
      'Entertainment': 'entertainment',
    };
    return mapping[category] || 'other';
  };

  /**
   * Maps an internal category key to its user-friendly label.
   * @param {string} key - The internal category key.
   * @returns {string} The user-friendly label for the category.
   */
  const getCategoryLabel = (key) => {
    const mapping = {
      'transportation': 'Transportation',
      'food': 'Food & Snacks',
      'supplies': 'School Supplies',
      'load': 'Load/Data',
      'projects': 'Projects',
      'savings': 'Savings',
      'entertainment': 'Entertainment',
    };
    return mapping[key] || 'Other';
  };

  /**
   * Returns an emoji icon for a given category.
   * @param {string} category - The category name.
   * @returns {string} An emoji representing the category.
   */
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

  /**
   * Deletes a transaction from local storage and updates the state.
   */
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
              const currentTxns = await AsyncStorage.getItem('transactions');
              const txns = currentTxns ? JSON.parse(currentTxns) : [];
              const updated = txns.filter((txn) => txn.id !== id);
              await AsyncStorage.setItem('transactions', JSON.stringify(updated));

              setTransactions(updated);
              const storedBudgets = await AsyncStorage.getItem('budgets');
              calculateFinancials(updated, storedBudgets ? JSON.parse(storedBudgets) : null);
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert('Error', 'Failed to delete transaction');
            }
          },
        },
      ]
    );
  };

  /**
   * Renders a single transaction card.
   */
  const renderTransaction = ({ item, index }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{
          translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          }),
        }],
      }}
    >
      <TouchableOpacity
        style={styles.transactionCard}
        onLongPress={() => handleDeleteTransaction(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.transactionLeft}>
          <View style={styles.categoryIconContainer}>
            <Text style={styles.categoryIconEmoji}>
              {getCategoryIcon(item.category)}
            </Text>
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionTitle} numberOfLines={1}>
              {item.category === 'Other' ? item.title : item.category}
            </Text>
            <Text style={styles.transactionDate}>{item.date}</Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text
            style={[
              styles.transactionAmount,
              { color: item.type === 'income' ? '#10B981' : '#EF4444' },
            ]}
          >
            {item.type === 'income' ? '+' : '-'}₱{item.amount.toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <GlobalBackground />

      {/* Header UI */}
      <View style={[styles.header, { zIndex: 2 }]}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={isMenuVisible ? closeMenu : openMenu}
        >
          <Animated.View
            style={[
              styles.hamburger,
              {
                transform: [{
                  rotate: hamburgerRotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '90deg'],
                  })
                }]
              }
            ]}
          >
            <Animated.View style={[styles.hamburgerLine, { transform: [{ rotate: hamburgerRotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] }]} />
            <Animated.View style={[styles.hamburgerLine, { opacity: hamburgerRotateAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] }) }]} />
            <Animated.View style={[styles.hamburgerLine, { transform: [{ rotate: hamburgerRotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-45deg'] }) }] }]} />
          </Animated.View>
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Budget</Text>
          <Text style={styles.headerSubtitle}>SHS Student Edition</Text>
        </View>
      </View>

      {/* Sidebar Menu Component */}
      {isMenuVisible && (
        <View style={styles.menuOverlay}>
          <Animated.View style={[styles.menuBackdrop, { opacity: backdropOpacityAnim }]}>
            <TouchableOpacity style={styles.backdropTouchable} onPress={closeMenu} />
          </Animated.View>
          <Animated.View style={[styles.menuContent, { transform: [{ translateX: menuAnim }] }]}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menu</Text>
              <TouchableOpacity onPress={closeMenu}>
                <Text style={styles.menuClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.menuItems}>
              {[
                { name: 'Add Transaction', icon: '➕', target: 'AddTransaction' },
                { name: 'Budget Planner', icon: '📋', target: 'BudgetPlanner' },
                { name: 'Statistics', icon: '📊', target: 'Statistics' },
                { name: 'Alerts & Tips', icon: '🔔', target: 'Notifications' },
                { name: 'Settings', icon: '⚙️', target: 'Settings' },
              ].map((item, index) => (
                <Animated.View key={index} style={[styles.menuItem, { opacity: menuItemAnimations[index], transform: [{ translateX: menuItemAnimations[index].interpolate({ inputRange: [0, 1], outputRange: [-50, 0] }) }] }]}>
                  <TouchableOpacity style={styles.menuItemTouchable} onPress={() => { closeMenu(); navigation.navigate(item.target); }}>
                    <Text style={styles.menuIcon}>{item.icon}</Text>
                    <Text style={styles.menuText}>{item.name}</Text>
                    {item.target === 'Notifications' && !!(budgetWarnings.length > 0) && (
                      <View style={styles.menuBadge}>
                        <Text style={styles.menuBadgeText}>{budgetWarnings.length}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              ))}

              <View style={styles.menuDivider} />

              <Animated.View style={[styles.menuItem, styles.menuItemDanger, { opacity: menuItemAnimations[5], transform: [{ translateX: menuItemAnimations[5].interpolate({ inputRange: [0, 1], outputRange: [-50, 0] }) }] }]}>
                <TouchableOpacity style={styles.menuItemTouchable} onPress={() => {
                  closeMenu();
                  Alert.alert('Clear All Data', 'This will delete all your data. Are you sure?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear All', style: 'destructive', onPress: async () => { await AsyncStorage.clear(); Alert.alert('Success', 'All data cleared!'); loadData(); } }
                  ]);
                }}>
                  <Text style={styles.menuIcon}>🗑️</Text>
                  <Text style={[styles.menuText, styles.menuTextDanger]}>Clear All Data</Text>
                </TouchableOpacity>
              </Animated.View>
            </ScrollView>
          </Animated.View>
        </View>
      )}

      {/* Main Content Area */}
      <ScrollView
        style={[styles.scrollView, { zIndex: 1 }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Budget Alerts */}
        {!!(budgetWarnings.length > 0) && (
          <View style={styles.warningContainer}>
            {budgetWarnings.map((warning, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.warningCard, { backgroundColor: warning.isOver ? '#FEE2E2' : '#FEF3C7' }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('BudgetPlanner')}
              >
                <Text style={styles.warningIcon}>{warning.isOver ? '⚠️' : '⚡'}</Text>
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>{warning.isOver ? 'Over Budget!' : 'Budget Alert'}</Text>
                  <Text style={styles.warningText}>{warning.category}: {warning.percentage}% used</Text>
                </View>
                <Text style={styles.warningArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Financial Summary Card */}
        <Animated.View style={[styles.balanceCard, { transform: [{ scale: balanceAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.05, 1] }) }] }]}>
          <View style={styles.balanceHeader}>
            <View>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={[styles.balanceAmount, { color: balance >= 0 ? '#10B981' : '#EF4444' }]}>
                ₱{Math.abs(balance).toFixed(2)}
              </Text>
            </View>
            <View style={styles.balanceIconContainer}>
              <Text style={styles.balanceIcon}>💰</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Statistics')}>
              <Text style={styles.statIcon}>💸</Text>
              <Text style={styles.statLabel}>Spent Today</Text>
              <Text style={styles.statValue}>₱{spentToday.toFixed(0)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Statistics')}>
              <Text style={styles.statIcon}>📈</Text>
              <Text style={styles.statLabel}>Spent Week</Text>
              <Text style={styles.statValue}>₱{spentThisWeek.toFixed(0)}</Text>
            </TouchableOpacity>
          </View>

          {/* Savings Progress Mini-Widget */}
          {!!(savingsGoal > 0) && (
            <View style={styles.savingsGoalContainer}>
              <View style={styles.savingsGoalHeader}>
                <Text style={styles.savingsGoalLabel}>Weekly Savings Goal</Text>
                <Text style={styles.savingsGoalAmount}>₱{savingsGoal.toFixed(0)}</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(100, (currentSavings / savingsGoal) * 100)}%`, backgroundColor: currentSavings >= savingsGoal ? '#10B981' : '#E0E7FF' }]} />
                </View>
                <Text style={styles.progressText}>{((currentSavings / savingsGoal) * 100).toFixed(0)}% Complete</Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => navigation.navigate('AddTransaction')}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#EEF2FF' }]}><Text style={styles.quickActionEmoji}>➕</Text></View>
            <Text style={styles.quickActionText}>Add Entry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => navigation.navigate('BudgetPlanner')}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#ECFDF5' }]}><Text style={styles.quickActionEmoji}>📋</Text></View>
            <Text style={styles.quickActionText}>Planner</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => navigation.navigate('Statistics')}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#F5F3FF' }]}><Text style={styles.quickActionEmoji}>📊</Text></View>
            <Text style={styles.quickActionText}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions List */}
        <View style={styles.transactionsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Statistics')}><Text style={styles.seeAllText}>See All →</Text></TouchableOpacity>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}><Text style={styles.emptyIcon}>🎓</Text></View>
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>Log your first expense to start tracking!</Text>
            </View>
          ) : (
            transactions.slice(0, 5).map((txn, index) => (
              <View key={txn.id}>{renderTransaction({ item: txn, index })}</View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Primary Action Button (Add) */}
      <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddTransaction')}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', position: 'relative' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  menuButton: { marginRight: 16 },
  hamburger: { width: 30, height: 24, justifyContent: 'space-between' },
  hamburgerLine: { height: 3, backgroundColor: '#1F2937', borderRadius: 2 },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  headerSubtitle: { fontSize: 14, color: '#6B7280' },
  menuOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  backdropTouchable: { flex: 1 },
  menuContent: { position: 'absolute', top: 0, left: 0, width: '80%', height: '100%', backgroundColor: '#fff', padding: 20 },
  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, paddingTop: 40 },
  menuTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  menuClose: { fontSize: 24, color: '#6B7280' },
  menuItems: { flex: 1 },
  menuItem: { marginBottom: 4 },
  menuItemTouchable: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  menuIcon: { fontSize: 24, marginRight: 16, width: 32 },
  menuText: { fontSize: 16, color: '#1F2937', flex: 1 },
  menuBadge: { backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  menuBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  menuDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  menuItemDanger: { marginTop: 'auto' },
  menuTextDanger: { color: '#EF4444' },
  balanceCard: { backgroundColor: '#fff', marginHorizontal: 20, padding: 24, borderRadius: 24, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, marginBottom: 24 },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  balanceLabel: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  balanceAmount: { fontSize: 36, fontWeight: 'bold' },
  balanceIconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  balanceIcon: { fontSize: 28 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: '#F9FAFB', padding: 16, borderRadius: 16, alignItems: 'center' },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  savingsGoalContainer: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  savingsGoalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  savingsGoalLabel: { fontSize: 13, color: '#6B7280' },
  savingsGoalAmount: { fontSize: 14, fontWeight: 'bold', color: '#1F2937' },
  progressBarContainer: { marginTop: 4 },
  progressBar: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  quickActionsContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 24 },
  quickActionButton: { flex: 1, alignItems: 'center' },
  quickActionIcon: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionEmoji: { fontSize: 28 },
  quickActionText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  transactionsContainer: { paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  seeAllText: { fontSize: 14, color: '#4F46E5', fontWeight: '600' },
  transactionCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderHeight: 1, borderColor: '#F3F4F6', borderWidth: 1 },
  transactionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  categoryIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  categoryIconEmoji: { fontSize: 24 },
  transactionInfo: { flex: 1 },
  transactionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  transactionDate: { fontSize: 12, color: '#9CA3AF' },
  transactionRight: { alignItems: 'flex-end' },
  transactionAmount: { fontSize: 18, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', padding: 40, backgroundColor: '#F9FAFB', borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#E5E7EB' },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  addButton: { position: 'absolute', bottom: 30, right: 30, width: 64, height: 64, borderRadius: 32, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
  addButtonText: { color: '#fff', fontSize: 36, fontWeight: '300', marginTop: -4 },
});
