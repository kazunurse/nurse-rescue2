import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Image, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useGame } from '@/context/GameContext';
import { useColors } from '@/hooks/use-colors';
import type { HistoryRecord, GameResult, Difficulty, Category } from '@/types/game';
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '@/types/game';

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  beginner:     '#2E9E6B',
  intermediate: '#E8A020',
  advanced:     '#D94040',
};

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

  // 最近プレイしたシナリオIDを除いたおすすめ（未プレイ優先）
  const playedIds = new Set(history.map(h => h.scenarioId));
  const recommendedScenarios = [
    ...scenarios.filter(s => !playedIds.has(s.id)),
    ...scenarios.filter(s => playedIds.has(s.id)),
  ].slice(0, 4);

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── ヘッダー ─── */}
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
              <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{scenarios.length}</Text>
              <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>シナリオ数</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{bestScore}</Text>
              <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>最高スコア</Text>
            </View>
          </View>
        </View>

        {/* ─── メインCTAボタン ─── */}
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
                {scenarios.length}ケースから選択
              </Text>
            </View>
            <Text style={[styles.ctaArrow, { color: 'rgba(255,255,255,0.8)' }]}>›</Text>
          </Pressable>
        </View>

        {/* ─── ABCDEアプローチカード ─── */}
        <View style={styles.section}>
          <View style={[styles.abcdeCard, { backgroundColor: '#0F4C75' }]}>
            <Text style={styles.abcdeTitle}>🔎 ABCDEアプローチ</Text>
            <Text style={styles.abcdeSubtitle}>急変時の系統的アセスメント</Text>
            <View style={styles.abcdeGrid}>
              {[
                { letter: 'A', label: 'Airway', desc: '気道' },
                { letter: 'B', label: 'Breathing', desc: '呼吸' },
                { letter: 'C', label: 'Circulation', desc: '循環' },
                { letter: 'D', label: 'Disability', desc: '意識' },
                { letter: 'E', label: 'Exposure', desc: '体表' },
              ].map(item => (
                <View key={item.letter} style={styles.abcdeItem}>
                  <View style={styles.abcdeLetter}>
                    <Text style={styles.abcdeLetterText}>{item.letter}</Text>
                  </View>
                  <Text style={styles.abcdeLabel}>{item.label}</Text>
                  <Text style={styles.abcdeDesc}>{item.desc}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ─── おすすめシナリオ ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {playedIds.size === 0 ? '🎯 まずはここから' : '📚 おすすめシナリオ'}
            </Text>
            <Pressable onPress={() => router.push({ pathname: '/(tabs)/scenarios' })}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>すべて見る</Text>
            </Pressable>
          </View>
          {recommendedScenarios.map(scenario => {
            const diffColor = DIFFICULTY_COLORS[scenario.difficulty];
            const isPlayed = playedIds.has(scenario.id);
            return (
              <Pressable
                key={scenario.id}
                style={({ pressed }) => [
                  styles.scenarioRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderLeftColor: diffColor,
                  },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => router.push({ pathname: '/scenario/[id]', params: { id: scenario.id } })}
              >
                <Text style={styles.scenarioRowIcon}>{CATEGORY_ICONS[scenario.category]}</Text>
                <View style={styles.scenarioRowInfo}>
                  <Text style={[styles.scenarioRowTitle, { color: colors.foreground }]}>{scenario.title}</Text>
                  <Text style={[styles.scenarioRowMeta, { color: colors.muted }]}>
                    {CATEGORY_LABELS[scenario.category]} · {scenario.estimatedMinutes}分
                  </Text>
                </View>
                <View style={styles.scenarioRowRight}>
                  <View style={[styles.diffBadge, { backgroundColor: diffColor + '20', borderColor: diffColor + '60' }]}>
                    <Text style={[styles.diffBadgeText, { color: diffColor }]}>
                      {DIFFICULTY_LABELS[scenario.difficulty]}
                    </Text>
                  </View>
                  {isPlayed && <Text style={[styles.playedMark, { color: colors.muted }]}>プレイ済</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ─── 最近の記録 ─── */}
        {recentHistory.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>📋 最近の記録</Text>
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
                    {new Date(record.playedAt).toLocaleDateString('ja-JP')} · {formatTime(record.elapsedTime)}
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

        {/* ─── 学習のヒント ─── */}
        <View style={[styles.tipCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
          <Text style={[styles.tipTitle, { color: colors.primary }]}>💡 学習のポイント</Text>
          <Text style={[styles.tipText, { color: colors.foreground }]}>
            急変対応は「迅速なアセスメント」と「適切な優先順位」が鍵です。
            ABCDEアプローチで系統的に評価し、原因を特定してから処置を行いましょう。
          </Text>
        </View>

        <View style={{ height: 24 }} />
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
  logo: { width: 48, height: 48, borderRadius: 12, marginRight: 12 },
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
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 10, marginTop: 2 },
  statDivider: { width: 1, marginHorizontal: 4 },
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
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600' },

  // ABCDEカード
  abcdeCard: {
    borderRadius: 16,
    padding: 16,
  },
  abcdeTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  abcdeSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 14 },
  abcdeGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  abcdeItem: { alignItems: 'center', flex: 1 },
  abcdeLetter: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  abcdeLetterText: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  abcdeLabel: { fontSize: 9, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  abcdeDesc: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

  // シナリオ行
  scenarioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 8,
    gap: 10,
  },
  scenarioRowIcon: { fontSize: 24 },
  scenarioRowInfo: { flex: 1 },
  scenarioRowTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  scenarioRowMeta: { fontSize: 11 },
  scenarioRowRight: { alignItems: 'flex-end', gap: 4 },
  diffBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  diffBadgeText: { fontSize: 10, fontWeight: '700' },
  playedMark: { fontSize: 10 },

  // 履歴カード
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  historyCardLeft: { flex: 1 },
  historyTitle: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  historyMeta: { fontSize: 11 },
  historyCardRight: { alignItems: 'flex-end', gap: 4 },
  resultBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  resultText: { fontSize: 11, fontWeight: '700' },
  historyScore: { fontSize: 15, fontWeight: '700' },

  // ヒントカード
  tipCard: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  tipTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  tipText: { fontSize: 12, lineHeight: 19 },
});
