import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { DialSlider } from '@/components/dial-slider';

export default function HomeScreen() {
  const handleValueChange = useCallback((value: number) => {
    // Handle value changes
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Your app content here */}
        <DialSlider
          minValue={-100}
          maxValue={100}
          initialValue={0}
          onValueChange={handleValueChange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
