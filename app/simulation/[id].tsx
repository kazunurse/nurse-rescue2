'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  FlatList, Modal, Platform, Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useGame } from '@/context/GameContext';
import { useColors } from '@/hooks/use-colors';
import type { ActionCategory, PatientAppearance, ScenarioAction, LabData } from '@/types/game';

// ─── カテゴリ設定（assessを追加） ─────────────────────────────────────────────
const CATEGORY_CONFIG: Record<ActionCategory, { label: string; emoji: string; color: string }> = {
  assess:    { label: 'アセスメント', emoji: '🔎', color: '#0F4C75' },
  measure:   { label: '測定する',     emoji: '📊', color: '#1A6B8A' },
  examine:   { label: '診察する',     emoji: '🩺', color: '#7B4FBE' },
  interview: { label: '問診する',     emoji: '💬', color: '#2E9E6B' },
  treat:     { label: '処置する',     emoji: '💊', color: '#D94040' },
  call:      { label: '呼ぶ',         emoji: '📞', color: '#E8A020' },
  report:    { label: '報告・記録',   emoji: '📋', color: '#4A7C9E' },
  wait:      { label: '様子を見る',   emoji: '⏳', color: '#6B7A8D' },
};

const APPEARANCE_CONFIG: Record<PatientAppearance, { emoji: string; label: string; bgColor: string; borderColor: string }> = {
  normal:      { emoji: '😊', label: '安定',     bgColor: '#2E9E6B15', borderColor: '#2E9E6B40' },
  anxious:     { emoji: '😰', label: '不安',     bgColor: '#E8A02015', borderColor: '#E8A02040' },
  pale:        { emoji: '😨', label: '顔面蒼白', bgColor: '#E8A02025', borderColor: '#E8A02060' },
  critical:    { emoji: '😱', label: '重篤',     bgColor: '#D9404025', borderColor: '#D9404060' },
  unconscious: { emoji: '😵', label: '意識消失', bgColor: '#8B1A1A30', borderColor: '#8B1A1A80' },
};

const JCS_LABEL = (jcs: number) => {
  if (jcs === 0) return '清明';
  if (jcs === 1) return 'JCS 1（開眼）';
  if (jcs === 2) return 'JCS 2（声かけ）';
  if (jcs === 3) return 'JCS 3（刺激なし）';
  if (jcs === 10) return 'JCS 10（呼びかけ）';
  if (jcs === 20) return 'JCS 20（刺激あり）';
  if (jcs === 30) return 'JCS 30（痛み）';
  if (jcs === 100) return 'JCS 100（払いのけ）';
  if (jcs === 200) return 'JCS 200（四肢屈曲）';
  if (jcs === 300) return 'JCS 300（反応なし）';
  return `JCS ${jcs}`;
};

