import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import React, { useState } from 'react';
import { SQLiteProvider } from 'expo-sqlite';

import { migrateDb } from '@/db/migrations';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { FAB } from '@/components/fab';
import { AddSheet } from '@/components/add-sheet';

export default function TabLayout() {
  const [addOpen, setAddOpen] = useState(false);
  const [, setRefreshKey] = useState(0);

  return (
    <SQLiteProvider databaseName="logleaf.db" onInit={migrateDb}>
      <ThemeProvider value={DarkTheme}>
        <AnimatedSplashOverlay />
        <AppTabs />
        <FAB onPress={() => setAddOpen(true)} />
        <AddSheet
          visible={addOpen}
          onClose={() => setAddOpen(false)}
          onSaved={() => setRefreshKey(k => k + 1)}
        />
      </ThemeProvider>
    </SQLiteProvider>
  );
}
