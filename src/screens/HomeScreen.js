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

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [totalAllowance, setTotalAllowance] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [savings, setSavings] = useState(0);
  const [budgetWarnings, setBudgetWarnings] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  
  // Animation values
  const menuSlideAnim = useRef(new Animated.Value(-width)).current;
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

  useEffect(() => {
    loadTransactions();
    const unsubscribe = navigation.addListener('focus', () => {
      loadTransactions();
    });
    return unsubscribe;
  }, [navigation]);

  const openMenu = () => {
    setShowMenu(true);
    
    // Animate menu slide in
    Animated.parallel([
      Animated.timing(menuSlideAnim, {
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

  const closeMenu = () => {
    // Animate menu slide out
    Animated.parallel([
      Animated.timing(menuSlideAnim, {
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
      setShowMenu(false);
      // Reset menu item animations
      menuItemAnimations.forEach(anim => {
        anim.setValue(0);
      });
    });
  };

  const loadTransactions = async () => {
    try {
      const stored = await AsyncStorage.getItem('transactions');
      const transactions = stored ? JSON.parse(stored) : [];
      setTransactions(transactions);
      await calculateStats(transactions);
      await checkBudgetWarnings(transactions);
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

  const calculateStats = async (txns) => {
    try {
      // Get allowance from budget data instead of transactions
      const budgetData = await AsyncStorage.getItem('budgets');
      let weeklyAllowance = 0;
      
      if (budgetData) {
        const parsed = JSON.parse(budgetData);
        weeklyAllowance = parseFloat(parsed.weeklyAllowance) || 0;
      }
      
      const spent = txns
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Calculate savings as leftover allowance after spending
      const savingsAmount = Math.max(0, weeklyAllowance - spent);
      
      const currentBalance = weeklyAllowance - spent;
      
      setTotalAllowance(weeklyAllowance);
      setTotalSpent(spent);
      setSavings(savingsAmount);
      setBalance(currentBalance);
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
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
              await calculateStats(updated);
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={showMenu ? closeMenu : openMenu}
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
            <Animated.View 
              style={[
                styles.hamburgerLine,
                {
                  transform: [{
                    rotate: hamburgerRotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '45deg'],
                    })
                  }]
                }
              ]} 
            />
            <Animated.View 
              style={[
                styles.hamburgerLine,
                {
                  opacity: hamburgerRotateAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 0, 0],
                  })
                }
              ]} 
            />
            <Animated.View 
              style={[
                styles.hamburgerLine,
                {
                  transform: [{
                    rotate: hamburgerRotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '-45deg'],
                    })
                  }]
                }
              ]} 
            />
          </Animated.View>
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Budget</Text>
          <Text style={styles.headerSubtitle}>SHS Student Edition</Text>
        </View>
      </View>

      {/* Hamburger Menu Overlay */}
      {showMenu && (
        <View style={styles.menuOverlay}>
          <Animated.View 
            style={[
              styles.menuBackdrop,
              { opacity: backdropOpacityAnim }
            ]}
          >
            <TouchableOpacity 
              style={styles.backdropTouchable}
              onPress={closeMenu}
            />
          </Animated.View>
          <Animated.View 
            style={[
              styles.menuContent,
              {
                transform: [{ translateX: menuSlideAnim }]
              }
            ]}
          >
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menu</Text>
              <TouchableOpacity onPress={closeMenu}>
                <Animated.Text 
                  style={[
                    styles.menuClose,
                    {
                      transform: [{
                        rotate: hamburgerRotateAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '180deg'],
                        })
                      }]
                    }
                  ]}
                >
                  ✕
                </Animated.Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.menuItems}>
              <Animated.View
                style={[
                  styles.menuItem,
                  {
                    opacity: menuItemAnimations[0],
                    transform: [{
                      translateX: menuItemAnimations[0].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 0],
                      })
                    }]
                  }
                ]}
              >
                <TouchableOpacity 
                  style={styles.menuItemTouchable}
                  onPress={() => {
                    closeMenu();
                    navigation.navigate('AddTransaction');
                  }}
                >
                  <Text style={styles.menuIcon}>➕</Text>
                  <Text style={styles.menuText}>Add Transaction</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View
                style={[
                  styles.menuItem,
                  {
                    opacity: menuItemAnimations[1],
                    transform: [{
                      translateX: menuItemAnimations[1].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 0],
                      })
                    }]
                  }
                ]}
              >
                <TouchableOpacity 
                  style={styles.menuItemTouchable}
                  onPress={() => {
                    closeMenu();
                    navigation.navigate('BudgetPlanner');
                  }}
                >
                  <Text style={styles.menuIcon}>📋</Text>
                  <Text style={styles.menuText}>Budget Planner</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View
                style={[
                  styles.menuItem,
                  {
                    opacity: menuItemAnimations[2],
                    transform: [{
                      translateX: menuItemAnimations[2].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 0],
                      })
                    }]
                  }
                ]}
              >
                <TouchableOpacity 
                  style={styles.menuItemTouchable}
                  onPress={() => {
                    closeMenu();
                    navigation.navigate('Statistics');
                  }}
                >
                  <Text style={styles.menuIcon}>📊</Text>
                  <Text style={styles.menuText}>Statistics</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View
                style={[
                  styles.menuItem,
                  {
                    opacity: menuItemAnimations[3],
                    transform: [{
                      translateX: menuItemAnimations[3].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 0],
                      })
                    }]
                  }
                ]}
              >
                <TouchableOpacity 
                  style={styles.menuItemTouchable}
                  onPress={() => {
                    closeMenu();
                    navigation.navigate('Notifications');
                  }}
                >
                  <Text style={styles.menuIcon}>🔔</Text>
                  <Text style={styles.menuText}>Alerts & Tips</Text>
                  {budgetWarnings.length > 0 && (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{budgetWarnings.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>

              <Animated.View
                style={[
                  styles.menuItem,
                  {
                    opacity: menuItemAnimations[4],
                    transform: [{
                      translateX: menuItemAnimations[4].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 0],
                      })
                    }]
                  }
                ]}
              >
                <TouchableOpacity 
                  style={styles.menuItemTouchable}
                  onPress={() => {
                    closeMenu();
                    navigation.navigate('Settings');
                  }}
                >
                  <Text style={styles.menuIcon}>⚙️</Text>
                  <Text style={styles.menuText}>Settings</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View
                style={[
                  styles.menuDivider,
                  {
                    opacity: menuItemAnimations[4],
                  }
                ]}
              />

              <Animated.View
                style={[
                  styles.menuItem,
                  styles.menuItemDanger,
                  {
                    opacity: menuItemAnimations[5],
                    transform: [{
                      translateX: menuItemAnimations[5].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 0],
                      })
                    }]
                  }
                ]}
              >
                <TouchableOpacity 
                  style={styles.menuItemTouchable}
                  onPress={() => {
                    closeMenu();
                    Alert.alert(
                      'Clear All Data',
                      'This will delete all your data. Are you sure?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Clear All',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await AsyncStorage.clear();
                              Alert.alert('Success', 'All data cleared!');
                            } catch (error) {
                              Alert.alert('Error', 'Failed to clear data');
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Text style={styles.menuIcon}>🗑️</Text>
                  <Text style={[styles.menuText, styles.menuTextDanger]}>Clear All Data</Text>
                </TouchableOpacity>
              </Animated.View>
            </ScrollView>
          </Animated.View>
        </View>
      )}

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
            <Text style={styles.statLabel}>Weekly Allowance</Text>
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
            <Text style={styles.emptySubtext}>Set up your budget and add expenses</Text>
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
  header: {
    backgroundColor: '#4F46E5',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuButton: {
    padding: 8,
    marginRight: 12,
  },
  hamburger: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    height: 3,
    backgroundColor: '#fff',
    borderRadius: 2,
    transition: 'all 0.3s ease',
  },
  hamburgerLineActive: {
    backgroundColor: '#E0E7FF',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
  },
  menuContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '80%',
    height: '100%',
    backgroundColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  menuHeader: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  menuClose: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: '300',
  },
  menuItems: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 30,
  },
  menuText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  menuItemDanger: {
    backgroundColor: '#FEF2F2',
  },
  menuTextDanger: {
    color: '#DC2626',
  },
  menuBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  menuBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
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
});

