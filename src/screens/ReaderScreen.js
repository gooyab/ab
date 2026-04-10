import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Dimensions, Alert, ActivityIndicator
} from 'react-native';
import Pdf from 'react-native-pdf';
import { supabase, supabaseUrl } from '../supabase';

export default function ReaderScreen({ route }) {
  const { bookId, filePath, isAdmin } = route.params;

  const [pins, setPins] = useState([]);
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [sessionStatus, setSessionStatus] = useState('Inactive');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // NEW: State to store the PDF's internal point width (e.g., 612 for A4)
  const [pdfInternalWidth, setPdfInternalWidth] = useState(0);

  const screenWidth = Dimensions.get('window').width;
  const pdfRef = useRef(null);

  useEffect(() => {
    loadInitialData();

    // 1. Realtime Pin Listener
    const pinChannel = supabase
      .channel('realtime-pins')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'highlights',
        filter: `book_id=eq.${bookId}`
      }, (payload) => {
        setPins((prev) => {
          const exists = prev.some(p => p.id === payload.new.id);
          if (exists) return prev;
          return [...prev, payload.new];
        });
      })
      .subscribe();

    // 2. Realtime Session Listener
    const sessionChannel = supabase
      .channel('session-status')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_sessions',
        filter: `book_id=eq.${bookId}`
      }, (payload) => {
        const { status, is_revealed } = payload.new;
        setSessionStatus(status);
        setIsRevealed(is_revealed);
        fetchVisiblePins();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(pinChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [bookId]);

  const loadInitialData = async () => {
    const { data: session } = await supabase
      .from('live_sessions')
      .select('is_revealed, status')
      .eq('book_id', bookId)
      .single();

    if (session) {
      setIsRevealed(session.is_revealed);
      setSessionStatus(session.status);
    }
    fetchVisiblePins();
  };

  const fetchVisiblePins = async () => {
    const { data, error } = await supabase
      .from('highlights')
      .select('*')
      .eq('book_id', bookId);

    if (!error) setPins(data || []);
  };

const handleToggleSession = async () => {
    const isStarting = sessionStatus !== 'Active';

    console.log("Attempting to toggle session for book:", bookId);

    // FIX: Using .upsert() instead of .update() ensures the row exists
    const { data, error } = await supabase
      .from('live_sessions')
      .upsert({ 
        book_id: bookId, // This links the session to the book
        status: isStarting ? 'Active' : 'Inactive', 
        is_revealed: isStarting 
      }, { onConflict: 'book_id' }) // If book_id exists, just update it
      .select();

    if (error) {
      console.error("Session Toggle Error:", error.message);
      Alert.alert("Admin Error", `Database rejected the update: ${error.message}`);
    } else {
      console.log("Database updated successfully:", data);
    }
  };

  const handlePageTap = async (page, x, y) => {
    if (!isHighlightMode) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // THE FIX: We send 'pdfInternalWidth' as the base 'w'.
      // This ensures James's DB trigger calculates percentages correctly.
      await supabase.from('highlights').insert({
        book_id: bookId,
        user_id: user.id,
        page_number: page,
        content: "Pinned Coordinate",
        highlight_coordinates: {
          x: Math.round(x),
          y: Math.round(y),
          w: Math.round(pdfInternalWidth), 
          h: 0 
        },
        color_code: "#FFD700"
      });
    } catch (err) {
      Alert.alert("Save Error", err.message);
    }
  };

  const renderMarkers = () => {
    return pins
      .filter(p => p.page_number === currentPage)
      .map((pin, index) => {
        // Responsively map the percentage back to YOUR current screen width
        const responsiveX = (pin.x_pct / 100) * screenWidth;
        const responsiveY = (pin.y_pct / 100) * Dimensions.get('window').height;

        return (
          <View
            key={`pin-${pin.id || index}`}
            style={[
              styles.pinMarker,
              {
                left: responsiveX - 15,
                top: responsiveY - 15,
                backgroundColor: pin.color_code
              }
            ]}
          >
            <Text style={{ fontSize: 16 }}>📍</Text>
          </View>
        );
      });
  };

  const correctedUri = `${supabaseUrl}/storage/v1/object/public/Books/${encodeURIComponent(decodeURIComponent(filePath))}`;

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View>
          <Text style={styles.pageIndicator}>Page {currentPage} / {totalPages || '...'}</Text>
          {isAdmin && (
            <TouchableOpacity
              onPress={handleToggleSession}
              style={[styles.adminToggle, sessionStatus === 'Active' ? styles.activeBtn : styles.inactiveBtn]}
            >
              <Text style={styles.adminToggleText}>
                {sessionStatus === 'Active' ? "🔴 END SESSION" : "🚀 START SESSION"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.modeButton, isHighlightMode && styles.modeButtonActive]}
          onPress={() => setIsHighlightMode(!isHighlightMode)}
        >
          <Text style={styles.buttonText}>{isHighlightMode ? '📍 PIN MODE' : '🖐️ SCROLL MODE'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <Pdf
          ref={pdfRef}
          source={{ uri: correctedUri }}
          trustAllCerts={false}
          onLoadComplete={(num, path, { width }) => { 
            setTotalPages(num); 
            setPdfInternalWidth(width); // Capture internal PDF width
            setIsLoading(false); 
          }}
          onPageChanged={(p) => setCurrentPage(p)}
          onPageSingleTap={(p, x, y) => handlePageTap(p, x, y)}
          style={styles.pdf}
          fitPolicy={0} 
        />

        {!isLoading && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {renderMarkers()}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  pdf: { flex: 1, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15, backgroundColor: '#FFF' },
  pageIndicator: { fontWeight: 'bold', fontSize: 16 },
  modeButton: { padding: 10, borderRadius: 20, backgroundColor: '#F0F0F0' },
  modeButtonActive: { backgroundColor: '#FFD700' },
  buttonText: { fontWeight: 'bold' },
  adminToggle: { marginTop: 5, padding: 6, borderRadius: 5, alignItems: 'center' },
  activeBtn: { backgroundColor: '#DC3545' },
  inactiveBtn: { backgroundColor: '#28A745' },
  adminToggleText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  pinMarker: {
    position: 'absolute',
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});