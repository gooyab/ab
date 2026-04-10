import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { supabase } from './src/supabase';

// Screens
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import JoinGroupScreen from './src/screens/JoinGroupScreen';
import ReaderScreen from './src/screens/ReaderScreen';
import ScannerScreen from './src/screens/ScannerScreen'; // NEW: The Vision Camera Screen

const Stack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription?.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#FFF' } }}>
        {session && session.user ? (
          // --- PROTECTED ROUTES (User is logged in) ---
          <>
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ 
                headerTitle: 'My Dashboard', 
                headerBackVisible: false 
              }}
            />
            <Stack.Screen
              name="CreateGroup"
              component={CreateGroupScreen}
              options={{ headerTitle: 'Initialize Group' }}
            />
            <Stack.Screen
              name="JoinGroup"
              component={JoinGroupScreen}
              options={{ headerTitle: 'Join Group' }}
            />
            <Stack.Screen
              name="Scanner"
              component={ScannerScreen}
              options={{ 
                headerTitle: 'Scan Join Code',
                headerTransparent: true, // Makes camera full-screen
                headerTintColor: '#FFF' 
              }}
            />
            <Stack.Screen 
              name="Reader" 
              component={ReaderScreen} 
              options={{ headerShown: false }} 
            />
          </>
        ) : (
          // --- AUTH ROUTES (User is logged out) ---
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
});