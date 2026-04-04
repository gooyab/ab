import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Alert } from 'react-native';
import Pdf from 'react-native-pdf';
import { supabase, supabaseUrl } from '../supabase';

export default function ReaderScreen({ route }) {
  const { bookId, filePath } = route.params;
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [localHighlights, setLocalHighlights] = useState([]);
  const pdfRef = useRef(null);

  // The Public URL for the book in Supabase Storage
  const source = { uri: `${supabaseUrl}/storage/v1/object/public/Books/${filePath}`, cache: true };

  // 1. COORDINATE MAPPER & SAVE LOGIC
  const handlePageTap = async (page, x, y) => {
    if (!isHighlightMode) return;

    // Convert touch to PDF coordinates
    // react-native-pdf gives us 'x' and 'y' relative to the page size already
    // We bundle this into a JSON object for James's table
    const highlightData = {
      book_id: bookId,
      page_number: page,
      content: "Highlighting...", // In a later task, we can add OCR or Text Extraction
      coordinates: { x, y, width: 50, height: 20 }, // Placeholder dimensions
      created_at: new Date()
    };

    // Instant Visual Feedback (Local State)
    setLocalHighlights([...localHighlights, highlightData]);

    // Save to Supabase (James's Highlights Table)
    const { error } = await supabase
      .from('highlights')
      .insert({
        book_id: bookId,
        user_id: (await supabase.auth.getUser()).data.user.id,
        page_number: page,
        content: "User Highlight",
        coordinates: highlightData.coordinates
      });

    if (error) console.error("Highlight Save Error:", error.message);
  };

  return (
    <View style={styles.container}>
      {/* TOOLBAR */}
      <View style={styles.toolbar}>
        <Text style={styles.pageIndicator}>Page {currentPage}</Text>
        <TouchableOpacity 
          style={[styles.modeButton, isHighlightMode && styles.modeButtonActive]}
          onPress={() => setIsHighlightMode(!isHighlightMode)}
        >
          <Text style={styles.buttonText}>{isHighlightMode ? '📍 Mode: Highlighting' : '🖐️ Mode: Scrolling'}</Text>
        </TouchableOpacity>
      </View>

      {/* THE PDF READER */}
      <Pdf
        ref={pdfRef}
        source={source}
        onPageChanged={(page) => setCurrentPage(page)}
        onPageSingleTap={(page, x, y) => handlePageTap(page, x, y)}
        style={styles.pdf}
        enableAntialiasing={true}
        // This is key: it ensures the PDF fits the screen correctly for our math
        fitPolicy={0} 
      />

      {/* VISUAL FEEDBACK LAYER (Simplified local drawing) */}
      {isHighlightMode && (
        <View style={styles.overlayInstructions}>
          <Text style={styles.instructionText}>Tap anywhere to place a highlight</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2C2C2C' },
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: 50,
    backgroundColor: '#FFF',
    elevation: 5,
  },
  pageIndicator: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  modeButton: { padding: 10, borderRadius: 8, backgroundColor: '#EEE', borderWidth: 1, borderColor: '#DDD' },
  modeButtonActive: { backgroundColor: '#FFD700', borderColor: '#DAA520' },
  buttonText: { fontWeight: 'bold', fontSize: 12 },
  overlayInstructions: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 20
  },
  instructionText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' }
});