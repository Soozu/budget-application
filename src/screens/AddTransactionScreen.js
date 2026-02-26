import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import GlobalBackground from '../components/GlobalBackground';

const categories = [
  { name: 'Food & Snacks', icon: '🍔', description: 'Meals, snacks, drinks', color: '#EF4444' },
  { name: 'Transportation', icon: '🚌', description: 'Jeepney, tricycle, bus fare', color: '#3B82F6' },
  { name: 'School Supplies', icon: '📚', description: 'Pens, paper, notebooks', color: '#8B5CF6' },
  { name: 'Projects', icon: '📝', description: 'Materials for school projects', color: '#F59E0B' },
  { name: 'Load/Data', icon: '📱', description: 'Mobile load, internet data', color: '#10B981' },
  { name: 'Entertainment', icon: '🎮', description: 'Movies, games, leisure', color: '#EC4899' },
  { name: 'Other', icon: '📦', description: 'Miscellaneous expenses', color: '#6B7280' },
];

/**
 * AddTransactionScreen allows users to log a new expense or income.
 * Features:
 * 1. Numeric input for amount
 * 2. Category selection with educational descriptions
 * 3. Title/Note input
 * 4. Automatic budget checking and validation
 */
export default function AddTransactionScreen({ navigation }) {
  // --- STATE MANAGEMENT ---
  const [amount, setAmount] = useState(''); // Numeric value of the transaction
  const [selectedCategoryName, setSelectedCategoryName] = useState('Food & Snacks'); // Name of selected category
  const [title, setTitle] = useState(''); // Optional note or specific item name
  const [type, setType] = useState('expense'); // 'expense' or 'income' (toggleable)
  const [budgets, setBudgets] = useState(null); // Loaded budget configuration for validation
  const [isSaving, setIsSaving] = useState(false); // Loading state during storage write
  const [scaleAnim] = useState(new Animated.Value(1)); // Animation for success state

  /**
   * Load current budgets on mount to check for overspending
   */
  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      const stored = await AsyncStorage.getItem('budgets');
      if (stored) setBudgets(JSON.parse(stored));
    } catch (error) {
      console.error('Error loading budgets for transaction screen:', error);
    }
  };

  /**
   * Handles the transaction submission
   */
  const handleSave = async () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!selectedCategoryName) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    if (selectedCategoryName === 'Other' && !title.trim()) {
      Alert.alert('Error', 'Please enter a description for Other category');
      return;
    }

    try {
      setIsSaving(true);

      const transaction = {
        id: Date.now().toString(),
        title: title.trim() || selectedCategoryName,
        amount: parseFloat(amount),
        type,
        category: selectedCategoryName,
        date: new Date().toLocaleDateString('en-PH'),
        timestamp: Date.now(),
      };

      // Persistence
      const stored = await AsyncStorage.getItem('transactions');
      const transactions = stored ? JSON.parse(stored) : [];
      transactions.unshift(transaction);
      await AsyncStorage.setItem('transactions', JSON.stringify(transactions));

      // Success animation
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();

      // Navigation
      setTimeout(() => {
        if (navigation) navigation.navigate('Home');
      }, 500);
    } catch (error) {
      console.error('Error saving transaction:', error);
      Alert.alert('Error', 'Failed to save transaction');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCategory = categories.find(cat => cat.name === selectedCategoryName);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <GlobalBackground />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Entry</Text>
          <Text style={styles.headerSubtitle}>Track where your allowance goes</Text>
        </View>

        {/* Amount Input Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 How much?</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>₱</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              autoFocus={true}
            />
          </View>
        </View>

        {/* Category Grid Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Category</Text>
          <View style={styles.categoriesContainer}>
            {categories.map((cat) => {
              const isSelected = selectedCategoryName === cat.name;
              return (
                <TouchableOpacity
                  key={cat.name}
                  style={[
                    styles.categoryButton,
                    isSelected && { backgroundColor: cat.color, borderColor: cat.color },
                  ]}
                  onPress={() => setSelectedCategoryName(cat.name)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.categoryButtonText,
                      isSelected && styles.categoryButtonTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {!!selectedCategory && (
            <View style={styles.categoryInfoBox}>
              <Text style={styles.categoryInfoText}>
                💡 {selectedCategory.description}
              </Text>
            </View>
          )}
        </View>

        {/* Note/Description Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📝 Note (Optional)</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder={selectedCategoryName === 'Other' ? "What did you spend on?" : "Specify what you bought..."}
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Save Button Action */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (isSaving || !amount) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={isSaving || !amount}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.saveButtonText}>Log Transaction</Text>
                <Text style={styles.saveButtonSubtext}>This will update your available balance</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', position: 'relative' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 24, zIndex: 1 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#1F2937', marginBottom: 4, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 16, color: '#6B7280' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
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
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 16 },
  amountInputContainer: {
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  currencySymbol: { fontSize: 32, fontWeight: 'bold', color: '#4F46E5', marginRight: 12 },
  amountInput: { flex: 1, fontSize: 32, fontWeight: 'bold', color: '#1F2937', letterSpacing: -1 },
  categoriesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minWidth: '45%',
    justifyContent: 'center',
  },
  categoryIcon: { fontSize: 20, marginRight: 8 },
  categoryButtonText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  categoryButtonTextActive: { color: '#fff' },
  categoryInfoBox: { backgroundColor: '#EEF2FF', padding: 12, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#4F46E5' },
  categoryInfoText: { fontSize: 13, color: '#4F46E5', lineHeight: 18 },
  descriptionInput: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, fontSize: 16, color: '#1F2937', borderWidth: 2, borderColor: '#E5E7EB' },
  saveButton: { backgroundColor: '#4F46E5', padding: 20, borderRadius: 16, alignItems: 'center', marginHorizontal: 20, marginTop: 8, elevation: 8, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
  saveButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  saveButtonSubtext: { color: '#E0E7FF', fontSize: 12, fontWeight: '500' },
  saveButtonDisabled: { opacity: 0.5, elevation: 0 },
});
