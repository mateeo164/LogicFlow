import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors, Spacing, Radius, Typography, Fonts, Shadow } from '../constants/theme'

interface Props {
  icon: string
  label: string
  value: string | number
  color?: string
}

export function StatCard({ icon, label, value, color = Colors.primary }: Props) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: color + '14' }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    gap: 6,
    ...Shadow.sm,
  },
  iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 19 },
  value: { fontFamily: Fonts.serif, fontSize: 22, letterSpacing: -0.3 },
  label: { ...Typography.small, textAlign: 'center' },
})
