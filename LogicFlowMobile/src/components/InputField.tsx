import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography, Fonts } from '../constants/theme'

interface Props extends TextInputProps {
  label: string
  error?: string
  isPassword?: boolean
  icon?: React.ComponentProps<typeof Ionicons>['name']
}

export function InputField({ label, error, isPassword, icon, style, ...props }: Props) {
  const [visible, setVisible] = useState(false)
  const [focused, setFocused] = useState(false)

  const borderColor = error ? Colors.error : focused ? Colors.primaryMid : Colors.border

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          { borderColor, backgroundColor: focused ? Colors.surface : Colors.surfaceAlt },
          focused && styles.focusRing,
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={Colors.textMuted} style={styles.leadingIcon} /> : null}
        <TextInput
          style={[styles.input, style as any]}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={isPassword && !visible}
          autoCapitalize="none"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setVisible(v => !v)} style={styles.eyeBtn} hitSlop={8}>
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={19} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontFamily: Fonts.sansSemi, fontSize: 13, color: Colors.textSecondary },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  focusRing: { shadowColor: Colors.primaryMid, shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  leadingIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontFamily: Fonts.sans,
    color: Colors.text,
    fontSize: 15,
    paddingVertical: 14,
  },
  eyeBtn: { paddingLeft: Spacing.sm },
  error: { fontFamily: Fonts.sans, fontSize: 12, color: Colors.error },
})
