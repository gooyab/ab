import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { supabase } from '../supabase';
import { useNavigation } from '@react-navigation/native';

export default function DashboardScreen() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    fetchMyGroups();

    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'group_members',
        },
        () => {
          fetchMyGroups(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchMyGroups() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // FIX: Now selecting 'book_id' inside the books join
      const { data, error } = await supabase
        .from('groups')
        .select(`
          group_id,
          title,
          capacity,
          meeting_time,
          meeting_days,
          group_members!inner(user_id),
          books(book_id, file_path)
        `)
        .eq('group_members.user_id', user.id);

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Fetch Error:', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Groups</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.joinButton]} 
            onPress={() => navigation.navigate('JoinGroup')}
          >
            <Text style={styles.actionButtonText}>Join</Text>
          </TouchableOpacity>
            
          <TouchableOpacity 
            style={[styles.actionButton, styles.createButton]} 
            onPress={() => navigation.navigate('CreateGroup')}
          >
            <Text style={styles.actionButtonText}>+ Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007BFF" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.group_id.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>You haven't joined any groups yet.</Text>
            </View>
          }
          renderItem={({ item }) => {
            // Get the book details from the joined array
            const book = item.books?.[0];
            
            return (
              <TouchableOpacity 
                style={styles.groupCard}
                onPress={() => navigation.navigate('Reader', { 
                  bookId: book?.book_id, // PASSING THE ACTUAL BOOK_ID
                  filePath: book?.file_path,
                  isAdmin: true
                })}
              >
                <View style={styles.cardInfo}>
                  <Text style={styles.groupTitle}>{item.title}</Text>
                  <Text style={styles.groupDetail}>
                    {item.meeting_days?.join(', ')} at {item.meeting_time}
                  </Text>
                </View>
                <View style={styles.chevron}>
                  <Text style={{ color: '#CCC', fontSize: 20 }}>{'>'}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, marginTop: 40 },
  headerButtons: { flexDirection: 'row' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  actionButton: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8, marginLeft: 8, justifyContent: 'center' },
  joinButton: { backgroundColor: '#007BFF' },
  createButton: { backgroundColor: '#28A745' },
  actionButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#666', fontSize: 16, fontWeight: '500' },
  groupCard: { 
    backgroundColor: '#FFF', padding: 18, borderRadius: 15, marginBottom: 15, 
    flexDirection: 'row', alignItems: 'center', elevation: 3 
  },
  cardInfo: { flex: 1 },
  groupTitle: { fontSize: 19, fontWeight: 'bold', color: '#007BFF' },
  groupDetail: { color: '#444', marginTop: 4, fontSize: 15 },
  chevron: { marginLeft: 10 },
  signOutButton: { 
    position: 'absolute', bottom: 30, left: 20, right: 20, 
    padding: 15, alignItems: 'center', backgroundColor: '#FFF', 
    borderRadius: 10, borderWidth: 1, borderColor: '#FEE' 
  },
  signOutButtonText: { color: '#DC3545', fontWeight: 'bold' }
});