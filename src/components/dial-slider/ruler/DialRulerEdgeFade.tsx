import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet } from 'react-native';

interface DialRulerEdgeFadeProps {
    fadeColor: string;
}

export function DialRulerEdgeFade({ fadeColor }: DialRulerEdgeFadeProps) {
    return (
        <>
            <LinearGradient
                colors={[fadeColor, 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.leftMask}
            />
            <LinearGradient
                colors={['transparent', fadeColor]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.rightMask}
            />
        </>
    );
}

const MASK_WIDTH = 80;

const styles = StyleSheet.create({
    leftMask: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: MASK_WIDTH,
        pointerEvents: 'none',
    },
    rightMask: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: MASK_WIDTH,
        pointerEvents: 'none',
    },
});
