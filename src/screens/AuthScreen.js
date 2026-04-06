import React, { useState } from 'react';
import { Alert, StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../supabase';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Helper to clean inputs
  const cleanEmail = email.trim();

  async function signInWithEmail() {
    if (!cleanEmail || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ 
        email: cleanEmail, 
        password: password 
      });

      if (error) {
        // This will tell us if it's a 'Network Request Failed' (IP issue)
        Alert.alert('Login Failed', error.message);
        console.error('Sign In Error:', error);
      }
    } catch (err) {
      Alert.alert('Unexpected Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function signUpWithEmail() {
    if (!cleanEmail || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email: cleanEmail, 
        password: password 
      });

      if (error) {
        Alert.alert('Sign Up Failed', error.message);
      } else if (data.user && data.session) {
        Alert.alert('Success!', 'Welcome to the club!');
      } else {
        // If email confirmation is ON in Supabase, session will be null
        Alert.alert('Check your Inbox', 'We sent you a confirmation email to activate your account.');
      }
    } catch (err) {
      Alert.alert('Unexpected Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.headerTitle}>📖 Book Club</Text>
        <Text style={styles.subTitle}>Interactive Reader MVP</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            onChangeText={setEmail}
            value={email}
            placeholder="email@address.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
          
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            onChangeText={setPassword}
            value={password}
            secureTextEntry
            placeholder="Minimum 6 characters"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity 
          style={[styles.primaryButton, loading && styles.disabledButton]} 
          onPress={signInWithEmail} 
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Sign In</Text>}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={signUpWithEmail} 
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </TouchableOpacity>

        <Text style={styles.footerHint}>
          Ensure you are on the same Wi-Fi as your local server.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', color: '#333' },
  subTitle: { fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 40 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD', borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16 },
  primaryButton: { backgroundColor: '#007BFF', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 12, elevation: 2 },
  disabledButton: { backgroundColor: '#A0CFFF' },
  primaryButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  secondaryButton: { backgroundColor: 'transparent', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#007BFF', alignItems: 'center' },
  secondaryButtonText: { color: '#007BFF', fontWeight: 'bold', fontSize: 16 },
  footerHint: { textAlign: 'center', color: '#999', fontSize: 12, marginTop: 20 }
});