export default function SimulationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const {
    gameState, getScenario, getAvailableActions, performAction, finishGame, resetGame
  } = useGame();

  const [selectedCategory, setSelectedCategory] = useState<ActionCategory | 'all'>('all');
  const [lastFeedback, setLastFeedback] = useState<{ text: string; isOptimal: boolean; score: number } | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showLabData, setShowLabData] = useState(false);
  const [labDataTab, setLabDataTab] = useState<'blood' | 'ecg' | 'imaging'>('blood');
  const logScrollRef = useRef<ScrollView>(null);
  const feedbackOpacity = useRef(new Animated.Value(0)).current;

  const scenario = getScenario(id ?? '');
  const availableActions = getAvailableActions();
  const currentPhase = scenario?.phases.find(p => p.id === gameState.currentPhaseId);
  const labData = scenario?.labData as LabData | undefined;

  // 開示済み検査データの判定
  const isBloodRevealed = labData?.bloodTest?.available &&
    labData.bloodTest.revealedByAction &&
    gameState.revealedLabData.includes(labData.bloodTest.revealedByAction);
  const isEcgRevealed = labData?.ecg?.available &&
    labData.ecg.revealedByAction &&
    gameState.revealedLabData.includes(labData.ecg.revealedByAction);
  const isImagingRevealed = labData?.imaging?.available &&
    labData.imaging.revealedByAction &&
    gameState.revealedLabData.includes(labData.imaging.revealedByAction);
  const hasAnyLabData = isBloodRevealed || isEcgRevealed || isImagingRevealed;

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

  // フィードバックアニメーション
  useEffect(() => {
    if (showFeedback) {
      Animated.sequence([
        Animated.timing(feedbackOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(feedbackOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setShowFeedback(false));
    }
  }, [showFeedback]);

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
  const isTimerUrgent = phaseTimeRemaining > 0 && phaseTimeRemaining <= 15;
  const isTimerWarning = phaseTimeRemaining > 0 && phaseTimeRemaining <= 40;
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

  // 利用可能なカテゴリ（順序固定）
  const categoryOrder: ActionCategory[] = ['assess', 'measure', 'examine', 'interview', 'treat', 'call', 'report', 'wait'];
  const availableCategories = categoryOrder.filter(c =>
    availableActions.some(a => a.category === c)
  );

  const handleAction = (action: ScenarioAction) => {
    performAction(action.id);
    setLastFeedback({ text: action.feedback, isOptimal: action.isOptimal, score: action.score });
    setShowFeedback(true);
    feedbackOpacity.setValue(0);
  };

  const handleQuit = () => setShowQuitConfirm(true);
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

  // 患者状態の深刻度
  const severityLevel = (() => {
    if (patient.appearance === 'unconscious') return 'critical';
    if (patient.appearance === 'critical') return 'serious';
    if (patient.bloodPressure.systolic < 90 || patient.spO2 < 90 || patient.consciousness >= 100) return 'serious';
    if (patient.bloodPressure.systolic < 100 || patient.spO2 < 95 || patient.consciousness >= 10) return 'warning';
    return 'stable';
  })();

  const severityBorderColor = {
    critical: colors.error,
    serious: '#D94040',
    warning: colors.warning,
    stable: '#2E9E6B',
  }[severityLevel];

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

        <View style={styles.headerRight}>
          {/* 検査データボタン */}
          {hasAnyLabData && (
            <Pressable
              style={[styles.labButton, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
              onPress={() => setShowLabData(true)}
            >
              <Text style={[styles.labButtonText, { color: colors.primary }]}>🧪</Text>
            </Pressable>
          )}
          {/* タイマー */}
          {currentPhase && currentPhase.timeLimit > 0 && (
            <View style={[styles.timerBadge, { backgroundColor: timerColor + '20', borderColor: timerColor }]}>
              <Text style={[styles.timerText, { color: timerColor }]}>
                {formatTime(phaseTimeRemaining)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ─── 患者状態パネル（状態悪化で枠線変化） ─── */}
      <View style={[
        styles.patientPanel,
        { backgroundColor: appearance.bgColor, borderBottomColor: severityBorderColor, borderBottomWidth: 2 }
      ]}>
        {/* 患者外観 */}
        <View style={styles.patientVisual}>
          <View style={[styles.patientEmojiContainer, { borderColor: severityBorderColor }]}>
            <Text style={styles.patientEmoji}>{appearance.emoji}</Text>
          </View>
          <View style={styles.patientInfo}>
            <Text style={[styles.patientName, { color: colors.foreground }]}>
              {scenario.patient.name}（{scenario.patient.age}歳）
            </Text>
            <Text style={[styles.chiefComplaint, { color: colors.muted }]} numberOfLines={1}>
              {scenario.patient.chiefComplaint}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: severityBorderColor + '25', borderColor: severityBorderColor }]}>
              <Text style={[styles.statusText, { color: severityBorderColor }]}>{appearance.label}</Text>
            </View>
          </View>
          <View style={styles.scoreCompact}>
            <Text style={[styles.scoreCompactValue, { color: colors.primary }]}>{gameState.totalScore}</Text>
            <Text style={[styles.scoreCompactLabel, { color: colors.muted }]}>pt</Text>
          </View>
        </View>

        {/* バイタルサイン */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vitalsScroll}>
          <View style={styles.vitalsRow}>
            <VitalChip
              label="意識"
              value={JCS_LABEL(patient.consciousness)}
              color={getVitalColor('consciousness', patient.consciousness)}
              bgColor={colors.surface}
            />
            <VitalChip
              label="血圧"
              value={`${patient.bloodPressure.systolic}/${patient.bloodPressure.diastolic}`}
              color={getVitalColor('systolic', patient.bloodPressure.systolic)}
              bgColor={colors.surface}
            />
            <VitalChip
              label="脈拍"
              value={`${patient.heartRate}/分`}
              color={getVitalColor('heartRate', patient.heartRate)}
              bgColor={colors.surface}
            />
            <VitalChip
              label="SpO₂"
              value={`${patient.spO2}%`}
              color={getVitalColor('spO2', patient.spO2)}
              bgColor={colors.surface}
            />
            {patient.bloodGlucose !== null && (
              <VitalChip
                label="血糖"
                value={`${patient.bloodGlucose}mg/dL`}
                color={getVitalColor('glucose', patient.bloodGlucose)}
                bgColor={colors.surface}
              />
            )}
            {patient.temperature > 0 && (
              <VitalChip
                label="体温"
                value={`${patient.temperature}℃`}
                color={patient.temperature >= 37.5 ? colors.warning : colors.success}
                bgColor={colors.surface}
              />
            )}
            {patient.respiratoryRate > 0 && (
              <VitalChip
                label="呼吸数"
                value={`${patient.respiratoryRate}/分`}
                color={patient.respiratoryRate >= 25 ? colors.error : patient.respiratoryRate >= 20 ? colors.warning : colors.success}
                bgColor={colors.surface}
              />
            )}
          </View>
        </ScrollView>

        {/* 緊急ヒント */}
        {currentPhase?.urgencyHint && (
          <View style={[styles.urgencyBanner, { backgroundColor: colors.error + '20', borderColor: colors.error + '40' }]}>
            <Text style={[styles.urgencyText, { color: colors.error }]}>
              🚨 {currentPhase.urgencyHint}
            </Text>
          </View>
        )}
      </View>

      {/* ─── フェーズ説明 ─── */}
      <View style={[styles.phaseDesc, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.phaseDescText, { color: colors.foreground }]}>
          📋 {currentPhase?.description}
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
          gameState.actionLog.map((log) => (
            <View
              key={log.id}
              style={[
                styles.logEntry,
                {
                  backgroundColor: log.isOptimal ? colors.success + '10' : log.score < 0 ? colors.error + '10' : colors.surface,
                  borderLeftColor: log.isOptimal ? colors.success : log.score < 0 ? colors.error : colors.border,
                }
              ]}
            >
              <View style={styles.logHeader}>
                <Text style={[styles.logAction, { color: colors.foreground }]}>
                  {log.isOptimal ? '✅' : log.score < 0 ? '❌' : '▶'} {log.actionLabel}
                </Text>
                <View style={styles.logMeta}>
                  {log.score !== 0 && (
                    <Text style={[styles.logScore, { color: log.score > 0 ? colors.success : colors.error }]}>
                      {log.score > 0 ? `+${log.score}` : log.score}pt
                    </Text>
                  )}
                  <Text style={[styles.logTime, { color: colors.muted }]}>
                    {formatTime(log.timestamp)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.logFeedback, { color: colors.muted }]}>
                {log.feedback}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* ─── フィードバックトースト ─── */}
      {showFeedback && lastFeedback && (
        <Animated.View style={[
          styles.feedbackToast,
          {
            backgroundColor: lastFeedback.isOptimal ? colors.success + 'F0' : lastFeedback.score < 0 ? colors.error + 'F0' : colors.foreground + 'F0',
            opacity: feedbackOpacity,
          }
        ]}>
          <Text style={styles.feedbackToastIcon}>
            {lastFeedback.isOptimal ? '✅' : lastFeedback.score < 0 ? '❌' : '▶'}
          </Text>
          <Text style={[styles.feedbackText, { color: '#FFFFFF' }]} numberOfLines={4}>
            {lastFeedback.text}
          </Text>
        </Animated.View>
      )}

      {/* ─── コマンドメニュー ─── */}
      <View style={[styles.commandArea, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {/* カテゴリフィルター */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {availableCategories.map(cat => {
            const config = CATEGORY_CONFIG[cat];
            const isSelected = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected ? config.color : colors.background,
                    borderColor: isSelected ? config.color : colors.border,
                  }
                ]}
                onPress={() => setSelectedCategory(isSelected ? 'all' : cat)}
              >
                <Text style={styles.categoryChipEmoji}>{config.emoji}</Text>
                <Text style={[
                  styles.categoryChipText,
                  { color: isSelected ? '#FFFFFF' : colors.muted }
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
                    borderColor: alreadyDone ? colors.border : catConfig.color + '80',
                  },
                  pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] },
                ]}
                onPress={() => handleAction(action)}
              >
                <Text style={styles.actionEmoji}>{catConfig.emoji}</Text>
                <Text style={[styles.actionLabel, { color: alreadyDone ? colors.muted : colors.foreground }]} numberOfLines={2}>
                  {action.label}
                </Text>
                {alreadyDone && (
                  <View style={[styles.doneOverlay, { backgroundColor: colors.border + '80' }]}>
                    <Text style={[styles.doneMark, { color: colors.muted }]}>✓ 実施済</Text>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      </View>

      {/* ─── 検査データモーダル ─── */}
      <Modal
        visible={showLabData}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLabData(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.labModal, { backgroundColor: colors.surface }]}>
            <View style={styles.labModalHeader}>
              <Text style={[styles.labModalTitle, { color: colors.foreground }]}>🧪 検査データ</Text>
              <Pressable onPress={() => setShowLabData(false)}>
                <Text style={[styles.labModalClose, { color: colors.muted }]}>✕</Text>
              </Pressable>
            </View>

            {/* タブ */}
            <View style={[styles.labTabs, { borderBottomColor: colors.border }]}>
              {isBloodRevealed && (
                <Pressable
                  style={[styles.labTab, labDataTab === 'blood' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                  onPress={() => setLabDataTab('blood')}
                >
                  <Text style={[styles.labTabText, { color: labDataTab === 'blood' ? colors.primary : colors.muted }]}>血液検査</Text>
                </Pressable>
              )}
              {isEcgRevealed && (
                <Pressable
                  style={[styles.labTab, labDataTab === 'ecg' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                  onPress={() => setLabDataTab('ecg')}
                >
                  <Text style={[styles.labTabText, { color: labDataTab === 'ecg' ? colors.primary : colors.muted }]}>心電図</Text>
                </Pressable>
              )}
              {isImagingRevealed && (
                <Pressable
                  style={[styles.labTab, labDataTab === 'imaging' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                  onPress={() => setLabDataTab('imaging')}
                >
                  <Text style={[styles.labTabText, { color: labDataTab === 'imaging' ? colors.primary : colors.muted }]}>画像</Text>
                </Pressable>
              )}
            </View>

            <ScrollView style={styles.labContent} showsVerticalScrollIndicator={false}>
              {/* 血液検査 */}
              {labDataTab === 'blood' && isBloodRevealed && labData?.bloodTest?.values && (
                <View>
                  <View style={[styles.labTable, { borderColor: colors.border }]}>
                    <View style={[styles.labTableHeader, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.labTableHeaderText, { color: colors.primary, flex: 2 }]}>項目</Text>
                      <Text style={[styles.labTableHeaderText, { color: colors.primary, flex: 1.5 }]}>結果</Text>
                      <Text style={[styles.labTableHeaderText, { color: colors.primary, flex: 2 }]}>基準値</Text>
                    </View>
                    {labData.bloodTest.values.map((v, i) => (
                      <View key={i} style={[
                        styles.labTableRow,
                        { borderTopColor: colors.border },
                        v.isAbnormal && { backgroundColor: colors.error + '08' }
                      ]}>
                        <Text style={[styles.labTableCell, { color: colors.foreground, flex: 2 }]}>{v.name}</Text>
                        <View style={[styles.labValueCell, { flex: 1.5 }]}>
                          <Text style={[styles.labTableCell, { color: v.isAbnormal ? colors.error : colors.success, fontWeight: '700' }]}>
                            {v.value} {v.unit}
                          </Text>
                          {v.flag && (
                            <View style={[styles.labFlag, { backgroundColor: v.flag === 'H' ? colors.error + '20' : '#1A6B8A20' }]}>
                              <Text style={[styles.labFlagText, { color: v.flag === 'H' ? colors.error : '#1A6B8A' }]}>{v.flag}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.labTableCell, { color: colors.muted, flex: 2, fontSize: 11 }]}>{v.normalRange}</Text>
                      </View>
                    ))}
                  </View>
                  {labData.bloodTest.interpretation && (
                    <View style={[styles.labInterpretation, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                      <Text style={[styles.labInterpretationTitle, { color: colors.primary }]}>💡 解釈</Text>
                      <Text style={[styles.labInterpretationText, { color: colors.foreground }]}>
                        {labData.bloodTest.interpretation}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* 心電図 */}
              {labDataTab === 'ecg' && isEcgRevealed && labData?.ecg && (
                <View>
                  <View style={[styles.labFindingCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.labFindingTitle, { color: colors.foreground }]}>📈 心電図所見</Text>
                    <Text style={[styles.labFindingText, { color: colors.error, fontWeight: '700', fontSize: 16 }]}>
                      {labData.ecg.findings}
                    </Text>
                  </View>
                  {labData.ecg.interpretation && (
                    <View style={[styles.labInterpretation, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                      <Text style={[styles.labInterpretationTitle, { color: colors.primary }]}>💡 解釈</Text>
                      <Text style={[styles.labInterpretationText, { color: colors.foreground }]}>
                        {labData.ecg.interpretation}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* 画像 */}
              {labDataTab === 'imaging' && isImagingRevealed && labData?.imaging && (
                <View>
                  <View style={[styles.labFindingCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.labFindingTitle, { color: colors.foreground }]}>🩻 画像所見</Text>
                    <Text style={[styles.labFindingText, { color: colors.foreground }]}>
                      {labData.imaging.findings}
                    </Text>
                  </View>
                  {labData.imaging.interpretation && (
                    <View style={[styles.labInterpretation, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                      <Text style={[styles.labInterpretationTitle, { color: colors.primary }]}>💡 解釈</Text>
                      <Text style={[styles.labInterpretationText, { color: colors.foreground }]}>
                        {labData.imaging.interpretation}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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

function VitalChip({ label, value, color, bgColor }: { label: string; value: string; color: string; bgColor: string }) {
  return (
    <View style={[styles.vitalChip, { backgroundColor: bgColor, borderColor: color + '40' }]}>
      <Text style={[styles.vitalChipLabel, { color: '#888' }]}>{label}</Text>
      <Text style={[styles.vitalChipValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, marginBottom: 12 },
  backLink: { fontSize: 16 },

  // ヘッダー
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
    gap: 8,
  },
  quitButton: { width: 44 },
  quitText: { fontSize: 14, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  scenarioName: { fontSize: 14, fontWeight: '700' },
  elapsedTime: { fontSize: 10, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  labButton: {
    width: 34, height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labButtonText: { fontSize: 16 },
  timerBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1.5,
    minWidth: 56,
    alignItems: 'center',
  },
  timerText: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },

  // 患者パネル
  patientPanel: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 },
  patientVisual: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  patientEmojiContainer: {
    width: 52, height: 52,
    borderRadius: 26,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  patientEmoji: { fontSize: 30 },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  chiefComplaint: { fontSize: 11, marginBottom: 4 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  scoreCompact: { alignItems: 'center' },
  scoreCompactValue: { fontSize: 22, fontWeight: '900' },
  scoreCompactLabel: { fontSize: 10 },
  vitalsScroll: { marginBottom: 4 },
  vitalsRow: { flexDirection: 'row', gap: 6, paddingBottom: 4 },
  vitalChip: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 64,
  },
  vitalChipLabel: { fontSize: 9, marginBottom: 2, fontWeight: '600' },
  vitalChipValue: { fontSize: 13, fontWeight: '800' },
  urgencyBanner: { borderRadius: 10, padding: 8, marginTop: 6, borderWidth: 1 },
  urgencyText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  // フェーズ説明
  phaseDesc: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  phaseDescText: { fontSize: 12, lineHeight: 18 },

  // 行動ログ
  logArea: { flex: 1, maxHeight: 150 },
  logContent: { padding: 10, gap: 6 },
  logEmpty: { fontSize: 12, textAlign: 'center', paddingVertical: 16 },
  logEntry: {
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
  },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3, alignItems: 'flex-start' },
  logAction: { fontSize: 12, fontWeight: '700', flex: 1 },
  logMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logScore: { fontSize: 11, fontWeight: '700' },
  logTime: { fontSize: 10 },
  logFeedback: { fontSize: 11, lineHeight: 16 },

  // フィードバックトースト
  feedbackToast: {
    position: 'absolute',
    bottom: 290,
    left: 12,
    right: 12,
    borderRadius: 14,
    padding: 12,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  feedbackToastIcon: { fontSize: 18 },
  feedbackText: { fontSize: 13, lineHeight: 19, flex: 1 },

  // コマンドエリア
  commandArea: {
    borderTopWidth: 1,
    paddingTop: 6,
    paddingBottom: 8,
    maxHeight: 290,
  },
  categoryScroll: { paddingHorizontal: 10, gap: 6, paddingBottom: 6 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    gap: 4,
  },
  categoryChipEmoji: { fontSize: 13 },
  categoryChipText: { fontSize: 11, fontWeight: '600' },
  actionGrid: { paddingHorizontal: 10, gap: 6 },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
    gap: 3,
    margin: 2,
    overflow: 'hidden',
  },
  actionEmoji: { fontSize: 18 },
  actionLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  doneOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  doneMark: { fontSize: 11, fontWeight: '600' },

  // 検査データモーダル
  labModal: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  labModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  labModalTitle: { fontSize: 17, fontWeight: '700' },
  labModalClose: { fontSize: 20, padding: 4 },
  labTabs: { flexDirection: 'row', borderBottomWidth: 1 },
  labTab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  labTabText: { fontSize: 13, fontWeight: '600' },
  labContent: { padding: 14, maxHeight: 400 },
  labTable: { borderRadius: 10, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  labTableHeader: { flexDirection: 'row', padding: 8 },
  labTableHeaderText: { fontSize: 11, fontWeight: '700' },
  labTableRow: { flexDirection: 'row', padding: 8, borderTopWidth: 1, alignItems: 'center' },
  labTableCell: { fontSize: 12 },
  labValueCell: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  labFlag: { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  labFlagText: { fontSize: 10, fontWeight: '700' },
  labInterpretation: { borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 12 },
  labInterpretationTitle: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  labInterpretationText: { fontSize: 12, lineHeight: 18 },
  labFindingCard: { borderRadius: 10, padding: 14, borderWidth: 1, marginBottom: 12 },
  labFindingTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  labFindingText: { fontSize: 14, lineHeight: 20 },

  // 共通モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 32,
  },
  modalCard: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  modalDesc: { fontSize: 13, textAlign: 'center', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalButtonText: { fontSize: 14, fontWeight: '700' },
});
