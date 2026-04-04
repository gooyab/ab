import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { PDFDocument } from 'pdf-lib';
import { useNavigation } from '@react-navigation/native';
import { supabase, supabaseUrl } from '../supabase';

const DAYS_OF_WEEK = [
  { label: 'M', value: 'Monday' },
  { label: 'T', value: 'Tuesday' },
  { label: 'W', value: 'Wednesday' },
  { label: 'Th', value: 'Thursday' },
  { label: 'F', value: 'Friday' },
  { label: 'S', value: 'Saturday' },
  { label: 'Su', value: 'Sunday' },
];

export default function CreateGroupScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [capacity, setCapacity] = useState('5');
  const [interval, setInterval] = useState('10');
  const [selectedDays, setSelectedDays] = useState([]); // Array for Bob's toggle buttons
  const [time, setTime] = useState('18:00');
  
  // File State
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedPageCount, setParsedPageCount] = useState(0);

  const isFormValid = title.trim() !== '' && selectedDays.length > 0 && selectedFile !== null && parsedPageCount > 0;

  // Toggle Day Selection
  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  async function handlePickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/epub+zip'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if (file.size > 157286400) {
        Alert.alert('File too large', 'Please select a file under 150MB.');
        return;
      }
      setSelectedFile(file);
      try {
        if (file.mimeType === 'application/pdf') {
          const fileBase64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
          const pdfDoc = await PDFDocument.load(fileBase64);
          const pages = pdfDoc.getPageCount();
          setParsedPageCount(pages);
          Alert.alert('Success', `Parsed ${pages} pages!`);
        }
      } catch (e) { setParsedPageCount(0); }
    } catch (e) { Alert.alert('Error', 'Failed to pick document.'); }
  }

  async function handleSubmit() {
    if (loading || !isFormValid) return;
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session.user;

      // STEP 1: Create Group (Database First)
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          admin_id: user.id,
          title: title,
          capacity: parseInt(capacity),
          invite_code: inviteCode,
          page_interval: parseInt(interval),
          meeting_days: selectedDays, // Sending the JS Array ['Monday', 'Wednesday']
          meeting_time: time
        })
        .select().single();

      if (groupError) throw groupError;

      // STEP 2: Create Group Member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({ group_id: groupData.group_id, user_id: user.id });

      if (memberError) throw memberError;

      // STEP 3: Create Book Entry (Link first, upload later)
      const fileName = `${Date.now()}_${selectedFile.name.replace(/\s/g, '_')}`;
      const { error: bookError } = await supabase
        .from('books')
        .insert({
          group_id: groupData.group_id,
          file_path: fileName, 
          total_pages: parsedPageCount
        });

      if (bookError) throw bookError;

      // STEP 4: Heavy Upload (Only runs if all DB records are safe)
      const targetUrl = `${supabaseUrl}/storage/v1/object/Books/${fileName}`;
      const uploadResult = await FileSystem.uploadAsync(targetUrl, selectedFile.uri, {
        httpMethod: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': selectedFile.mimeType || 'application/pdf',
        },
      });

      if (uploadResult.status !== 200) throw new Error("File upload failed after DB success.");

      Alert.alert('Success!', `Group created! Invite Code: ${inviteCode}`);
      navigation.goBack(); 
      
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Group Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Design Thinking" />

      <View style={styles.row}>
        <View style={styles.halfInput}><Text style={styles.label}>Capacity</Text>
          <TextInput style={styles.input} value={capacity} onChangeText={setCapacity} keyboardType="numeric" />
        </View>
        <View style={styles.halfInput}><Text style={styles.label}>Pages/Session</Text>
          <TextInput style={styles.input} value={interval} onChangeText={setInterval} keyboardType="numeric" />
        </View>
      </View>

      <Text style={styles.label}>Meeting Days</Text>
      <View style={styles.daysContainer}>
        {DAYS_OF_WEEK.map((day) => (
          <TouchableOpacity 
            key={day.value} 
            style={[styles.dayButton, selectedDays.includes(day.value) && styles.dayButtonActive]}
            onPress={() => toggleDay(day.value)}
          >
            <Text style={[styles.dayText, selectedDays.includes(day.value) && styles.dayTextActive]}>{day.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Meeting Time</Text>
      <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="18:00" />

      <TouchableOpacity style={styles.fileButton} onPress={handlePickDocument}>
        <Text style={styles.fileButtonText}>{selectedFile ? selectedFile.name : 'Pick Book (PDF/EPUB)'}</Text>
      </TouchableOpacity>
      {parsedPageCount > 0 && <Text style={styles.pageCountText}>Pages: {parsedPageCount}</Text>}

      <TouchableOpacity 
        style={[styles.submitButton, (!isFormValid || loading) && styles.submitButtonDisabled]} 
        onPress={handleSubmit} 
        disabled={!isFormValid || loading}
      >
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>Create Group & Upload</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#FFF' },
  label: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5, marginTop: 15 },
  input: { borderWidth: 1, borderColor: '#DDD', padding: 15, borderRadius: 8, backgroundColor: '#F8F9FA' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  daysContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  dayButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#DDD', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  dayButtonActive: { backgroundColor: '#007BFF', borderColor: '#007BFF' },
  dayText: { color: '#333', fontWeight: 'bold' },
  dayTextActive: { color: '#FFF' },
  fileButton: { backgroundColor: '#E2EEFF', padding: 15, borderRadius: 8, marginTop: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#007BFF' },
  fileButtonText: { color: '#007BFF', textAlign: 'center', fontWeight: 'bold' },
  pageCountText: { textAlign: 'center', color: '#28A745', marginTop: 5, fontWeight: 'bold' },
  submitButton: { backgroundColor: '#007BFF', padding: 18, borderRadius: 8, marginTop: 40, alignItems: 'center', marginBottom: 50 },
  submitButtonDisabled: { backgroundColor: '#A0CFFF' },
  submitButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 }
});