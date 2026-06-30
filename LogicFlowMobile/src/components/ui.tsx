import React from 'react'
import { View, Text, StyleSheet, ViewStyle, TextStyle, ScrollView, ScrollViewProps } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, Spacing, Radius, Typography, Fonts, Shadow } from '../constants/theme'

/* ---------------------------------------------------------------- Screen -- */

export function Screen({
  children,
  scroll = true,
  contentStyle,
  edges = ['top'],
  ...rest
}: {
  children: React.ReactNode
  scroll?: boolean
  contentStyle?: ViewStyle
  edges?: ('top' | 'bottom' | 'left' | 'right')[]
} & ScrollViewProps) {
  const inner = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, contentStyle]}
      {...rest}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flexContent, contentStyle]}>{children}</View>
  )
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {inner}
    </SafeAreaView>
  )
}

/* ------------------------------------------------------------- PageHeader -- */

export function PageHeader({
  overline,
  title,
  subtitle,
  right,
}: {
  overline?: string
  title: string
  subtitle?: string
  right?: React.ReactNode
}) {
  return (
    <View style={styles.headerRow}>
      <View style={{ flex: 1 }}>
        {overline ? <Text style={styles.overline}>{overline}</Text> : null}
        <Text style={Typography.h1}>{title}</Text>
        {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  )
}

/* ----------------------------------------------------------- SectionTitle -- */

export function SectionTitle({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.section, style]}>{children}</Text>
}

/* -------------------------------------------------------------------- Pill -- */

const toneColor: Record<string, { bg: string; fg: string }> = {
  neutral: { bg: Colors.surfaceSunken, fg: Colors.textSecondary },
  navy: { bg: Colors.primarySoft, fg: Colors.primaryDeep },
  accent: { bg: Colors.accentSoft, fg: Colors.accentDeep },
  success: { bg: Colors.successSoft, fg: Colors.success },
  danger: { bg: Colors.errorSoft, fg: Colors.error },
}

export function Pill({
  label,
  tone = 'neutral',
  style,
}: {
  label: string
  tone?: keyof typeof toneColor
  style?: ViewStyle
}) {
  const c = toneColor[tone]
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }, style]}>
      <Text style={[styles.pillText, { color: c.fg }]}>{label}</Text>
    </View>
  )
}

/* --------------------------------------------------------------- IconBadge -- */

export function IconBadge({
  children,
  tone = 'navy',
  size = 48,
  style,
}: {
  children: React.ReactNode
  tone?: keyof typeof toneColor
  size?: number
  style?: ViewStyle
}) {
  const c = toneColor[tone]
  return (
    <View
      style={[
        styles.iconBadge,
        { width: size, height: size, borderRadius: size / 3, backgroundColor: c.bg },
        style,
      ]}
    >
      <Text style={{ fontSize: size * 0.46 }}>{children}</Text>
    </View>
  )
}

/* ----------------------------------------------------------------- Divider -- */

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: Spacing.md, paddingBottom: 120 },
  flexContent: { flex: 1, padding: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.lg, gap: Spacing.md },
  overline: { ...Typography.overline, marginBottom: 6 },
  headerSub: { ...Typography.caption, marginTop: 4 },
  section: { fontFamily: Fonts.serif, fontSize: 19, color: Colors.text, letterSpacing: -0.2, marginBottom: Spacing.sm, marginTop: Spacing.xs },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, alignSelf: 'flex-start' },
  pillText: { fontFamily: Fonts.sansSemi, fontSize: 11.5, letterSpacing: 0.2 },
  iconBadge: { alignItems: 'center', justifyContent: 'center', ...Shadow.sm },
  divider: { height: 1, backgroundColor: Colors.border },
})
