import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  FlatList, Modal, Alert, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useGame } from '@/context/GameContext';
import { useColors } from '@/hooks/use-colors';
import type { ActionCategory, PatientAppearance, ScenarioAction } from '@/types/game';

// ─── カテゴリ設定 ──────────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<ActionCategory, { label: string; emoji: string; color: string }> = {
  measure:   { label: '測定する',     emoji: '📊', color: '#1A6B8A' },
  examine:   { label: '診察する',     emoji: '🔍', color: '#7B4FBE' },
  interview: { label: '問診する',     emoji: '💬', color: '#2E9E6B' },
  treat:     { label: '処置する',     emoji: '💊', color: '#D94040' },
  call:      { label: '呼ぶ',         emoji: '📞', color: '#E8A020' },
  report:    { label: '報告する',     emoji: '📋', color: '#1A6B8A' },
  wait:      { label: '様子を見る',   emoji: '⏳', color: '#6B7A8D' },
};

const APPEARANCE_CONFIG: Record<PatientAppearance, { emoji: string; label: string; bgColor: string }> = {
  normal:      { emoji: '😊', label: '安定', bgColor: '#2E9E6B20' },
  anxious:     { emoji: '😰', label: '不安', bgColor: '#E8A02020' },
  pale:        { emoji: '😨', label: '顔面蒼白', bgColor: '#E8A02030' },
  critical:    { emoji: '😱', label: '重篤', bgColor: '#D9404030' },
  unconscious: { emoji: '😵', label: '意識消失', bgColor: '#8B1A1A30' },
};

const JCS_LABEL = (jcs: number) => {
  if (jcs === 0) return '清明';
  if (jcs <= 3) return `JCS ${jcs}（刺激なし）`;
  if (jcs <= 30) return `JCS ${jcs}（刺激あり）`;
  return `JCS ${jcs}（刺激強）`;
};

