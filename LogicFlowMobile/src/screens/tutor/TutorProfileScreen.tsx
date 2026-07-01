import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Screen, PageHeader, Pill } from '../../components/ui'
import { GradientCard } from '../../components/GradientCard'
import { PrimaryButton } from '../../components/PrimaryButton'
import { Colors, Spacing, Typography, Radius, Fonts, Shadow } from '../../constants/theme'
import { useAuth } from '../../hooks/useAuth'
import { signOut } from '../../services/auth'

export function TutorProfileScreen() {
  const { userName, userEmail, userInstitucion } = useAuth()
  const [signingOut, setSigningOut] = React.useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <Screen>
      <PageHeader overline="CUENTA" title="Perfil" />

      <GradientCard style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{userName}</Text>
        <Pill label="Docente" tone="accent" style={{ marginTop: 4 }} />
        <View style={styles.infoBlock}>
          <InfoRow label="Correo" value={userEmail} />
          {userInstitucion ? <InfoRow label="Institución" value={userInstitucion} /> : null}
        </View>
      </GradientCard>

      <PrimaryButton label="Cerrar sesión" onPress={handleSignOut} loading={signingOut} variant="danger" style={{ marginTop: Spacing.lg }} />
    </Screen>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 4 },
  avatar: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.primaryDeep,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs, ...Shadow.md,
  },
  avatarText: { fontFamily: Fonts.serif, fontSize: 28, color: Colors.textInverse },
  name: { ...Typography.h2 },
  infoBlock: { alignSelf: 'stretch', marginTop: Spacing.md, gap: 0 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  infoLabel: { ...Typography.caption },
  infoValue: { fontFamily: Fonts.sansSemi, fontSize: 14, color: Colors.text, maxWidth: '60%' },
})
