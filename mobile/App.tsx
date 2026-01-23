import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { login, getProducts } from './src/utils/api';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

// Theme Constants
const COLORS = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#eff6ff',
  secondary: '#64748b',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  background: '#f8fafc',
  white: '#ffffff',
  text: '#1e293b',
  textLight: '#64748b',
  border: '#e2e8f0',
  glass: 'rgba(255, 255, 255, 0.8)'
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
};

export default function App() {
  const [screen, setScreen] = useState('login'); // login, catalog, order
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (screen === 'catalog') {
      fetchProducts();
    }
  }, [screen]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!user || !password) {
      Alert.alert('Error', 'Please enter your credentials');
      return;
    }

    setLoading(true);
    try {
      await login(user, password);
      setScreen('catalog');
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [products, searchQuery]);

  const renderLogin = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.loginContainer}
    >
      <View style={styles.loginHeader}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>P</Text>
        </View>
        <Text style={styles.title}>PharmaFlow Pro</Text>
        <Text style={styles.subtitle}>Unified Pharmaceutical Platform</Text>
      </View>

      <View style={styles.cardContainer}>
        <Text style={styles.cardTitle}>Sales Representative Login</Text>

        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. rep_001"
            value={user}
            onChangeText={setUser}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={[styles.loginBtn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.loginBtnText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>© 2026 Antigravity Medical Systems</Text>
    </KeyboardAvoidingView>
  );

  const renderCatalog = () => (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.mainHeader}>
        <View>
          <Text style={styles.headerWelcome}>Hello Rep,</Text>
          <Text style={styles.headerMainTitle}>Product Catalog</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => setScreen('login')}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicines, categories..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching Stock...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item: any) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.productCard} onPress={() => setScreen('order')}>
              <View style={styles.cardLeft}>
                <View style={[styles.categoryBadge, { backgroundColor: item.stock > 0 ? COLORS.primaryLight : COLORS.danger + '20' }]}>
                  <Text style={[styles.categoryText, { color: item.stock > 0 ? COLORS.primary : COLORS.danger }]}>
                    {item.category || 'General'}
                  </Text>
                </View>
                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.productStock}>
                  Available: <Text style={{ fontWeight: 'bold', color: item.stock > 10 ? COLORS.success : COLORS.danger }}>
                    {item.stock || 0}
                  </Text> {item.unit || 'Units'}
                </Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.priceTag}>₹{(item.sellingPrice || item.price || 0).toFixed(2)}</Text>
                <View style={styles.orderAddBtn}>
                  <Text style={styles.orderAddText}>+</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No matching products found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );

  const renderOrder = () => (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.orderHeader}>
        <TouchableOpacity onPress={() => setScreen('catalog')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.orderTitle}>New Order</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.orderBody}>
        <View style={styles.orderSection}>
          <Text style={styles.orderLabel}>Pharmacy Name</Text>
          <TextInput style={styles.orderInput} placeholder="Select Customer..." />
        </View>

        <View style={styles.cartCard}>
          <Text style={styles.cartTitle}>Order Summary</Text>
          <View style={styles.cartDivider} />
          <Text style={styles.emptyCartText}>No items added yet</Text>
          <View style={styles.cartDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text style={styles.totalAmount}>₹0.00</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.submitBtn}>
          <Text style={styles.submitBtnText}>Confirm Order</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  if (screen === 'login') return renderLogin();
  if (screen === 'catalog') return renderCatalog();
  if (screen === 'order') return renderOrder();

  return null;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loginContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  logoText: {
    color: COLORS.white,
    fontSize: 40,
    fontWeight: '900',
  },
  title: {
    fontSize: isSmallDevice ? 24 : 32,
    fontWeight: '900',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  cardContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: SPACING.lg,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  inputWrapper: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerText: {
    textAlign: 'center',
    marginTop: SPACING.xl,
    color: COLORS.textLight,
    fontSize: 12,
  },
  mainHeader: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerWelcome: {
    color: COLORS.primaryLight,
    fontSize: 14,
  },
  headerMainTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  logoutBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  searchSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: -25,
  },
  searchBar: {
    backgroundColor: COLORS.white,
    height: 50,
    borderRadius: 15,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  listContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
  },
  productCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardLeft: {
    flex: 1,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  productStock: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  priceTag: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },
  orderAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderAddText: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textLight,
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textLight,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  backBtn: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backBtnText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  orderBody: {
    padding: SPACING.lg,
  },
  orderSection: {
    marginBottom: SPACING.xl,
  },
  orderLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  orderInput: {
    backgroundColor: COLORS.white,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  cartCard: {
    backgroundColor: '#334155',
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  cartTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 12,
  },
  emptyCartText: {
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    paddingVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: COLORS.white,
    fontSize: 14,
  },
  totalAmount: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '900',
  },
  submitBtn: {
    backgroundColor: COLORS.success,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  }
});
