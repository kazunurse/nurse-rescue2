import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useGame } from '@/context/GameContext';
import { useColors } from '@/hooks/use-colors';
import type { HistoryRecord, GameResult } from '@/types/game';

const DIFFICULTY_LABELS = { beginner: '初級', intermediate: '中級', advanced: '上級' };
const RESULT_LABELS: Record<GameResult, string> = {
  success: 'クリア',
  partial_success: '部分クリア',
  fail: '失敗',
};
const RESULT_COLORS = (colors: ReturnType<typeof useColors>) => ({
  success: colors.success,
  partial_success: colors.warning,
  fail: colors.error,
});

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { history, loadHistory, scenarios } = useGame();

  useEffect(() => {
    loadHistory();
  }, []);

  const recentHistory = history.slice(0, 3);
  const totalClears = history.filter(h => h.result === 'success').length;
  const bestScore = history.length > 0 ? Math.max(...history.map(h => h.totalScore)) : 0;

  const resultColors = RESULT_COLORS(colors);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ヘッダー */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerContent}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.headerText}>
              <Text style={[styles.appTitle, { color: '#FFFFFF' }]}>Nurse Rescue</Text>
              <Text style={[styles.appSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>
                看護師向け急変シミュレーション
              </Text>
            </View>
          </View>

          {/* スタッツバー */}
          <View style={[styles.statsBar, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{totalClears}</Text>
              <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>クリア数</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{history.length}</Text>
              <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>プレイ数</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{bestScore}</Text>
              <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>最高スコア</Text>
            </View>
          </View>
        </View>

        {/* メインCTAボタン */}
        <View style={styles.ctaSection}>
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={() => router.push({ pathname: '/(tabs)/scenarios' })}
          >
            <Text style={styles.ctaIcon}>🏥</Text>
            <View style={styles.ctaTextContainer}>
              <Text style={[styles.ctaTitle, { color: '#FFFFFF' }]}>シナリオを選ぶ</Text>
              <Text style={[styles.ctaDesc, { color: 'rgba(255,255,255,0.8)' }]}>
                {scenarios.length}つのシナリオから選択
              </Text>
            </View>
            <Text style={[styles.ctaArrow, { color: 'rgba(255,255,255,0.8)' }]}>›</Text>
          </Pressable>
        </View>

        {/* シナリオ一覧プレビュー */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>シナリオ一覧</Text>
          <View style={styles.scenarioGrid}>
            {scenarios.map(scenario => (
              <Pressable
                key={scenario.id}
                style={({ pressed }) => [
                  styles.scenarioCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => router.push({ pathname: '/scenario/[id]', params: { id: scenario.id } })}
              >
                <View style={styles.scenarioCardHeader}>
                  <Text style={styles.scenarioEmoji}>
                    {scenario.category === 'endocrine' ? '🩸' :
                     scenario.category === 'respiratory' ? '🫁' : '❤️'}
                  </Text>
                  <View style={[
                    styles.difficultyBadge,
                    { backgroundColor:
                      scenario.difficulty === 'beginner' ? colors.success :
                      scenario.difficulty === 'intermediate' ? colors.warning : colors.error
                    }
                  ]}>
                    <Text style={styles.difficultyText}>
                      {DIFFICULTY_LABELS[scenario.difficulty]}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.scenarioCardTitle, { color: colors.foreground }]}>
                  {scenario.title}
                </Text>
                <Text style={[styles.scenarioCardSubtitle, { color: colors.muted }]}>
                  {scenario.subtitle}
                </Text>
                <Text style={[styles.scenarioTime, { color: colors.muted }]}>
                  約{scenario.estimatedMinutes}分
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 最近の履歴 */}
        {recentHistory.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>最近の記録</Text>
              <Pressable onPress={() => router.push({ pathname: '/(tabs)/history' })}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>すべて見る</Text>
              </Pressable>
            </View>
            {recentHistory.map((record: HistoryRecord) => (
              <View
                key={record.id}
                style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.historyCardLeft}>
                  <Text style={[styles.historyTitle, { color: colors.foreground }]}>
                    {record.scenarioTitle}
                  </Text>
                  <Text style={[styles.historyMeta, { color: colors.muted }]}>
                    {new Date(record.playedAt).toLocaleDateString('ja-JP')} ·
                    {formatTime(record.elapsedTime)} · {record.actionCount}アクション
                  </Text>
                </View>
                <View style={styles.historyCardRight}>
                  <View style={[
                    styles.resultBadge,
                    { backgroundColor: resultColors[record.result] + '20' }
                  ]}>
                    <Text style={[styles.resultText, { color: resultColors[record.result] }]}>
                      {RESULT_LABELS[record.result]}
                    </Text>
                  </View>
                  <Text style={[styles.historyScore, { color: colors.primary }]}>
                    {record.totalScore}pt
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 学習のヒント */}
        <View style={[styles.tipCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
          <Text style={[styles.tipTitle, { color: colors.primary }]}>💡 学習のポイント</Text>
          <Text style={[styles.tipText, { color: colors.foreground }]}>
            急変対応は「迅速なアセスメント」と「適切な優先順位」が鍵です。
            まずバイタルサインを確認し、原因を特定してから処置を行いましょう。
          </Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  header: {
    paddingTop: 20,
    paddingBottom: 0,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: { width: 52, height: 52, borderRadius: 12, marginRight: 12 },
  headerText: { flex: 1 },
  appTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  appSubtitle: { fontSize: 12, marginTop: 2 },
  statsBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, marginHorizontal: 8 },
  ctaSection: { paddingHorizontal: 16, paddingTop: 20 },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaIcon: { fontSize: 32, marginRight: 14 },
  ctaTextContainer: { flex: 1 },
  ctaTitle: { fontSize: 18, fontWeight: '700' },
  ctaDesc: { fontSize: 13, marginTop: 2 },
  ctaArrow: { fontSize: 28, fontWeight: '300' },
  section: { paddingHorizontal: 16, paddingTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  seeAll: { fontSize: 14, fontWeight: '600' },
  scenarioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  scenarioCard: {
    width: '47%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  scenarioCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  scenarioEmoji: { fontSize: 28 },
  difficultyBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  difficultyText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  scenarioCardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  scenarioCardSubtitle: { fontSize: 12, lineHeight: 16, marginBottom: 6 },
  scenarioTime: { fontSize: 11 },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  historyCardLeft: { flex: 1 },
  historyTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  historyMeta: { fontSize: 12 },
  historyCardRight: { alignItems: 'flex-end', gap: 4 },
  resultBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  resultText: { fontSize: 12, fontWeight: '700' },
  historyScore: { fontSize: 16, fontWeight: '700' },
  tipCard: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  tipTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  tipText: { fontSize: 13, lineHeight: 20 },
});
