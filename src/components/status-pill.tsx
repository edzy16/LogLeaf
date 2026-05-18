import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { ThemedText } from './themed-text';

interface StatusPillProps {
  label: string;
  color: string;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
}

export function StatusPill({ label, color, icon }: StatusPillProps) {
  return (
    <View style={[styles.pill, { backgroundColor: color + '33' }]}>
      {icon && <MaterialIcons name={icon} size={12} color={color} />}
      <ThemedText style={[styles.label, { color }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
