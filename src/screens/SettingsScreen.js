import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

export default function SettingsScreen() {
  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to delete all your transactions, budgets, and reset the app? This cannot be undone!',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Success', 'All data cleared! App will restart.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const handleClearTransactions = () => {
    Alert.alert(
      'Clear Transactions',
      'Delete all transaction history? Your budget settings will be kept.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('transactions');
              Alert.alert('Success', 'All transactions cleared!');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear transactions');
            }
          },
        },
      ]
    );
  };

  const handleClearBudgets = () => {
    Alert.alert(
      'Clear Budget Settings',
      'Delete all budget settings? Your transactions will be kept.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('budgets');
              Alert.alert('Success', 'Budget settings cleared!');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear budgets');
            }
          },
        },
      ]
    );
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding',
      'See the welcome screens again on next app start?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('hasLaunched');
              Alert.alert('Success', 'Close and reopen the app to see onboarding');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ App Settings</Text>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Data Management</Text>
            <Text style={styles.cardDescription}>
              Manage your stored data and reset the app
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Clear Data</Text>
          
          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleClearTransactions}
          >
            <View style={styles.optionIcon}>
              <Text style={styles.optionEmoji}>📝</Text>
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Clear Transactions</Text>
              <Text style={styles.optionDescription}>
                Delete all transaction history
              </Text>
            </View>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleClearBudgets}
          >
            <View style={styles.optionIcon}>
              <Text style={styles.optionEmoji}>💰</Text>
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Clear Budget Settings</Text>
              <Text style={styles.optionDescription}>
                Delete all budget configurations
              </Text>
            </View>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleResetOnboarding}
          >
            <View style={styles.optionIcon}>
              <Text style={styles.optionEmoji}>🎓</Text>
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Reset Onboarding</Text>
              <Text style={styles.optionDescription}>
                Show welcome screens again
              </Text>
            </View>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Danger Zone</Text>
          
          <TouchableOpacity
            style={[styles.optionButton, styles.dangerButton]}
            onPress={handleClearAllData}
          >
            <View style={styles.optionIcon}>
              <Text style={styles.optionEmoji}>🗑️</Text>
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, styles.dangerText]}>
                Clear All Data
              </Text>
              <Text style={styles.optionDescription}>
                Delete everything and reset app
              </Text>
            </View>
            <Text style={[styles.optionArrow, styles.dangerText]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            💡 Tip: Clearing data cannot be undone. Make sure you want to delete before confirming.
          </Text>
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
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  optionButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  optionIcon: {
    width: 44,
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionEmoji: {
    fontSize: 22,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  optionArrow: {
    fontSize: 28,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  dangerText: {
    color: '#DC2626',
  },
  infoSection: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 40,
    padding: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#4F46E5',
    lineHeight: 20,
  },
});

