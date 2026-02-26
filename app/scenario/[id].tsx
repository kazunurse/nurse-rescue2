import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useGame } from '@/context/GameContext';
import { useColors } from '@/hooks/use-colors';
import { DIFFICULTY_LABELS, CATEGORY_LABELS } from '@/types/game';
import type { Category } from '@/types/game';

const CATEGORY_ICONS: Record<Category, string> = {
  endocrine:     '🩸',
  respiratory:   '🫁',
  cardiovascular:'❤️',
  neurological:  '🧠',
  infection:     '🦠',
  trauma:        '🩹',
  allergy:       '⚠️',
  other:         '📋',
};

export default function ScenarioDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { getScenario, startScenario } = useGame();

  const scenario = getScenario(id ?? '');

  if (!scenario) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.error }]}>シナリオが見つかりません</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={[styles.backLink, { color: colors.primary }]}>戻る</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const diffColor =
    scenario.difficulty === 'beginner' ? '#2E9E6B' :
    scenario.difficulty === 'intermediate' ? '#E8A020' : '#D94040';

  const handleStart = () => {
    startScenario(scenario.id);
    router.push({ pathname: '/simulation/[id]', params: { id: scenario.id } });
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* ナビゲーションバー */}
      <View style={[styles.navBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, { color: colors.primary }]}>‹ 戻る</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>シナリオ詳細</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ヒーローセクション */}
        <View style={[styles.heroSection, { backgroundColor: diffColor + '15' }]}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroEmoji}>
              {CATEGORY_ICONS[scenario.category as Category]}
            </Text>
            <Text style={[styles.categoryLabel, { color: colors.muted }]}>
              {CATEGORY_LABELS[scenario.category as Category]}
            </Text>
            <View style={[styles.diffBadge, { backgroundColor: diffColor }]}>
              <Text style={styles.diffBadgeText}>{DIFFICULTY_LABELS[scenario.difficulty]}</Text>
            </View>
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>{scenario.title}</Text>
          <Text style={[styles.heroSubtitle, { color: colors.muted }]}>{scenario.subtitle}</Text>
          <Text style={[styles.heroDesc, { color: colors.foreground }]}>{scenario.description}</Text>

          <View style={styles.heroMeta}>
            <View style={[styles.metaChip, { backgroundColor: colors.surface }]}>
              <Text style={[styles.metaChipText, { color: colors.muted }]}>⏱ 制限時間 {Math.floor(scenario.timeLimit / 60)}分</Text>
            </View>
            <View style={[styles.metaChip, { backgroundColor: colors.surface }]}>
              <Text style={[styles.metaChipText, { color: colors.muted }]}>📋 約{scenario.estimatedMinutes}分</Text>
            </View>
          </View>
        </View>

        {/* 患者情報 */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>👤 患者情報</Text>

          <View style={styles.patientGrid}>
            <View style={styles.patientRow}>
              <Text style={[styles.patientLabel, { color: colors.muted }]}>氏名</Text>
              <Text style={[styles.patientValue, { color: colors.foreground }]}>{scenario.patient.name}</Text>
            </View>
            <View style={styles.patientRow}>
              <Text style={[styles.patientLabel, { color: colors.muted }]}>年齢・性別</Text>
              <Text style={[styles.patientValue, { color: colors.foreground }]}>
                {scenario.patient.age}歳・{scenario.patient.gender === 'female' ? '女性' : '男性'}
              </Text>
            </View>
            <View style={styles.patientRow}>
              <Text style={[styles.patientLabel, { color: colors.muted }]}>病室</Text>
              <Text style={[styles.patientValue, { color: colors.foreground }]}>{scenario.patient.ward}</Text>
            </View>
            <View style={[styles.patientRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.patientLabel, { color: colors.muted }]}>主訴</Text>
              <Text style={[styles.patientValue, { color: colors.error, fontWeight: '700' }]}>
                {scenario.patient.chiefComplaint}
              </Text>
            </View>
          </View>

          <View style={[styles.historySection, { backgroundColor: colors.background }]}>
            <Text style={[styles.historySectionTitle, { color: colors.muted }]}>既往歴・現在の指示</Text>
            {scenario.patient.medicalHistory.map((h, i) => (
              <Text key={i} style={[styles.historyItem, { color: colors.foreground }]}>・{h}</Text>
            ))}
            <Text style={[styles.currentOrders, { color: colors.primary }]}>
              📋 {scenario.patient.currentOrders}
            </Text>
          </View>
        </View>

        {/* 初期バイタル */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>📊 初期バイタルサイン</Text>
          <View style={styles.vitalsGrid}>
            <VitalItem
              label="意識レベル"
              value={`JCS ${scenario.initialState.consciousness}`}
              status={scenario.initialState.consciousness > 0 ? 'warning' : 'normal'}
              colors={colors}
            />
            <VitalItem
              label="血圧"
              value={`${scenario.initialState.bloodPressure.systolic}/${scenario.initialState.bloodPressure.diastolic}`}
              unit="mmHg"
              status={scenario.initialState.bloodPressure.systolic < 90 ? 'danger' : 'normal'}
              colors={colors}
            />
            <VitalItem
              label="心拍数"
              value={`${scenario.initialState.heartRate}`}
              unit="回/分"
              status={scenario.initialState.heartRate > 100 ? 'warning' : 'normal'}
              colors={colors}
            />
            <VitalItem
              label="SpO₂"
              value={`${scenario.initialState.spO2}`}
              unit="%"
              status={scenario.initialState.spO2 < 90 ? 'danger' : scenario.initialState.spO2 < 95 ? 'warning' : 'normal'}
              colors={colors}
            />
            <VitalItem
              label="体温"
              value={`${scenario.initialState.temperature}`}
              unit="℃"
              status="normal"
              colors={colors}
            />
            <VitalItem
              label="呼吸数"
              value={`${scenario.initialState.respiratoryRate}`}
              unit="回/分"
              status={scenario.initialState.respiratoryRate > 25 ? 'warning' : 'normal'}
              colors={colors}
            />
          </View>
        </View>

        {/* 注意事項 */}
        <View style={[styles.warningCard, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
          <Text style={[styles.warningTitle, { color: colors.warning }]}>⚠️ シミュレーション開始前に</Text>
          <Text style={[styles.warningText, { color: colors.foreground }]}>
            このシミュレーションでは、あなたの選択によって患者の状態がリアルタイムに変化します。
            迅速かつ適切なアセスメントと処置を行ってください。
            タイマーが切れると患者の状態が悪化することがあります。
          </Text>
        </View>

        {/* 開始ボタン */}
        <Pressable
          style={({ pressed }) => [
            styles.startButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
          onPress={handleStart}
        >
          <Text style={styles.startButtonText}>🚨 シミュレーション開始</Text>
        </Pressable>

        <View style={{ height: 32 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

function VitalItem({
  label, value, unit, status, colors
}: {
  label: string;
  value: string;
  unit?: string;
  status: 'normal' | 'warning' | 'danger';
  colors: ReturnType<typeof useColors>;
}) {
  const statusColor =
    status === 'danger' ? colors.error :
    status === 'warning' ? colors.warning :
    colors.success;

  return (
    <View style={[styles.vitalItem, { backgroundColor: colors.background, borderColor: statusColor + '40' }]}>
      <Text style={[styles.vitalLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.vitalValue, { color: statusColor }]}>{value}</Text>
      {unit && <Text style={[styles.vitalUnit, { color: colors.muted }]}>{unit}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, marginBottom: 12 },
  backLink: { fontSize: 16 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { width: 60 },
  backButtonText: { fontSize: 17, fontWeight: '600' },
  navTitle: { fontSize: 17, fontWeight: '700' },
  scrollContent: { paddingBottom: 32 },
  heroSection: { padding: 20, marginBottom: 0 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 },
  categoryLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  heroEmoji: { fontSize: 48 },
  diffBadge: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6 },
  diffBadgeText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  heroTitle: { fontSize: 28, fontWeight: '800', marginBottom: 6 },
  heroSubtitle: { fontSize: 16, marginBottom: 12 },
  heroDesc: { fontSize: 14, lineHeight: 22, marginBottom: 16 },
  heroMeta: { flexDirection: 'row', gap: 8 },
  metaChip: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  metaChipText: { fontSize: 13 },
  card: {
    margin: 16,
    marginTop: 0,
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  patientGrid: {},
  patientRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  patientLabel: { width: 100, fontSize: 13, fontWeight: '600' },
  patientValue: { flex: 1, fontSize: 14 },
  historySection: { borderRadius: 12, padding: 12, marginTop: 12 },
  historySectionTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  historyItem: { fontSize: 13, lineHeight: 22 },
  currentOrders: { fontSize: 13, marginTop: 8, fontWeight: '600' },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vitalItem: {
    width: '30%',
    flex: 1,
    minWidth: 90,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  vitalLabel: { fontSize: 10, marginBottom: 4, textAlign: 'center' },
  vitalValue: { fontSize: 18, fontWeight: '800' },
  vitalUnit: { fontSize: 10, marginTop: 2 },
  warningCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  warningTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  warningText: { fontSize: 13, lineHeight: 20 },
  startButton: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
});
