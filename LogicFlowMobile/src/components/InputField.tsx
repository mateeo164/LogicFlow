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

// NO cambiar el estilo del contenedor al enfocar (nada de estado `focused`).
// En Android + Nueva Arquitectura, alternar sombra/`elevation` o fondo en el
// ancestro de un TextInput enfocado resetea la conexión con el teclado: el
// campo pierde el foco, Android se lo pasa al otro input y se genera un rebote
// infinito sin que el teclado alcance a abrir. El resalte se hace solo con el
// borde (color estático según error), que sí es seguro.
export function InputField({ label, error, isPassword, icon, style, ...props }: Props) {
  const [visible, setVisible] = useState(false)

  const borderColor = error ? Colors.error : Colors.border

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, { borderColor }]}>
        {icon ? <Ionicons name={icon} size={18} color={Colors.textMuted} style={styles.leadingIcon} /> : null}
        <TextInput
          style={[styles.input, style as any]}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={isPassword && !visible}
          autoCapitalize="none"
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
    backgroundColor: Colors.surfaceAlt,
  },
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
