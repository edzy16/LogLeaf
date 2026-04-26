import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Colors, BottomTabInset, Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';

interface FABProps {
  onPress: () => void;
}

export function FAB({ onPress }: FABProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
      onPress={onPress}>
      <ThemedText style={styles.icon}>+</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: BottomTabInset + Spacing.three,
    right: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  icon: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 32,
    fontWeight: '300',
  },
});
