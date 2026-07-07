import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams } from 'expo-router'
import { PC_COMPONENTS, PCComponent } from '../../constants/components'
import { Colors, Spacing, Typography, Radius, Fonts, Shadow } from '../../constants/theme'
import { GradientCard } from '../../components/GradientCard'
import { Pill } from '../../components/ui'

type Tab = 'descripcion' | 'analogia' | 'quiz'

function ComponentDetail({ component, onNext }: { component: PCComponent; onNext: () => void }) {
  const [tab, setTab] = useState<Tab>('descripcion')
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null)
  const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null)

  const tabs: { id: Tab; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { id: 'descripcion', label: 'Info', icon: 'document-text-outline' },
    { id: 'analogia', label: 'Analogía', icon: 'bulb-outline' },
    { id: 'quiz', label: 'Quiz', icon: 'help-circle-outline' },
  ]

  function handleAnswer(idx: number) {
    if (quizAnswer !== null) return
    setQuizAnswer(idx)
    setQuizFeedback(idx === component.quizAnswerIndex ? 'correct' : 'wrong')
  }

  return (
    <View style={detail.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={detail.scroll}>
        <View style={detail.hero}>
          <View style={detail.heroIcon}>
            <Text style={{ fontSize: 48 }}>{component.icon}</Text>
          </View>
          <Text style={detail.name}>{component.label}</Text>
          <View style={detail.heroMeta}>
            <Pill label={`Paso ${component.assemblyStep} de ${PC_COMPONENTS.length}`} tone="navy" />
            <Pill label={`+${component.xpValue} XP`} tone="accent" />
          </View>
        </View>

        {/* Segmented tabs */}
        <View style={detail.tabs}>
          {tabs.map(t => {
            const active = tab === t.id
            return (
              <TouchableOpacity
                key={t.id}
                style={[detail.tab, active && detail.tabActive]}
                onPress={() => setTab(t.id)}
                activeOpacity={0.8}
              >
                <Ionicons name={t.icon} size={15} color={active ? Colors.textInverse : Colors.textSecondary} />
                <Text style={[detail.tabText, active && detail.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {tab === 'descripcion' && (
          <View style={{ gap: Spacing.md }}>
            <Text style={detail.sectionTitle}>¿Qué es?</Text>
            <Text style={detail.bodyText}>{component.fullDesc}</Text>

            <Text style={detail.sectionTitle}>Especificaciones</Text>
            <GradientCard padded={false} style={detail.specCard}>
              {component.specs.map((s, i) => (
                <View key={i} style={[detail.specRow, i === component.specs.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={detail.specLabel}>{s.label}</Text>
                  <Text style={detail.specValue}>{s.value}</Text>
                </View>
              ))}
            </GradientCard>

            <GradientCard tone="navy">
              <View style={detail.calloutHead}>
                <Ionicons name="construct-outline" size={17} color={Colors.primaryDeep} />
                <Text style={[detail.calloutTitle, { color: Colors.primaryDeep }]}>Consejo de instalación</Text>
              </View>
              <Text style={detail.calloutText}>{component.assemblyHint}</Text>
            </GradientCard>

            <GradientCard tone="accent">
              <View style={detail.calloutHead}>
                <Ionicons name="sparkles-outline" size={17} color={Colors.accentDeep} />
                <Text style={[detail.calloutTitle, { color: Colors.accentDeep }]}>Dato curioso</Text>
              </View>
              <Text style={[detail.calloutText, { color: '#6b4416' }]}>{component.funFact}</Text>
            </GradientCard>
          </View>
        )}

        {tab === 'analogia' && (
          <View style={{ gap: Spacing.md }}>
            <Text style={detail.bodyText}>
              Las analogías ayudan a entender componentes complejos comparándolos con cosas cotidianas.
            </Text>
            <GradientCard tone="success" style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 38, marginBottom: Spacing.sm }}>🏛️</Text>
              <Text style={[detail.bodyText, { textAlign: 'center', color: Colors.text }]}>{component.analogy}</Text>
            </GradientCard>
            <Text style={detail.sectionTitle}>¿Por qué funciona?</Text>
            <Text style={detail.bodyText}>
              Al comparar el {component.label} con algo familiar, el cerebro construye un modelo mental más sólido.
              Cuando veas un concepto técnico nuevo, intenta encontrar tu propia analogía.
            </Text>
          </View>
        )}

        {tab === 'quiz' && (
          <View style={{ gap: Spacing.md }}>
            <Text style={detail.sectionTitle}>Pregunta de comprensión</Text>
            <Text style={detail.bodyText}>{component.quizQuestion}</Text>
            {component.quizOptions.map((opt, idx) => {
              let bg: string = Colors.surface
              let bc: string = Colors.border
              let letterBg: string = Colors.surfaceSunken
              let letterFg: string = Colors.textSecondary
              if (quizAnswer !== null) {
                if (idx === component.quizAnswerIndex) { bg = Colors.successSoft; bc = Colors.success; letterBg = Colors.success; letterFg = Colors.textInverse }
                else if (idx === quizAnswer) { bg = Colors.errorSoft; bc = Colors.error; letterBg = Colors.error; letterFg = Colors.textInverse }
              }
              return (
                <TouchableOpacity
                  key={idx}
                  style={[detail.option, { backgroundColor: bg, borderColor: bc }]}
                  onPress={() => handleAnswer(idx)}
                  disabled={quizAnswer !== null}
                  activeOpacity={0.85}
                >
                  <View style={[detail.optionLetter, { backgroundColor: letterBg }]}>
                    <Text style={[detail.optionLetterText, { color: letterFg }]}>{String.fromCharCode(65 + idx)}</Text>
                  </View>
                  <Text style={detail.optionText}>{opt}</Text>
                </TouchableOpacity>
              )
            })}
            {quizFeedback && (
              <GradientCard tone={quizFeedback === 'correct' ? 'success' : 'danger'}>
                <Text style={[detail.feedbackText, { color: quizFeedback === 'correct' ? Colors.success : Colors.error }]}>
                  {quizFeedback === 'correct'
                    ? '¡Correcto! Excelente comprensión del componente.'
                    : `La respuesta correcta es: "${component.quizOptions[component.quizAnswerIndex]}"`}
                </Text>
              </GradientCard>
            )}
          </View>
        )}

        <TouchableOpacity style={detail.nextBtn} onPress={onNext} activeOpacity={0.9}>
          <Text style={detail.nextText}>Siguiente componente</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.textInverse} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

export function LearnScreen() {
  const params = useLocalSearchParams<{ componentId?: string }>()
  const initialIdx = params.componentId ? PC_COMPONENTS.findIndex(c => c.id === params.componentId) : 0
  const [selectedIdx, setSelectedIdx] = useState(Math.max(0, initialIdx))
  const [view, setView] = useState<'list' | 'detail'>(params.componentId ? 'detail' : 'list')

  if (view === 'detail') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TouchableOpacity style={styles.backHeader} onPress={() => setView('list')} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          <Text style={styles.backText}>Componentes</Text>
        </TouchableOpacity>
        <ComponentDetail
          component={PC_COMPONENTS[selectedIdx]}
          onNext={() => setSelectedIdx(i => (i + 1) % PC_COMPONENTS.length)}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={PC_COMPONENTS}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={Typography.overline}>BIBLIOTECA</Text>
            <Text style={Typography.h1}>Aprende</Text>
            <Text style={styles.listSub}>{PC_COMPONENTS.length} componentes esenciales, explicados paso a paso.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Pressable
            style={({ pressed }) => [styles.card, Shadow.sm, pressed && { transform: [{ scale: 0.99 }] }]}
            onPress={() => { setSelectedIdx(index); setView('detail') }}
          >
            <View style={styles.cardIcon}>
              <Text style={{ fontSize: 30 }}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardStep}>PASO {item.assemblyStep}</Text>
              <Text style={styles.cardName}>{item.label}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{item.shortDesc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </Pressable>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  listContent: { padding: Spacing.md, paddingBottom: 120, gap: Spacing.sm },
  listHeader: { marginBottom: Spacing.sm, gap: 2 },
  listSub: { ...Typography.caption, marginTop: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md,
  },
  cardIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: Colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  cardStep: { ...Typography.overline, color: Colors.accent, marginBottom: 2 },
  cardName: { fontFamily: Fonts.sansBold, fontSize: 15.5, color: Colors.text },
  cardDesc: { ...Typography.caption, marginTop: 2 },
  backHeader: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backText: { fontFamily: Fonts.sansSemi, fontSize: 15, color: Colors.primary },
})

const detail = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: 120 },
  hero: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  heroIcon: { width: 88, height: 88, borderRadius: 26, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', ...Shadow.md },
  name: { ...Typography.h1, textAlign: 'center' },
  heroMeta: { flexDirection: 'row', gap: Spacing.sm },
  tabs: { flexDirection: 'row', backgroundColor: Colors.surfaceSunken, borderRadius: Radius.md, padding: 4, marginBottom: Spacing.lg, gap: 4 },
  tab: { flex: 1, flexDirection: 'row', gap: 5, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm },
  tabActive: { backgroundColor: Colors.primaryDeep, ...Shadow.sm },
  tabText: { fontFamily: Fonts.sansSemi, fontSize: 13, color: Colors.textSecondary },
  tabTextActive: { color: Colors.textInverse },
  sectionTitle: { fontFamily: Fonts.serif, fontSize: 19, color: Colors.text, letterSpacing: -0.2 },
  bodyText: { ...Typography.body, color: Colors.textSecondary, lineHeight: 23 },
  specCard: { overflow: 'hidden' },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  specLabel: { ...Typography.caption },
  specValue: { fontFamily: Fonts.sansSemi, fontSize: 14, color: Colors.primary, maxWidth: '58%', textAlign: 'right' },
  calloutHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  calloutTitle: { fontFamily: Fonts.sansBold, fontSize: 14 },
  calloutText: { fontFamily: Fonts.sans, fontSize: 14, color: Colors.text, lineHeight: 22 },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, ...Shadow.sm },
  optionLetter: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  optionLetterText: { fontFamily: Fonts.sansBold, fontSize: 13 },
  optionText: { fontFamily: Fonts.sans, fontSize: 14.5, flex: 1, color: Colors.text, lineHeight: 21 },
  feedbackText: { fontFamily: Fonts.sansSemi, fontSize: 14, lineHeight: 21 },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primaryDeep, borderRadius: Radius.md, paddingVertical: 16, marginTop: Spacing.lg, ...Shadow.sm,
  },
  nextText: { fontFamily: Fonts.sansBold, fontSize: 15, color: Colors.textInverse },
})
