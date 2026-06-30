import React from 'react'
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, View } from 'react-native'
import { Colors, Spacing, Radius, Fonts, Shadow } from '../constants/theme'

interface Props {
  onPress: () => void
  label: string
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'accent' | 'secondary' | 'danger'
  icon?: string
  style?: ViewStyle
}

const palette = {
  primary: { bg: Colors.primaryDeep, fg: Colors.textInverse, border: Colors.primaryDeep },
  accent: { bg: Colors.accent, fg: Colors.textInverse, border: Colors.accent },
  secondary: { bg: 'transparent', fg: Colors.primaryDeep, border: Colors.borderStrong },
  danger: { bg: 'transparent', fg: Colors.error, border: Colors.errorSoft },
}

export function PrimaryButton({ onPress, label, loading, disabled, variant = 'primary', icon, style }: Props) {
  const c = palette[variant]
  const solid = variant === 'primary' || variant === 'accent'
  const isDisabled = disabled || loading
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: c.bg, borderColor: c.border },
        solid && Shadow.sm,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.fg} size="small" />
      ) : (
        <View style={styles.inner}>
          {icon ? <Text style={[styles.icon, { color: c.fg }]}>{icon}</Text> : null}
          <Text style={[styles.label, { color: c.fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: 15,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontFamily: Fonts.sansBold, fontSize: 15 },
  label: { fontFamily: Fonts.sansBold, fontSize: 15, letterSpacing: 0.2 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
})
