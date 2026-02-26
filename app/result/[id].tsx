import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useGame } from '@/context/GameContext';
import { useColors } from '@/hooks/use-colors';
import type { GameResult } from '@/types/game';

const RESULT_CONFIG: Record<GameResult, {
  emoji: string;
  title: string;
  subtitle: string;
  bgColor: string;
}> = {
  success: {
    emoji: '🏆',
    title: 'シナリオクリア！',
    subtitle: '素晴らしい対応でした。患者は安定しています。',
    bgColor: '#2E9E6B',
  },
  partial_success: {
    emoji: '⭐',
    title: '部分クリア',
    subtitle: '対応はできましたが、改善の余地があります。',
    bgColor: '#E8A020',
  },
  fail: {
    emoji: '💔',
    title: 'シナリオ失敗',
    subtitle: '対応が遅れ、患者の状態が悪化しました。解説を確認しましょう。',
    bgColor: '#D94040',
  },
};

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { gameState, getScenario, resetGame } = useGame();

  const scenario = getScenario(id ?? '');
  const result = gameState.result ?? 'fail';
  const resultConfig = RESULT_CONFIG[result];

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // スコア評価
  const getGrade = (score: number) => {
    if (score >= 80) return { grade: 'S', color: '#FFD700' };
    if (score >= 60) return { grade: 'A', color: colors.success };
    if (score >= 40) return { grade: 'B', color: colors.primary };
    if (score >= 20) return { grade: 'C', color: colors.warning };
    return { grade: 'D', color: colors.error };
  };

  const grade = getGrade(gameState.totalScore);

  const optimalActions = gameState.actionLog.filter(l => l.isOptimal);
  const negativeActions = gameState.actionLog.filter(l => l.score < 0);

  const handleRetry = () => {
    resetGame();
    router.replace({ pathname: '/scenario/[id]', params: { id: id ?? '' } });
  };

  const handleGoHome = () => {
    resetGame();
    router.replace('/');
  };

  const handleGoScenarios = () => {
    resetGame();
    router.replace('/(tabs)/scenarios');
  };

  if (!scenario) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.error }]}>データが見つかりません</Text>
          <Pressable onPress={handleGoHome}>
            <Text style={[styles.backLink, { color: colors.primary }]}>ホームへ</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── リザルトバナー ─── */}
        <View style={[styles.resultBanner, { backgroundColor: resultConfig.bgColor }]}>
          <Text style={styles.resultEmoji}>{resultConfig.emoji}</Text>
          <Text style={styles.resultTitle}>{resultConfig.title}</Text>
          <Text style={styles.resultSubtitle}>{resultConfig.subtitle}</Text>

          {/* グレード & スコア */}
          <View style={styles.gradeRow}>
            <View style={[styles.gradeBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={[styles.gradeText, { color: grade.color }]}>{grade.grade}</Text>
            </View>
            <View style={styles.scoreDisplay}>
              <Text style={styles.scoreValue}>{gameState.totalScore}</Text>
              <Text style={styles.scoreUnit}>pt</Text>
            </View>
          </View>
        </View>

        {/* ─── 統計サマリー ─── */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>📊 プレイ統計</Text>
          <View style={styles.statsGrid}>
            <StatItem label="経過時間" value={formatTime(gameState.elapsedTime)} colors={colors} />
            <StatItem label="アクション数" value={`${gameState.actionLog.length}回`} colors={colors} />
            <StatItem label="正解アクション" value={`${optimalActions.length}回`} colors={colors} highlight="success" />
            <StatItem label="ミス" value={`${negativeActions.length}回`} colors={colors} highlight={negativeActions.length > 0 ? "error" : undefined} />
          </View>
        </View>

        {/* ─── 行動ログ振り返り ─── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>📋 行動ログ</Text>
          {gameState.actionLog.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.muted }]}>アクションなし</Text>
          ) : (
            gameState.actionLog.map((log, index) => (
              <View
                key={log.id}
                style={[
                  styles.logEntry,
                  {
                    backgroundColor: log.isOptimal ? colors.success + '10' : colors.background,
                    borderLeftColor: log.isOptimal ? colors.success : log.score < 0 ? colors.error : colors.border,
                  }
                ]}
              >
                <View style={styles.logHeader}>
                  <Text style={[styles.logIndex, { color: colors.muted }]}>{index + 1}.</Text>
                  <Text style={[styles.logAction, { color: colors.foreground }]}>
                    {log.isOptimal ? '✅' : log.score < 0 ? '❌' : '▶'} {log.actionLabel}
                  </Text>
                  <Text style={[
                    styles.logScore,
                    { color: log.score > 0 ? colors.success : log.score < 0 ? colors.error : colors.muted }
                  ]}>
                    {log.score > 0 ? `+${log.score}` : log.score}pt
                  </Text>
                </View>
                <Text style={[styles.logFeedback, { color: colors.muted }]}>{log.feedback}</Text>
                <Text style={[styles.logTime, { color: colors.muted }]}>
                  {formatTime(log.timestamp)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* ─── 解説・エビデンス ─── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>📚 解説・エビデンス</Text>
          <Text style={[styles.explanationSummary, { color: colors.foreground }]}>
            {scenario.explanation.summary}
          </Text>

          <View style={[styles.keyPointsSection, { backgroundColor: colors.background }]}>
            <Text style={[styles.keyPointsTitle, { color: colors.primary }]}>🔑 重要ポイント</Text>
            {scenario.explanation.keyPoints.map((point, i) => (
              <View key={i} style={styles.keyPointItem}>
                <Text style={[styles.keyPointBullet, { color: colors.primary }]}>•</Text>
                <Text style={[styles.keyPointText, { color: colors.foreground }]}>{point}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.evidenceBadge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.evidenceText, { color: colors.primary }]}>
              📖 {scenario.explanation.evidence}
            </Text>
          </View>
          {scenario.explanation.evidenceUrl && (
            <View style={[styles.evidenceUrlBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.evidenceUrlText, { color: colors.muted }]}>
                🔗 参考: {scenario.explanation.evidenceUrl}
              </Text>
            </View>
          )}
        </View>

        {/* ─── アクションボタン ─── */}
        <View style={styles.actionButtons}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleRetry}
          >
            <Text style={styles.primaryButtonText}>🔄 もう一度挑戦</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleGoScenarios}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
              📋 他のシナリオへ
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleGoHome}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
              🏠 ホームへ
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