export default function SimulationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const {
    gameState, getScenario, getAvailableActions, performAction, finishGame, resetGame
  } = useGame();

  const [selectedCategory, setSelectedCategory] = useState<ActionCategory | 'all'>('all');
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const logScrollRef = useRef<ScrollView>(null);

  const scenario = getScenario(id ?? '');
  const availableActions = getAvailableActions();
  const currentPhase = scenario?.phases.find(p => p.id === gameState.currentPhaseId);

  // ゲーム終了時にリザルト画面へ遷移
  useEffect(() => {
    if (gameState.phase === 'finished' && gameState.result) {
      router.replace({ pathname: '/result/[id]', params: { id: id ?? '' } });
    }
  }, [gameState.phase, gameState.result]);

  // ログ追加時に自動スクロール
  useEffect(() => {
    setTimeout(() => {
      logScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [gameState.actionLog.length]);

  if (!scenario || gameState.phase === 'idle') {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.error }]}>シナリオが読み込めません</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={[styles.backLink, { color: colors.primary }]}>戻る</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const patient = gameState.patientState!;
  const appearance = APPEARANCE_CONFIG[patient.appearance];

  // タイマー表示
  const phaseTimeRemaining = gameState.phaseTimeRemaining;
  const isTimerUrgent = phaseTimeRemaining > 0 && phaseTimeRemaining <= 20;
  const isTimerWarning = phaseTimeRemaining > 0 && phaseTimeRemaining <= 45;
  const timerColor = isTimerUrgent ? colors.error : isTimerWarning ? colors.warning : colors.success;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // フィルタリングされたアクション
  const filteredActions = selectedCategory === 'all'
    ? availableActions
    : availableActions.filter(a => a.category === selectedCategory);

  // 利用可能なカテゴリ
  const availableCategories = Array.from(new Set(availableActions.map(a => a.category)));

  const handleAction = (action: ScenarioAction) => {
    performAction(action.id);
    setLastFeedback(action.feedback);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 3000);
  };

  const handleQuit = () => {
    setShowQuitConfirm(true);
  };

  const confirmQuit = () => {
    finishGame('fail');
    setShowQuitConfirm(false);
  };

  // バイタルの状態色
  const getVitalColor = (type: string, value: number) => {
    switch (type) {
      case 'consciousness': return value === 0 ? colors.success : value <= 3 ? colors.warning : colors.error;
      case 'systolic': return value >= 90 && value <= 140 ? colors.success : value < 90 ? colors.error : colors.warning;
      case 'heartRate': return value >= 60 && value <= 100 ? colors.success : colors.warning;
      case 'spO2': return value >= 95 ? colors.success : value >= 90 ? colors.warning : colors.error;
      case 'glucose': return value >= 70 && value <= 180 ? colors.success : value < 70 ? colors.error : colors.warning;
      default: return colors.foreground;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ─── ヘッダーバー ─── */}
      <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [styles.quitButton, pressed && { opacity: 0.7 }]}
          onPress={handleQuit}
        >
          <Text style={[styles.quitText, { color: colors.error }]}>中断</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={[styles.scenarioName, { color: colors.foreground }]} numberOfLines={1}>
            {scenario.title}
          </Text>
          <Text style={[styles.elapsedTime, { color: colors.muted }]}>
            経過 {formatTime(gameState.elapsedTime)}
          </Text>
        </View>

        {/* タイマー */}
        {currentPhase && currentPhase.timeLimit > 0 && (
          <View style={[styles.timerBadge, { backgroundColor: timerColor + '20', borderColor: timerColor }]}>
            <Text style={[styles.timerText, { color: timerColor }]}>
              {formatTime(phaseTimeRemaining)}
            </Text>
          </View>
        )}
      </View>

      {/* ─── 患者状態パネル ─── */}
      <View style={[styles.patientPanel, { backgroundColor: appearance.bgColor }]}>
        {/* 患者外観 */}
        <View style={styles.patientVisual}>
          <Text style={styles.patientEmoji}>{appearance.emoji}</Text>
          <View>
            <Text style={[styles.patientName, { color: colors.foreground }]}>
              {scenario.patient.name}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statusText, { color: colors.foreground }]}>{appearance.label}</Text>
            </View>
          </View>
        </View>

        {/* バイタルサイン */}
        <View style={styles.vitalsRow}>
          <VitalMini
            label="意識"
            value={JCS_LABEL(patient.consciousness)}
            color={getVitalColor('consciousness', patient.consciousness)}
          />
          <VitalMini
            label="BP"
            value={`${patient.bloodPressure.systolic}/${patient.bloodPressure.diastolic}`}
            color={getVitalColor('systolic', patient.bloodPressure.systolic)}
          />
          <VitalMini
            label="HR"
            value={`${patient.heartRate}`}
            color={getVitalColor('heartRate', patient.heartRate)}
          />
          <VitalMini
            label="SpO₂"
            value={`${patient.spO2}%`}
            color={getVitalColor('spO2', patient.spO2)}
          />
          {patient.bloodGlucose !== null && (
            <VitalMini
              label="血糖"
              value={`${patient.bloodGlucose}`}
              color={getVitalColor('glucose', patient.bloodGlucose)}
            />
          )}
        </View>

        {/* 緊急ヒント */}
        {currentPhase?.urgencyHint && (
          <View style={[styles.urgencyBanner, { backgroundColor: colors.error + '20' }]}>
            <Text style={[styles.urgencyText, { color: colors.error }]}>
              🚨 {currentPhase.urgencyHint}
            </Text>
          </View>
        )}
      </View>

      {/* ─── フェーズ説明 ─── */}
      <View style={[styles.phaseDesc, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.phaseDescText, { color: colors.foreground }]}>
          {currentPhase?.description}
        </Text>
      </View>

      {/* ─── 行動ログ ─── */}
      <ScrollView
        ref={logScrollRef}
        style={[styles.logArea, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.logContent}
        showsVerticalScrollIndicator={false}
      >
        {gameState.actionLog.length === 0 ? (
          <Text style={[styles.logEmpty, { color: colors.muted }]}>
            コマンドを選択してシミュレーションを開始してください
          </Text>
        ) : (
          gameState.actionLog.map((log, index) => (
            <View
              key={log.id}
              style={[
                styles.logEntry,
                {
                  backgroundColor: log.isOptimal ? colors.success + '10' : colors.surface,
                  borderLeftColor: log.isOptimal ? colors.success : log.score < 0 ? colors.error : colors.border,
                }
              ]}
            >
              <View style={styles.logHeader}>
                <Text style={[styles.logAction, { color: colors.foreground }]}>
                  {log.isOptimal ? '✅' : log.score < 0 ? '❌' : '▶'} {log.actionLabel}
                </Text>
                <Text style={[styles.logTime, { color: colors.muted }]}>
                  {formatTime(log.timestamp)}
                </Text>
              </View>
              <Text style={[styles.logFeedback, { color: colors.muted }]}>
                {log.feedback}
              </Text>
              {log.score !== 0 && (
                <Text style={[
                  styles.logScore,
                  { color: log.score > 0 ? colors.success : colors.error }
                ]}>
                  {log.score > 0 ? `+${log.score}` : log.score}pt
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* ─── フィードバックトースト ─── */}
      {showFeedback && lastFeedback && (
        <View style={[styles.feedbackToast, { backgroundColor: colors.foreground + 'F0' }]}>
          <Text style={[styles.feedbackText, { color: colors.background }]} numberOfLines={3}>
            {lastFeedback}
          </Text>
        </View>
      )}

      {/* ─── コマンドメニュー ─── */}
      <View style={[styles.commandArea, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {/* スコア表示 */}
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreLabel, { color: colors.muted }]}>スコア</Text>
          <Text style={[styles.scoreValue, { color: colors.primary }]}>{gameState.totalScore}pt</Text>
        </View>

        {/* カテゴリフィルター */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          <Pressable
            style={[
              styles.categoryChip,
              {
                backgroundColor: selectedCategory === 'all' ? colors.primary : colors.background,
                borderColor: selectedCategory === 'all' ? colors.primary : colors.border,
              }
            ]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[
              styles.categoryChipText,
              { color: selectedCategory === 'all' ? '#FFFFFF' : colors.muted }
            ]}>すべて</Text>
          </Pressable>
          {availableCategories.map(cat => {
            const config = CATEGORY_CONFIG[cat];
            return (
              <Pressable
                key={cat}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: selectedCategory === cat ? config.color : colors.background,
                    borderColor: selectedCategory === cat ? config.color : colors.border,
                  }
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={styles.categoryChipEmoji}>{config.emoji}</Text>
                <Text style={[
                  styles.categoryChipText,
                  { color: selectedCategory === cat ? '#FFFFFF' : colors.muted }
                ]}>{config.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* アクションボタン */}
        <FlatList
          data={filteredActions}
          keyExtractor={item => item.id}
          numColumns={2}
          scrollEnabled={false}
          contentContainerStyle={styles.actionGrid}
          renderItem={({ item: action }) => {
            const catConfig = CATEGORY_CONFIG[action.category];
            const alreadyDone = gameState.actionLog.some(l => l.actionId === action.id);
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  {
                    backgroundColor: alreadyDone ? colors.background : colors.surface,
                    borderColor: alreadyDone ? colors.border : catConfig.color + '60',
                    opacity: alreadyDone ? 0.6 : 1,
                  },
                  pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] },
                ]}
                onPress={() => handleAction(action)}
              >
                <Text style={styles.actionEmoji}>{catConfig.emoji}</Text>
                <Text style={[styles.actionLabel, { color: colors.foreground }]} numberOfLines={2}>
                  {action.label}
                </Text>
                {alreadyDone && (
                  <Text style={[styles.doneMark, { color: colors.muted }]}>✓</Text>
                )}
              </Pressable>
            );
          }}
        />
      </View>

      {/* ─── 中断確認モーダル ─── */}
      <Modal
        visible={showQuitConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuitConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>シミュレーションを中断しますか？</Text>
            <Text style={[styles.modalDesc, { color: colors.muted }]}>
              中断すると「失敗」として記録されます。
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowQuitConfirm(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.foreground }]}>続ける</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.error }]}
                onPress={confirmQuit}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>中断する</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function VitalMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.vitalMini}>
      <Text style={[styles.vitalMiniLabel, { color: '#888' }]}>{label}</Text>
      <Text style={[styles.vitalMiniValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, marginBottom: 12 },
  backLink: { fontSize: 16 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
  },
  quitButton: { width: 50 },
  quitText: { fontSize: 15, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  scenarioName: { fontSize: 15, fontWeight: '700' },
  elapsedTime: { fontSize: 11, marginTop: 2 },
  timerBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1.5,
    minWidth: 60,
    alignItems: 'center',
  },
  timerText: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  patientPanel: { padding: 12 },
  patientVisual: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  patientEmoji: { fontSize: 44 },
  patientName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: '600' },
  vitalsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  vitalMini: { alignItems: 'center', minWidth: 52 },
  vitalMiniLabel: { fontSize: 10, marginBottom: 2 },
  vitalMiniValue: { fontSize: 14, fontWeight: '700' },
  urgencyBanner: { borderRadius: 10, padding: 8, marginTop: 10 },
  urgencyText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  phaseDesc: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  phaseDescText: { fontSize: 13, lineHeight: 19 },
  logArea: { flex: 1, maxHeight: 160 },
  logContent: { padding: 12, gap: 8 },
  logEmpty: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  logEntry: {
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
  },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  logAction: { fontSize: 13, fontWeight: '700', flex: 1 },
  logTime: { fontSize: 11 },
  logFeedback: { fontSize: 12, lineHeight: 18 },
  logScore: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  feedbackToast: {
    position: 'absolute',
    bottom: 280,
    left: 16,
    right: 16,
    borderRadius: 14,
    padding: 14,
    zIndex: 100,
  },
  feedbackText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  commandArea: {
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 280,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 6,
    gap: 6,
  },
  scoreLabel: { fontSize: 12 },
  scoreValue: { fontSize: 18, fontWeight: '800' },
  categoryScroll: { paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    gap: 4,
  },
  categoryChipEmoji: { fontSize: 14 },
  categoryChipText: { fontSize: 12, fontWeight: '600' },
  actionGrid: { paddingHorizontal: 12, gap: 8 },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    gap: 4,
    margin: 2,
  },
  actionEmoji: { fontSize: 20 },
  actionLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  doneMark: { fontSize: 12, position: 'absolute', top: 4, right: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  modalDesc: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalButtonText: { fontSize: 15, fontWeight: '700' },
});
