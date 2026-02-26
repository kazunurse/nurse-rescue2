import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useGame } from '@/context/GameContext';
import { useColors } from '@/hooks/use-colors';
import type { Difficulty } from '@/types/game';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: '初級',
  intermediate: '中級',
  advanced: '上級',
};

const CATEGORY_LABELS: Record<string, string> = {
  endocrine: '内分泌',
  respiratory: '呼吸器',
  cardiovascular: '循環器',
  neurological: '神経',
  other: 'その他',
};

const CATEGORY_EMOJIS: Record<string, string> = {
  endocrine: '🩸',
  respiratory: '🫁',
  cardiovascular: '❤️',
  neurological: '🧠',
  other: '🏥',
};

type FilterType = 'all' | Difficulty;

export default function ScenariosScreen() {
  const router = useRouter();
  const colors = useColors();
  const { scenarios, history } = useGame();
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = filter === 'all' ? scenarios : scenarios.filter(s => s.difficulty === filter);

  const getScenarioStats = (scenarioId: string) => {
    const records = history.filter(h => h.scenarioId === scenarioId);
    const bestScore = records.length > 0 ? Math.max(...records.map(r => r.totalScore)) : 0;
    const clears = records.filter(r => r.result === 'success').length;
    return { plays: records.length, bestScore, clears };
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'すべて' },
    { key: 'beginner', label: '初級' },
    { key: 'intermediate', label: '中級' },
    { key: 'advanced', label: '上級' },
  ];

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* ヘッダー */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>シナリオ選択</Text>
        <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
          {scenarios.length}つのシナリオから学習できます
        </Text>

        {/* フィルター */}
        <View style={styles.filterRow}>
          {filters.map(f => (
            <Pressable
              key={f.key}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  backgroundColor: filter === f.key ? colors.primary : colors.background,
                  borderColor: filter === f.key ? colors.primary : colors.border,
                },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[
                styles.filterText,
                { color: filter === f.key ? '#FFFFFF' : colors.muted }
              ]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: scenario }) => {
          const stats = getScenarioStats(scenario.id);
          const diffColor =
            scenario.difficulty === 'beginner' ? colors.success :
            scenario.difficulty === 'intermediate' ? colors.warning : colors.error;

          return (
            <Pressable
              style={({ pressed }) => [
                styles.scenarioCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
              ]}
              onPress={() => router.push({ pathname: '/scenario/[id]', params: { id: scenario.id } })}
            >
              {/* カードヘッダー */}
              <View style={styles.cardHeader}>
                <View style={[styles.categoryBadge, { backgroundColor: diffColor + '20' }]}>
                  <Text style={styles.categoryEmoji}>{CATEGORY_EMOJIS[scenario.category]}</Text>
                  <Text style={[styles.categoryText, { color: diffColor }]}>
                    {CATEGORY_LABELS[scenario.category]}
                  </Text>
                </View>
                <View style={[styles.difficultyBadge, { backgroundColor: diffColor }]}>
                  <Text style={styles.difficultyText}>{DIFFICULTY_LABELS[scenario.difficulty]}</Text>
                </View>
              </View>

              {/* タイトル */}
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{scenario.title}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.muted }]}>{scenario.subtitle}</Text>
              <Text style={[styles.cardDesc, { color: colors.muted }]} numberOfLines={2}>
                {scenario.description}
              </Text>

              {/* 情報バー */}
              <View style={[styles.infoBar, { borderTopColor: colors.border }]}>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.muted }]}>制限時間</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>
                    {Math.floor(scenario.timeLimit / 60)}分
                  </Text>
                </View>
                <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.muted }]}>プレイ数</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>{stats.plays}回</Text>
                </View>
                <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.muted }]}>最高スコア</Text>
                  <Text style={[styles.infoValue, { color: colors.primary }]}>
                    {stats.bestScore > 0 ? `${stats.bestScore}pt` : '-'}
                  </Text>
                </View>
                <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.muted }]}>クリア</Text>
                  <Text style={[styles.infoValue, { color: stats.clears > 0 ? colors.success : colors.muted }]}>
                    {stats.clears > 0 ? `${stats.clears}回` : '-'}
                  </Text>
                </View>
              </View>

              {/* 患者情報プレビュー */}
              <View style={[styles.patientPreview, { backgroundColor: colors.background }]}>
                <Text style={[styles.patientLabel, { color: colors.muted }]}>患者：</Text>
                <Text style={[styles.patientInfo, { color: colors.foreground }]}>
                  {scenario.patient.name}（{scenario.patient.age}歳・
                  {scenario.patient.gender === 'female' ? '女性' : '男性'}）
                </Text>
              </View>

              <View style={styles.cardFooter}>
                <Text style={[styles.timeEstimate, { color: colors.muted }]}>
                  ⏱ 約{scenario.estimatedMinutes}分
                </Text>
                <View style={[styles.startButton, { backgroundColor: colors.primary }]}>
                  <Text style={styles.startButtonText}>詳細を見る →</Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />
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
  headerSubtitle: { fontSize: 13, marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: '600' },
  listContent: { padding: 16, gap: 16 },
  scenarioCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, gap: 5 },
  categoryEmoji: { fontSize: 16 },
  categoryText: { fontSize: 12, fontWeight: '700' },
  difficultyBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  difficultyText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  cardTitle: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, marginBottom: 8 },
  cardDesc: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  infoBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 12,
    marginBottom: 12,
  },
  infoItem: { flex: 1, alignItems: 'center' },
  infoLabel: { fontSize: 10, marginBottom: 3 },
  infoValue: { fontSize: 14, fontWeight: '700' },
  infoDivider: { width: 1, marginHorizontal: 4 },
  patientPreview: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  patientLabel: { fontSize: 12, fontWeight: '600' },
  patientInfo: { fontSize: 12, flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeEstimate: { fontSize: 13 },
  startButton: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  startButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
