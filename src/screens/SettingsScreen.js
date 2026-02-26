import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import GlobalBackground from '../components/GlobalBackground';

/**
 * SettingsScreen allows users to manage their data and app preferences.
 * Features:
 * 1. Data clearing (Reset all transactions and budgets)
 * 2. Profile/Student info display
 * 3. App version and credits
 * 4. Help and Logout placeholders
 */
export default function SettingsScreen({ navigation }) {
  // --- STATE MANAGEMENT ---
  const [isClearing, setIsClearing] = useState(false); // Loading state for data reset
  const [userName, setUserName] = useState('Student'); // User's name for profile
  const [studentYear, setStudentYear] = useState('SHS Student'); // User's student year/level for profile

  const fadeAnim = useState(new Animated.Value(0))[0]; // Screen entrance animation

  /**
   * Screen entrance animation
   */
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  /**
   * Resets all application data stored in AsyncStorage
   */
  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to delete all your transactions, budgets, and reset the app? This cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsClearing(true);
              await AsyncStorage.clear();
              Alert.alert('Success', 'All data cleared! Please restart the app.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Deletes only transaction history
   */
  const handleClearTransactions = () => {
    Alert.alert(
      'Clear Transactions',
      'Delete all transaction history? Your budget settings will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
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

  /**
   * Deletes only budget configurations
   */
  const handleClearBudgets = () => {
    Alert.alert(
      'Clear Budget Settings',
      'Delete all budget settings? Your transactions will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
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

  /**
   * Resets the onboarding flag to show welcome screens again
   */
  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding',
      'See the welcome screens again on next app start?',
      [
        { text: 'Cancel', style: 'cancel' },
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
      <StatusBar style="dark" />
      <GlobalBackground />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={[styles.mainView, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>Manage your profile & data</Text>
          </View>

          {/* Profile Section Placeholder */}
          <View style={styles.section}>
            <View style={styles.profileCard}>
              <View style={styles.profileIcon}><Text style={styles.profileEmoji}>👤</Text></View>
              <View>
                <Text style={styles.profileName}>{userName}</Text>
                <Text style={styles.profileSubtitle}>{studentYear}</Text>
              </View>
            </View>
          </View>

          {/* Data Management Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💾 Data Management</Text>

            <TouchableOpacity style={styles.menuItem} onPress={handleClearTransactions}>
              <Text style={styles.menuIcon}>📝</Text>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>Clear Transactions</Text>
                <Text style={styles.menuSubtitle}>Wipe spending history but keep budgets</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleClearBudgets}>
              <Text style={styles.menuIcon}>�</Text>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>Clear Budgets</Text>
                <Text style={styles.menuSubtitle}>Reset your daily/weekly limits</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleResetOnboarding}>
              <Text style={styles.menuIcon}>🔄</Text>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>Reset Onboarding</Text>
                <Text style={styles.menuSubtitle}>Re-run the initial setup guide</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Danger Zone */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>⚠️ Danger Zone</Text>
            <TouchableOpacity style={[styles.menuItem, styles.dangerItem]} onPress={handleClearAllData}>
              <Text style={styles.menuIcon}>🗑️</Text>
              <View style={styles.menuText}>
                <Text style={[styles.menuTitle, { color: '#DC2626' }]}>Factory Reset</Text>
                <Text style={styles.menuSubtitle}>Delete everything permanently</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ℹ️ About</Text>
            <View style={styles.aboutCard}>
              <Text style={styles.aboutInfo}>Budget Management System for SHS Students</Text>
              <Text style={styles.teamTitle}>Development Team:</Text>
              <Text style={styles.teamMember}>• Aaliah Canoy Manduriao (Leader)</Text>
              <Text style={styles.teamMember}>• Roshell Ann Decapeda Dela Cruz</Text>
              <Text style={styles.teamMember}>• Lynard Bryan Alfonso Santos</Text>
              <Text style={styles.teamMember}>• Nash Andrei Remojo Castro</Text>
              <Text style={styles.version}>Version 1.0.0</Text>
            </View>
          </View>

        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  mainView: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, marginBottom: 20 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#1F2937' },
  headerSubtitle: { fontSize: 16, color: '#6B7280' },
  section: { marginHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 20, elevation: 4 },
  profileIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  profileEmoji: { fontSize: 24 },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  profileSubtitle: { fontSize: 14, color: '#6B7280' },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 10, elevation: 2 },
  menuIcon: { fontSize: 24, marginRight: 15 },
  menuText: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  menuSubtitle: { fontSize: 12, color: '#9CA3AF' },
  arrow: { fontSize: 20, color: '#D1D5DB' },
  dangerItem: { borderColor: '#FEE2E2', borderWidth: 1 },
  aboutCard: { backgroundColor: '#fff', padding: 20, borderRadius: 20, elevation: 2 },
  aboutInfo: { fontSize: 14, fontWeight: 'bold', color: '#4F46E5', marginBottom: 10 },
  teamTitle: { fontSize: 13, fontWeight: 'bold', color: '#374151', marginBottom: 5 },
  teamMember: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  version: { fontSize: 12, color: '#D1D5DB', marginTop: 15, textAlign: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
});
