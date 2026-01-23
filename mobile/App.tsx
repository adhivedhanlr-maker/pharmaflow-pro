import React, { useState, useEffect } from 'react';
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
  Alert
} from 'react-native';
import { login, getProducts } from './src/utils/api';

export default function App() {
  const [screen, setScreen] = useState('login'); // login, catalog, order
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      setError(null);
    } catch (err: any) {
      setError(err.message);
      Alert.alert('Error', 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!user || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      const data = await login(user, password);
      // In a real app, we'd store the token from data.access_token
      setScreen('catalog');
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const renderLogin = () => (
    <View style={styles.container}>
      <Text style={styles.title}>PharmaFlow Pro</Text>
      <Text style={styles.subtitle}>Sales Rep Mobile</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={user}
          onChangeText={setUser}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.7 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.footer}>© 2026 Antigravity Medical Systems</Text>
    </View>
  );

  const renderCatalog = () => (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Product Catalog</Text>
        <TouchableOpacity onPress={() => setScreen('login')}>
          <Text style={{ color: '#fff' }}>Logout</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item: any) => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardDetail}>Stock: {item.stock || 0} {item.unit || 'Units'}</Text>
                {item.category && <Text style={styles.cardDetail}>{item.category}</Text>}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.cardPrice}>₹{(item.sellingPrice || item.price || 0).toFixed(2)}</Text>
                <TouchableOpacity style={styles.orderBadge} onPress={() => setScreen('order')}>
                  <Text style={styles.orderBadgeText}>Order +</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#64748b' }}>No products found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );

  const renderOrder = () => (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setScreen('catalog')}>
          <Text style={{ color: '#fff' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Order</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ padding: 16 }}>
        <Text style={styles.label}>Select Customer</Text>
        <TextInput style={styles.input} placeholder="Search Customer..." />

        <View style={[styles.card, { marginTop: 20 }]}>
          <Text style={{ fontWeight: 'bold' }}>Items in Cart (0)</Text>
        </View>

        <TouchableOpacity style={[styles.button, { marginTop: 40 }]}>
          <Text style={styles.buttonText}>Submit Order</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: StatusBar.currentHeight,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2563eb', // primary-600
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 40,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    fontSize: 12,
    color: '#94a3b8',
  },
  header: {
    backgroundColor: '#2563eb',
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  cardDetail: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2563eb',
  },
  orderBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
  },
  orderBadgeText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  }
});
