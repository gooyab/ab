import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import Pdf from 'react-native-pdf';
import { supabase, supabaseUrl } from '../supabase';

export default function ReaderScreen({ route }) {
  const { bookId, filePath } = route.params;

  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const pdfRef = useRef(null);

  // --- THE FINAL URL LOGIC ---
  const cleanPath = decodeURIComponent(filePath);
  const safePath = encodeURIComponent(cleanPath);
  const baseUrl = supabaseUrl.replace('localhost', '192.168.86.211');

  // Construct the final URI pointing to James's Port 8000 gateway
  const correctedUri = `${baseUrl}/storage/v1/object/public/Books/${safePath}`;

const source = { 
  uri: "http://192.168.86.231:8000/storage/v1/object/public/Books/1775315212783_collie_rob_singh_avi__power_pivot_and_power_bi_the_excel_users_guide_to_dax_power_query_power_bi__power_pivot_in_excel_20102016_2016_holy_macro_books__libgenli.pdf",
  cache: false 
};

  // COORDINATE SAVER (James's Feature)
  const handlePageTap = async (page, x, y) => {
    if (!isHighlightMode) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('highlights')
        .insert({
          book_id: bookId,
          user_id: user.id,
          page_number: page,
          content: "Pinned Coordinate",
          coordinates: { x: Math.round(x), y: Math.round(y) }
        });

      if (error) throw error;
      Alert.alert("Saved!", `Pinned at {${Math.round(x)}, ${Math.round(y)}} on page ${page}`);
    } catch (err) {
      console.error("Save Error:", err.message);
      Alert.alert("Save Error", "Could not connect to the highlights table.");
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER TOOLBAR */}
      <View style={styles.toolbar}>
        <View>
          <Text style={styles.pageIndicator}>Page {currentPage} / {totalPages || '...'}</Text>
          {isLoading && (
            <Text style={styles.progressText}>
              Streaming: {Math.round(loadingProgress * 100)}%
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.modeButton, isHighlightMode && styles.modeButtonActive]}
          onPress={() => setIsHighlightMode(!isHighlightMode)}
        >
          <Text style={styles.buttonText}>
            {isHighlightMode ? '📍 PIN MODE' : '🖐️ SCROLL MODE'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* THE PDF COMPONENT */}
      <Pdf
        ref={pdfRef}
        source={source}
        // FIX: Set to false for HTTP connections to avoid "Trust Manager" Java errors
        trustAllCerts={false}
        onLoadProgress={(percent) => {
          setLoadingProgress(percent);
          console.log(`Stream Progress: ${Math.round(percent * 100)}%`);
        }}
        onLoadComplete={(numberOfPages) => {
          setTotalPages(numberOfPages);
          setIsLoading(false);
          console.log(`SUCCESS: Rendered ${numberOfPages} pages.`);
        }}
        onPageChanged={(page) => setCurrentPage(page)}
        onPageSingleTap={(page, x, y) => handlePageTap(page, x, y)}
        onError={(error) => {
          setIsLoading(false);
          console.log('PDF Render Error:', error);
          Alert.alert(
            "Reader Error",
            "The file could not be displayed. Ensure James has the 'Books' bucket set to Public."
          );
        }}
        style={styles.pdf}
        enableAntialiasing={true}
        fitPolicy={0}
      />

      {/* LOADING OVERLAY */}
      {isLoading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.loaderText}>Bypassing the 'Double-Lock'...</Text>
        </View>
      )}

      {/* MODE INSTRUCTIONS */}
      {isHighlightMode && !isLoading && (
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>Tap page to save coordinates for James</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    backgroundColor: '#121212',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#FFF',
    elevation: 4,
  },
  pageIndicator: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  progressText: { fontSize: 10, color: '#007BFF', fontWeight: 'bold' },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F0F0F0'
  },
  modeButtonActive: { backgroundColor: '#FFD700' },
  buttonText: { fontWeight: 'bold', fontSize: 12 },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  loaderText: { marginTop: 10, fontWeight: '600', color: '#555' },
  instructions: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 12,
    borderRadius: 20
  },
  instructionText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 }
});