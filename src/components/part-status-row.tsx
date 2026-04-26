import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { Part, PartStatus } from '@/types';
import { getKmRemaining, getPartStatus } from '@/utils/partStatus';
import { ThemedText } from './themed-text';

const STATUS_COLORS: Record<PartStatus, string> = {
  ok: Colors.dark.success,
  'due-soon': Colors.dark.warning,
  overdue: Colors.dark.danger,
  tracked: Colors.dark.textSecondary,
};

interface PartStatusRowProps {
  part: Part;
  currentKm: number;
  onPress: (part: Part) => void;
}

export function PartStatusRow({ part, currentKm, onPress }: PartStatusRowProps) {
  const status = getPartStatus(part, currentKm);
  const color = STATUS_COLORS[status];

  let label: string;
  if (status === 'tracked') {
    label = `Last replaced at ${Math.round(part.replaced_at_km)} km`;
  } else {
    const kmRemaining = getKmRemaining(part, currentKm) ?? 0;
    label =
      status === 'overdue'
        ? `${Math.abs(Math.round(kmRemaining))} km overdue`
        : `${Math.round(kmRemaining)} km remaining`;
  }

  return (
    <Pressable
      onPress={() => onPress(part)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.indicator, { backgroundColor: color }]} />
      <View style={styles.content}>
        <ThemedText type="default">{part.name}</ThemedText>
        <ThemedText type="small" style={{ color }}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Spacing.three,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.backgroundSelected,
  },
  pressed: {
    opacity: 0.7,
  },
  indicator: {
    width: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
});