function StatItem({
  label, value, colors, highlight
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  highlight?: 'success' | 'error';
}) {
  const valueColor = highlight === 'success' ? colors.success : highlight === 'error' ? colors.error : colors.foreground;
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, marginBottom: 12 },
  backLink: { fontSize: 16 },
  resultBanner: {
    padding: 28,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  resultEmoji: { fontSize: 64, marginBottom: 12 },
  resultTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  resultSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  gradeBadge: { borderRadius: 16, width: 64, height: 64, justifyContent: 'center', alignItems: 'center' },
  gradeText: { fontSize: 36, fontWeight: '900' },
  scoreDisplay: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  scoreValue: { fontSize: 48, fontWeight: '900', color: '#FFFFFF' },
  scoreUnit: { fontSize: 18, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  statsCard: {
    margin: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  card: {
    marginHorizontal: 16,
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
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statItem: { flex: 1, minWidth: '40%', alignItems: 'center', paddingVertical: 8 },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  logEntry: {
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    marginBottom: 8,
  },
  logHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 4 },
  logIndex: { fontSize: 12, width: 20 },
  logAction: { fontSize: 13, fontWeight: '700', flex: 1 },
  logScore: { fontSize: 13, fontWeight: '700' },
  logFeedback: { fontSize: 12, lineHeight: 18, marginBottom: 4 },
  logTime: { fontSize: 11 },
  explanationSummary: { fontSize: 14, lineHeight: 22, marginBottom: 14 },
  keyPointsSection: { borderRadius: 14, padding: 14, marginBottom: 12 },
  keyPointsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  keyPointItem: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  keyPointBullet: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  keyPointText: { fontSize: 13, lineHeight: 22, flex: 1 },
  evidenceBadge: { borderRadius: 12, padding: 12, marginBottom: 8 },
  evidenceText: { fontSize: 12, lineHeight: 18 },
  evidenceUrlBadge: { borderRadius: 10, padding: 10, borderWidth: 1 },
  evidenceUrlText: { fontSize: 11, lineHeight: 16 },
  actionButtons: { paddingHorizontal: 16, gap: 12 },
  primaryButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  secondaryButton: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '600' },
});
