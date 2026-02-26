import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useGame } from '@/context/GameContext';
import { useColors } from '@/hooks/use-colors';
import type { GameResult, HistoryRecord } from '@/types/game';

const RESULT_LABELS: Record<GameResult, string> = {
  success: 'クリア',
  partial_success: '部分クリア',
  fail: '失敗',
};

const RESULT_EMOJIS: Record<GameResult, string> = {
  success: '🏆',
  partial_success: '⭐',
  fail: '💔',
};

export default function HistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const { history, loadHistory } = useGame();

  useEffect(() => {
    loadHistory();
  }, []);

  const totalPlays = history.length;
  const totalClears = history.filter(h => h.result === 'success').length;
  const bestScore = history.length > 0 ? Math.max(...history.map(h => h.totalScore)) : 0;
  const avgScore = history.length > 0
    ? Math.round(history.reduce((sum, h) => sum + h.totalScore, 0) / history.length)
    : 0;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getResultColor = (result: GameResult) => {
    if (result === 'success') return colors.success;
    if (result === 'partial_success') return colors.warning;
    return colors.error;
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* ヘッダー */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>学習履歴</Text>
        <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
          あなたの成長を振り返りましょう
        </Text>
      </View>

      {/* 統計サマリー */}
      <View style={[styles.statsCard, { backgroundColor: colors.primary }]}>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{totalPlays}</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.75)' }]}>総プレイ数</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{totalClears}</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.75)' }]}>クリア数</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{bestScore}</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.75)' }]}>最高スコア</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{avgScore}</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.75)' }]}>平均スコア</Text>
          </View>
        </View>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>まだ記録がありません</Text>
          <Text style={[styles.emptyDesc, { color: colors.muted }]}>
            シナリオをプレイすると、ここに学習記録が表示されます。
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.goToScenarioButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => router.push('/(tabs)/scenarios')}
          >
            <Text style={styles.goToScenarioText}>シナリオを始める</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: { item: HistoryRecord }) => (
            <View style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardLeft}>
                <Text style={styles.resultEmoji}>{RESULT_EMOJIS[item.result]}</Text>
              </View>
              <View style={styles.cardCenter}>
                <Text style={[styles.scenarioTitle, { color: colors.foreground }]}>
                  {item.scenarioTitle}
                </Text>
                <Text style={[styles.cardDate, { color: colors.muted }]}>
                  {new Date(item.playedAt).toLocaleDateString('ja-JP', {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
                <View style={styles.cardMeta}>
                  <Text style={[styles.metaItem, { color: colors.muted }]}>
                    ⏱ {formatTime(item.elapsedTime)}
                  </Text>
                  <Text style={[styles.metaItem, { color: colors.muted }]}>
                    📋 {item.actionCount}アクション
                  </Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <View style={[
                  styles.resultBadge,
                  { backgroundColor: getResultColor(item.result) + '20' }
                ]}>
                  <Text style={[styles.resultText, { color: getResultColor(item.result) }]}>
                    {RESULT_LABELS[item.result]}
                  </Text>
                </View>
                <Text style={[styles.scoreText, { color: colors.primary }]}>
                  {item.totalScore}pt
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  headerSubtitle: { fontSize: 13 },
  statsCard: {
    margin: 16,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statsGrid: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, marginTop: 3 },
  statDivider: { width: 1, height: 40, marginHorizontal: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  goToScenarioButton: { borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  goToScenarioText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  listContent: { padding: 16, gap: 10 },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardLeft: { marginRight: 12 },
  resultEmoji: { fontSize: 32 },
  cardCenter: { flex: 1 },
  scenarioTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardDate: { fontSize: 12, marginBottom: 4 },
  cardMeta: { flexDirection: 'row', gap: 10 },
  metaItem: { fontSize: 12 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  resultBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  resultText: { fontSize: 12, fontWeight: '700' },
  scoreText: { fontSize: 18, fontWeight: '800' },
});
