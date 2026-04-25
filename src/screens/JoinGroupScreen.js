import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../supabase';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function JoinGroupScreen() {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();

  // If we come back from the ScannerScreen with a code, auto-fill it
  useEffect(() => {
    if (route.params?.scannedCode) {
      setInviteCode(route.params.scannedCode);
      // Optional: Auto-trigger handleJoin() here
    }
  }, [route.params?.scannedCode]);

  async function handleJoin() {
    if (inviteCode.length < 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit invite code.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc('join_group_by_code', {
        p_invite_code: inviteCode.toUpperCase().trim(),
        p_user_id: user.id
      });

      if (error) throw new Error(error.message);

      Alert.alert('Success!', 'You have joined the group.');
      navigation.navigate('Dashboard');

    } catch (error) {
      Alert.alert('Join Failed', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join a Study Group</Text>
      
      <TextInput
        style={styles.input}
        placeholder="ABC123"
        value={inviteCode}
        onChangeText={setInviteCode}
        autoCapitalize="characters"
        maxLength={6}
      />

      <TouchableOpacity style={styles.button} onPress={handleJoin} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Join Group</Text>}
      </TouchableOpacity>

      {/* NEW: SCAN BUTTON */}
      <TouchableOpacity 
        style={styles.scanButton} 
        onPress={() => navigation.navigate('Scanner')}
      >
        <Text style={styles.scanButtonText}>📍 SCAN QR CODE</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 30, justifyContent: 'center', backgroundColor: '#FFF' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 2, borderColor: '#007BFF', borderRadius: 12, padding: 15, fontSize: 24, textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: '#007BFF', padding: 18, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold' },
  scanButton: { marginTop: 20, padding: 15, borderWidth: 2, borderColor: '#007BFF', borderRadius: 12, alignItems: 'center' },
  scanButtonText: { color: '#007BFF', fontWeight: 'bold' }
});