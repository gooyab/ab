import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../supabase';
import { useNavigation } from '@react-navigation/native';

export default function JoinGroupScreen() {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  async function handleJoin() {
    if (inviteCode.length < 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit invite code.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Calling James's Atomic RPC Function
      const { data, error } = await supabase.rpc('join_group_by_code', {
        p_invite_code: inviteCode.toUpperCase().trim(),
        p_user_id: user.id
      });

      if (error) {
        // James's custom error messages (e.g., "Group is full") show up here
        throw new Error(error.message);
      }

      Alert.alert('Success!', 'You have joined the group.');
      navigation.navigate('Dashboard'); // Realtime listener handles the UI refresh!

    } catch (error) {
      Alert.alert('Join Failed', error.message);
      console.log('Join Error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join a Study Group</Text>
      <Text style={styles.subtitle}>Enter the 6-digit invite code provided by the group admin.</Text>

      <TextInput
        style={styles.input}
        placeholder="ABC123"
        value={inviteCode}
        onChangeText={setInviteCode}
        autoCapitalize="characters"
        maxLength={6}
        autoCorrect={false}
      />

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleJoin}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Join Group</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 30, justifyContent: 'center', backgroundColor: '#FFF' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 10, marginBottom: 30 },
  input: { 
    borderWidth: 2, 
    borderColor: '#007BFF', 
    borderRadius: 12, 
    padding: 20, 
    fontSize: 32, 
    textAlign: 'center', 
    fontWeight: 'bold', 
    letterSpacing: 5,
    backgroundColor: '#F8F9FA' 
  },
  button: { backgroundColor: '#007BFF', padding: 18, borderRadius: 12, marginTop: 25, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#A0CFFF' },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 }
});