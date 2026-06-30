import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { Colors, Spacing, Radius, Typography, Fonts } from '../constants/theme'
import { getLevelProgress } from '../constants/components'

interface Props {
  xp: number
}

export function XPBar({ xp }: Props) {
  const { current, next, progress, needed } = getLevelProgress(xp)
  const animWidth = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: progress,
      duration: 900,
      useNativeDriver: false,
    }).start()
  }, [progress])

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.levelChip, { backgroundColor: current.color + '18' }]}>
          <Text style={styles.levelIcon}>{current.icon}</Text>
          <Text style={[styles.levelText, { color: current.color }]}>{current.name}</Text>
        </View>
        <Text style={styles.xpText}>
          <Text style={styles.xpNum}>{xp}</Text> XP
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: animWidth.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              backgroundColor: current.color,
            },
          ]}
        />
      </View>
      {next ? (
        <Text style={styles.caption}>
          Faltan <Text style={styles.captionStrong}>{needed} XP</Text> para {next.icon} {next.name}
        </Text>
      ) : (
        <Text style={[styles.caption, { color: current.color }]}>¡Nivel máximo alcanzado! 🎉</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  levelChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  levelIcon: { fontSize: 14 },
  levelText: { fontFamily: Fonts.sansBold, fontSize: 13 },
  xpText: { fontFamily: Fonts.sans, fontSize: 13, color: Colors.textMuted },
  xpNum: { fontFamily: Fonts.serif, fontSize: 18, color: Colors.text },
  track: { height: 10, backgroundColor: Colors.surfaceSunken, borderRadius: Radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.full },
  caption: { ...Typography.caption },
  captionStrong: { fontFamily: Fonts.sansSemi, color: Colors.text },
})
