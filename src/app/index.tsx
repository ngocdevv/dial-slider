import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DialSlider, type DialPreset } from '@/components/dial-slider';

function PresetGlyph({
  children,
  selected,
}: {
  children: string;
  selected: boolean;
}) {
  return (
    <Text style={[styles.glyph, selected && styles.selectedGlyph]}>
      {children}
    </Text>
  );
}

/**
 * Demo tool list. Length decides chrome:
 * - 1 item  → single centered tool + ruler
 * - N items → horizontal preset strip + shared ruler
 */
const PHOTO_PRESETS: readonly DialPreset[] = [
  {
    id: 'exposure',
    label: 'Exposure',
    icon: ({ selected }) => <PresetGlyph selected={selected}>◐</PresetGlyph>,
    minValue: -100,
    maxValue: 100,
    initialValue: 0,
  },
  {
    id: 'brilliance',
    label: 'Brilliance',
    icon: ({ selected }) => <PresetGlyph selected={selected}>◭</PresetGlyph>,
    minValue: -100,
    maxValue: 100,
    initialValue: 0,
  },
  {
    id: 'highlights',
    label: 'Highlights',
    icon: ({ selected }) => <PresetGlyph selected={selected}>◒</PresetGlyph>,
    minValue: -100,
    maxValue: 100,
    initialValue: 0,
  },
  {
    id: 'shadows',
    label: 'Shadows',
    icon: ({ selected }) => <PresetGlyph selected={selected}>◑</PresetGlyph>,
    minValue: -100,
    maxValue: 100,
    initialValue: 0,
  },
  {
    id: 'contrast',
    label: 'Contrast',
    icon: ({ selected }) => <PresetGlyph selected={selected}>◉</PresetGlyph>,
    minValue: -100,
    maxValue: 100,
    initialValue: 0,
  },
  {
    id: 'brightness',
    label: 'Brightness',
    icon: ({ selected }) => <PresetGlyph selected={selected}>☀</PresetGlyph>,
    minValue: -100,
    maxValue: 100,
    initialValue: 0,
  },
  {
    id: 'saturation',
    label: 'Saturation',
    icon: ({ selected }) => <PresetGlyph selected={selected}>◍</PresetGlyph>,
    minValue: -100,
    maxValue: 100,
    initialValue: 0,
  },
];

export default function HomeScreen() {
  const [activePreset, setActivePreset] = useState('highlights');
  const [activeValue, setActiveValue] = useState(0);

  const handlePresetChange = useCallback((presetId: string, value: number) => {
    setActivePreset(presetId);
    setActiveValue(value);
  }, []);

  const handleValueChange = useCallback((presetId: string, value: number) => {
    setActivePreset(presetId);
    setActiveValue(value);
  }, []);

  const activeLabel =
    PHOTO_PRESETS.find((preset) => preset.id === activePreset)?.label ??
    activePreset;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Photo adjustments</Text>
        <Text style={styles.caption}>
          {activeLabel} · {activeValue}
        </Text>

        <View style={styles.dialSurface}>
          <DialSlider
            presets={PHOTO_PRESETS}
            initialPresetId="highlights"
            onPresetChange={handlePresetChange}
            onValueChange={handleValueChange}
            backgroundColor="#000000"
          />
        </View>
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
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  caption: {
    color: '#8E8E93',
    fontSize: 14,
    marginTop: 6,
    marginBottom: 24,
    textAlign: 'center',
  },
  dialSurface: {
    width: '100%',
  },
  glyph: {
    color: '#E4E4E7',
    fontSize: 24,
    fontWeight: '500',
  },
  selectedGlyph: {
    color: '#FFFFFF',
  },
});
