import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { Colors, Radius, Spacing, Shadow } from '../constants/theme'

type Tone = 'default' | 'sunken' | 'accent' | 'success' | 'navy' | 'danger'

interface Props {
  children: React.ReactNode
  style?: ViewStyle
  tone?: Tone
  padded?: boolean
  elevated?: boolean
  /** Accepted for backwards-compatibility with the old gradient API; ignored. */
  colors?: readonly string[]
}

const tones: Record<Tone, ViewStyle> = {
  default: { backgroundColor: Colors.surface, borderColor: Colors.border },
  sunken: { backgroundColor: Colors.surfaceAlt, borderColor: Colors.border },
  accent: { backgroundColor: Colors.accentSoft, borderColor: 'rgba(180,83,9,0.18)' },
  success: { backgroundColor: Colors.successSoft, borderColor: 'rgba(4,120,87,0.18)' },
  navy: { backgroundColor: Colors.primarySoft, borderColor: 'rgba(36,59,83,0.16)' },
  danger: { backgroundColor: Colors.errorSoft, borderColor: 'rgba(194,65,12,0.18)' },
}

export function GradientCard({ children, style, tone = 'default', padded = true, elevated = true }: Props) {
  return (
    <View
      style={[
        styles.card,
        tones[tone],
        elevated && tone === 'default' && Shadow.md,
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  )
}

// Convenience alias with clearer name for new code.
export const Card = GradientCard

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  padded: {
    padding: Spacing.md,
  },
})
