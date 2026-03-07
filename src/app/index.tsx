import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { DialSlider } from '@/components/dial-slider';

export default function HomeScreen() {
  const handleValueChange = useCallback((value: number) => {
    // Handle value changes here
  }, []);

  return (
    <View style={styles.container}>
      <DialSlider initialValue={0} onValueChange={handleValueChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
