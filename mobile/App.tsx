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
import { login, getProducts, getCustomers, recordVisit } from './src/utils/api';
import { getCurrentLocation, calculateDistance, validateVisit } from './src/utils/location';

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
  const [screen, setScreen] = useState('login'); // login, visits, catalog, order
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  useEffect(() => {
    if (screen === 'catalog') {
      fetchProducts();
    } else if (screen === 'visits') {
      fetchParties();
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

  const fetchParties = async () => {
    setLoading(true);
    try {
      const data = await getCustomers();
      setParties(data);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to fetch customer list');
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
      setScreen('visits');
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (party: any) => {
    setCheckingIn(party.id);
    try {
      const location = await getCurrentLocation();
      if (!location) {
        setCheckingIn(null);
        return;
      }

      // Shop coordinates (if any) - in a real app, these are in the DB
      // If shop has no coords, we allow check-in but mark as VERIFIED for now
      // Let's assume some pharmacies have coords for the demo of the tracker
      const shopCoords = party.lat && party.lng ? { latitude: party.lat, longitude: party.lng } : null;

      let isValid = true;
      let distance = 0;

      if (shopCoords) {
        distance = calculateDistance(location, shopCoords);
        isValid = distance <= 500; // 500m radius
      }

      // Prepare sync data
      const syncData = {
        customerId: party.id,
        latitude: location.latitude,
        longitude: location.longitude,
        distance: distance || 0,
        status: isValid ? "VERIFIED" : "MISMATCH"
      };

      // Record visit in Backend
      await recordVisit(syncData);

      if (isValid) {
        Alert.alert('Visit Verified', `Checked in at ${party.name}`, [
          { text: 'Start Order', onPress: () => setScreen('catalog') }
        ]);
      } else {
        Alert.alert(
          'Location Mismatch',
          `You are too far from ${party.name}.\nDistance: ${Math.round(distance)}m\n\nVisit recorded as MISMATCH for admin review.`,
          [{ text: 'OK', style: 'cancel' }]
        );
      }

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not verify location');
    } finally {
      setCheckingIn(null);
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

  const renderVisits = () => (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.mainHeader}>
        <View>
          <Text style={styles.headerWelcome}>Field Force</Text>
          <Text style={styles.headerMainTitle}>Customer Visits</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => setScreen('login')}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Syncing Customers...</Text>
        </View>
      ) : (
        <FlatList
          data={parties}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              <View style={styles.cardLeft}>
                <Text style={styles.inputLabel}>CLIENT</Text>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.subtitle}>{item.address || 'No Address Listed'}</Text>
                <Text style={[styles.subtitle, { color: COLORS.primary }]}>{item.phone || ''}</Text>
              </View>
              <TouchableOpacity
                style={[styles.orderAddBtn, { width: 100, backgroundColor: COLORS.primary }]}
                onPress={() => handleCheckIn(item)}
                disabled={checkingIn === item.id}
              >
                {checkingIn === item.id ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={[styles.orderAddText, { fontSize: 14, color: 'white' }]}>Check In</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No customers synced yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );

  const renderCatalog = () => (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.mainHeader}>
        <View>
          <Text style={styles.headerWelcome}>Order Mode</Text>
          <Text style={styles.headerMainTitle}>Product Catalog</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => setScreen('visits')}>
          <Text style={styles.logoutBtnText}>Exit</Text>
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
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.productCard} onPress={() => setScreen('order')}>
              <View style={styles.cardLeft}>
                <View style={[styles.categoryBadge, { backgroundColor: COLORS.primaryLight }]}>
                  <Text style={[styles.categoryText, { color: COLORS.primary }]}>
                    {item.company || 'Medicine'}
                  </Text>
                </View>
                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.productStock}>
                  MRP: <Text style={{ fontWeight: 'bold' }}>₹{item.mrp}</Text>
                </Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.priceTag}>₹{(item.mrp * 0.9).toFixed(2)}</Text>
                <View style={styles.orderAddBtn}>
                  <Text style={styles.orderAddText}>+</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
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
          <Text style={styles.orderLabel}>Order Details</Text>
          <View style={styles.cartCard}>
            <Text style={styles.cartTitle}>Item Selection</Text>
            <Text style={styles.subtitle}>Selected item details will appear here</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={() => {
          Alert.alert("Order Received", "The order has been sent to the billing desk for processing.", [
            { text: "OK", onPress: () => setScreen('visits') }
          ]);
        }}>
          <Text style={styles.submitBtnText}>Confirm Order</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  if (screen === 'login') return renderLogin();
  if (screen === 'visits') return renderVisits();
  if (screen === 'catalog') return renderCatalog();
  if (screen === 'order') return renderOrder();

  return null;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  loginContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', padding: SPACING.xl },
  loginHeader: { alignItems: 'center', marginBottom: SPACING.xl },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md, elevation: 8 },
  logoText: { color: COLORS.white, fontSize: 40, fontWeight: '900' },
  title: { fontSize: isSmallDevice ? 24 : 32, fontWeight: '900', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  cardContainer: { backgroundColor: COLORS.white, borderRadius: 24, padding: SPACING.lg, elevation: 4 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.lg, textAlign: 'center' },
  inputWrapper: { marginBottom: SPACING.md },
  inputLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textLight, marginBottom: 4, textTransform: 'uppercase' },
  input: { height: 52, backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: SPACING.md, fontSize: 16, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  loginBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: SPACING.md },
  btnDisabled: { opacity: 0.7 },
  loginBtnText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  footerText: { textAlign: 'center', marginTop: SPACING.xl, color: COLORS.textLight, fontSize: 12 },
  mainHeader: { backgroundColor: COLORS.primary, paddingTop: Platform.OS === 'ios' ? 40 : 40, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerWelcome: { color: COLORS.primaryLight, fontSize: 14 },
  headerMainTitle: { color: COLORS.white, fontSize: 24, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  searchSection: { paddingHorizontal: SPACING.lg, marginTop: -25 },
  searchBar: { backgroundColor: COLORS.white, height: 50, borderRadius: 15, paddingHorizontal: SPACING.md, flexDirection: 'row', alignItems: 'center', elevation: 10 },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.text },
  listContent: { padding: SPACING.lg, paddingTop: SPACING.md },
  productCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: SPACING.md, marginBottom: SPACING.md, flexDirection: 'row', elevation: 2 },
  cardLeft: { flex: 1 },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 6 },
  categoryText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  productName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  productStock: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },
  cardRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  priceTag: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  orderAddBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  orderAddText: { color: COLORS.primary, fontSize: 20, fontWeight: 'bold' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: COLORS.textLight },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: COLORS.textLight },
  orderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  orderTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  backBtn: { paddingVertical: 8, paddingRight: 16 },
  backBtnText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  orderBody: { padding: SPACING.lg },
  orderSection: { marginBottom: SPACING.xl },
  orderLabel: { fontSize: 14, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  orderInput: { backgroundColor: COLORS.white, height: 52, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16 },
  cartCard: { backgroundColor: '#334155', borderRadius: 20, padding: SPACING.lg, marginBottom: SPACING.lg },
  cartTitle: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  submitBtn: { backgroundColor: COLORS.success, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  submitBtnText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' }
});
