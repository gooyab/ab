import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './src/supabase';

import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import JoinGroupScreen from './src/screens/JoinGroupScreen';
import ReaderScreen from './src/screens/ReaderScreen';

const Stack = createNativeStackNavigator();
console.log("Testing Join Screen Import:", JoinGroupScreen);
export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Cleanup subscription on unmount
    return () => subscription?.unsubscribe();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {session && session.user ? (
          // USER IS LOGGED IN: Grant access to the Dashboard and App features
          <>
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ headerTitle: 'My Dashboard', headerBackVisible: false }}
            />
            <Stack.Screen
              name="CreateGroup"
              component={CreateGroupScreen}
              options={{ headerTitle: 'Initialize Group' }}
            />
          </>
        ) : (
          // USER IS NOT LOGGED IN: Lock them to the Auth Screen
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ headerShown: false }}
          />
        )}
        <Stack.Screen
          name="JoinGroup"
          component={JoinGroupScreen}
          options={{ headerTitle: 'Join Group' }}
        />
        <Stack.Screen name="Reader" component={ReaderScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}