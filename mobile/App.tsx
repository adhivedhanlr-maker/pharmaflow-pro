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
  Platform,
  Linking
} from 'react-native';
import { login, getProducts, getCustomers, recordVisit, createOrder, createCustomer, createRequirement } from './src/utils/api';
import { getCurrentLocation, calculateDistance, validateVisit, startBackgroundTracking, stopBackgroundTracking } from './src/utils/location';


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
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [isDiscoverMode, setIsDiscoverMode] = useState(false);
  const [nearbyShops, setNearbyShops] = useState<any[]>([]);

  useEffect(() => {
    if (screen === 'catalog') {
      fetchProducts();
    } else if (screen === 'visits') {
      fetchParties();
    }
  }, [screen]);

  const fetchNearbyDiscovery = async () => {
    setLoading(true);
    try {
      const location = await getCurrentLocation();
      if (!location) return;

      // Overpass API Query for pharmacies within 2000m
      const query = `[out:json];node(around:2000,${location.latitude},${location.longitude})["amenity"~"pharmacy|drugstore|chemist"];out;`;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const mappedResults = (data.elements || []).map((el: any) => ({
          id: `osm_${el.id}`,
          name: el.tags?.name || 'Unnamed Pharmacy',
          address: el.tags?.['addr:street'] || 'Nearby Location',
          phone: el.tags?.phone || el.tags?.['contact:phone'] || '',
          lat: el.lat,
          lng: el.lon
        }));
        setParties(mappedResults);
      }
    } catch (err) {
      Alert.alert("Error", "Could not discover nearby shops using free source");
    } finally {
      setLoading(false);
    }
  };

  const handleAddDiscovery = async (shop: any) => {
    setLoading(true);
    try {
      const partyData = {
        name: shop.name,
        address: shop.address,
        phone: shop.phone,
        latitude: shop.lat,
        longitude: shop.lng,
        gstin: "PENDING"
      };

      // Call common customer creation API
      // Since it's a lead, we might mark it differently but for now just add it
      await createCustomer(partyData);

      Alert.alert("Success", `${shop.name} added to your customer list!`, [
        { text: "View List", onPress: () => setIsDiscoverMode(false) }
      ]);
      fetchParties(); // Refresh the real list
    } catch (error) {
      Alert.alert("Error", "Failed to add shop to list");
    } finally {
      setLoading(false);
    }
  };

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

  const handleLogout = async () => {
    await stopBackgroundTracking();
    setScreen('login');
    setUser('');
    setPassword('');
  };

  const handleLogin = async () => {
    if (!user || !password) {
      Alert.alert('Error', 'Please enter your credentials');
      return;
    }

    setLoading(true);
    try {
      await login(user, password);
      await startBackgroundTracking();
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
        setSelectedParty(party);
        setCart([]); // Clear previous cart
        Alert.alert('Visit Verified', `Checked in at ${party.name}`, [
          { text: 'Capture Requirements', onPress: () => setScreen('catalog') }
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

  const handleAddToOrder = (product: any) => {
    setCart([{
      productId: product.id,
      name: product.name,
      quantity: 1,
      mrp: product.mrp,
      price: product.mrp * 0.9 // Default 10% discount for rep orders
    }]);
    setScreen('order');
  };

  const handleConfirmOrder = async () => {
    if (cart.length === 0 || !selectedParty) return;

    setLoading(true);
    try {
      const orderData = {
        customerId: selectedParty.id,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount: cart.reduce((acc, i) => acc + (i.price * i.quantity), 0)
      };

      await createRequirement(orderData);

      Alert.alert("Requirement Sent", "Your requirements have been sent to the billing desk. They will verify stock and prepare the dispatch.", [
        { text: "OK", onPress: () => setScreen('visits') }
      ]);
    } catch (error: any) {
      Alert.alert("Failed", error.message || "Could not submit requirements");
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

  const renderVisits = () => (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.mainHeader}>
        <View>
          <Text style={styles.headerWelcome}>Field Force</Text>
          <Text style={styles.headerMainTitle}>Customer Visits</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, !isDiscoverMode && styles.activeTab]}
            onPress={() => setIsDiscoverMode(false)}
          >
            <Text style={[styles.tabText, !isDiscoverMode && styles.activeTabText]}>My Customers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, isDiscoverMode && styles.activeTab]}
            onPress={() => {
              setIsDiscoverMode(true);
              fetchNearbyDiscovery();
            }}
          >
            <Text style={[styles.tabText, isDiscoverMode && styles.activeTabText]}>Discover Nearby</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder={isDiscoverMode ? "Search nearby shops..." : "Search my pharmacies..."}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Syncing Customers...</Text>
        </View>
      ) : (
        <FlatList
          data={parties.filter((p: any) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.visitCard}>
              <View style={styles.visitInfo}>
                <Text style={styles.visitLabel}>{isDiscoverMode ? 'POTENTIAL PHARMACY' : 'PHARMACY'}</Text>
                <Text style={styles.visitName}>{item.name}</Text>
                <Text style={styles.visitAddress}>{item.address || 'No Address Listed'}</Text>

                <View style={styles.actionRow}>
                  {item.phone && (
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => Linking.openURL(`tel:${item.phone}`)}
                    >
                      <Text style={styles.actionIconText}>📞 Call Now</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${item.lat || 0},${item.lng || 0}`)}
                  >
                    <Text style={styles.actionIconText}>📍 Navigate</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {isDiscoverMode ? (
                <TouchableOpacity
                  style={[styles.checkInBtn, { backgroundColor: COLORS.success }]}
                  onPress={() => handleAddDiscovery(item)}
                >
                  <Text style={styles.checkInText}>ADD</Text>
                  <Text style={styles.checkInSubtext}>To List</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.checkInBtn, checkingIn === item.id && styles.btnDisabled]}
                  onPress={() => handleCheckIn(item)}
                  disabled={checkingIn === item.id}
                >
                  {checkingIn === item.id ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Text style={styles.checkInText}>CHECK IN</Text>
                      <Text style={styles.checkInSubtext}>Start Visit</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
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
                <TouchableOpacity style={styles.orderAddBtn} onPress={() => handleAddToOrder(item)}>
                  <Text style={styles.orderAddText}>+</Text>
                </TouchableOpacity>
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
          <Text style={styles.orderLabel}>Pharmacy Name</Text>
          <View style={styles.productCard}>
            <View style={styles.cardLeft}>
              <Text style={styles.productName}>{selectedParty?.name}</Text>
              <Text style={styles.subtitle}>{selectedParty?.address}</Text>
            </View>
          </View>

          <Text style={styles.orderLabel}>Items in order</Text>
          {cart.map((item, idx) => (
            <View key={idx} style={styles.productCard}>
              <View style={styles.cardLeft}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.subtitle}>Qty: {item.quantity}</Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.priceTag}>₹{item.price.toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.btnDisabled]}
          onPress={handleConfirmOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitBtnText}>Confirm Order</Text>
          )}
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
  submitBtnText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },

  // Visit Screen Styles
  visitCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, marginBottom: 16, elevation: 2, flexDirection: 'row', alignItems: 'center' },
  visitInfo: { flex: 1 },
  visitLabel: { fontSize: 10, color: COLORS.primary, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
  visitName: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  visitAddress: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },
  checkInBtn: { backgroundColor: COLORS.primary, width: 100, height: 60, borderRadius: 15, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  checkInText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  checkInSubtext: { color: COLORS.primaryLight, fontSize: 10, fontWeight: '600' },

  // Tabs
  tabBar: { flexDirection: 'row', marginBottom: 12, backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: 'white', elevation: 2 },
  tabText: { fontSize: 13, color: COLORS.textLight, fontWeight: '600' },
  activeTabText: { color: COLORS.primary, fontWeight: '800' },

  // Actions
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionIconBtn: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  actionIconText: { fontSize: 11, color: COLORS.primary, fontWeight: '700' }
});
