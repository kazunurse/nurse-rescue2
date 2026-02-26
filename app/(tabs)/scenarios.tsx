import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useGame } from '@/context/GameContext';
import { useColors } from '@/hooks/use-colors';
import type { Difficulty, Category } from '@/types/game';
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

type FilterMode = 'difficulty' | 'category';

export default function ScenariosScreen() {
  const router = useRouter();
  const colors = useColors();
  const { scenarios, history } = useGame();

  const [filterMode, setFilterMode] = useState<FilterMode>('difficulty');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const availableCategories = Array.from(new Set(scenarios.map(s => s.category))) as Category[];
  const difficulties: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

  const filteredScenarios = scenarios.filter(s => {
    if (filterMode === 'difficulty' && selectedDifficulty) return s.difficulty === selectedDifficulty;
    if (filterMode === 'category' && selectedCategory) return s.category === selectedCategory;
    return true;
  });

  const getPlayCount = (scenarioId: string) =>
    history.filter(h => h.scenarioId === scenarioId).length;

  const getBestScore = (scenarioId: string) => {
    const records = history.filter(h => h.scenarioId === scenarioId);
    if (records.length === 0) return null;
    return Math.max(...records.map(r => r.totalScore));
  };

  const getClearCount = (scenarioId: string) =>
    history.filter(h => h.scenarioId === scenarioId && h.result === 'success').length;

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={styles.container}>
        {/* ─── ヘッダー ─── */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>シナリオ</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            {scenarios.length}ケース収録
          </Text>
        </View>

        {/* ─── フィルターモード切替 ─── */}
        <View style={[styles.filterModeRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable
            style={[styles.filterModeBtn, filterMode === 'difficulty' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => { setFilterMode('difficulty'); setSelectedDifficulty(null); }}
          >
            <Text style={[styles.filterModeBtnText, { color: filterMode === 'difficulty' ? colors.primary : colors.muted }]}>
              難易度別
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterModeBtn, filterMode === 'category' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => { setFilterMode('category'); setSelectedCategory(null); }}
          >
            <Text style={[styles.filterModeBtnText, { color: filterMode === 'category' ? colors.primary : colors.muted }]}>
              カテゴリ別
            </Text>
          </Pressable>
        </View>

        {/* ─── フィルターチップ ─── */}
        <View style={[styles.filterChipsRow, { backgroundColor: colors.surface }]}>
          {filterMode === 'difficulty' ? (
            <View style={styles.filterChips}>
              {difficulties.map(d => {
                const isSelected = selectedDifficulty === d;
                const count = scenarios.filter(s => s.difficulty === d).length;
                return (
                  <Pressable
                    key={d}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected ? DIFFICULTY_COLORS[d] : colors.background,
                        borderColor: isSelected ? DIFFICULTY_COLORS[d] : colors.border,
                      }
                    ]}
                    onPress={() => setSelectedDifficulty(isSelected ? null : d)}
                  >
                    <Text style={[styles.filterChipText, { color: isSelected ? '#FFFFFF' : colors.muted }]}>
                      {DIFFICULTY_LABELS[d]}
                    </Text>
                    <View style={[styles.filterChipBadge, { backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : colors.border }]}>
                      <Text style={[styles.filterChipBadgeText, { color: isSelected ? '#FFFFFF' : colors.muted }]}>{count}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={[styles.filterChips, { flexWrap: 'nowrap' }]}>
                {availableCategories.map(c => {
                  const isSelected = selectedCategory === c;
                  const count = scenarios.filter(s => s.category === c).length;
                  return (
                    <Pressable
                      key={c}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.background,
                          borderColor: isSelected ? colors.primary : colors.border,
                        }
                      ]}
                      onPress={() => setSelectedCategory(isSelected ? null : c)}
                    >
                      <Text style={styles.filterChipIcon}>{CATEGORY_ICONS[c]}</Text>
                      <Text style={[styles.filterChipText, { color: isSelected ? '#FFFFFF' : colors.muted }]}>
                        {CATEGORY_LABELS[c]}
                      </Text>
                      <View style={[styles.filterChipBadge, { backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : colors.border }]}>
                        <Text style={[styles.filterChipBadgeText, { color: isSelected ? '#FFFFFF' : colors.muted }]}>{count}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>

        {/* ─── シナリオ一覧 ─── */}
        <FlatList
          data={filteredScenarios}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>該当するシナリオがありません</Text>
            </View>
          }
          renderItem={({ item: scenario }) => {
            const playCount = getPlayCount(scenario.id);
            const bestScore = getBestScore(scenario.id);
            const clearCount = getClearCount(scenario.id);
            const diffColor = DIFFICULTY_COLORS[scenario.difficulty];

            return (
              <Pressable
                style={({ pressed }) => [
                  styles.scenarioCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderLeftColor: diffColor,
                  },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
                ]}
                onPress={() => router.push({ pathname: '/scenario/[id]', params: { id: scenario.id } })}
              >
                {/* カード上部 */}
                <View style={styles.cardTop}>
                  <Text style={styles.categoryIcon}>{CATEGORY_ICONS[scenario.category]}</Text>
                  <View style={styles.cardTopInfo}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>{scenario.title}</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.muted }]}>{scenario.subtitle}</Text>
                  </View>
                  <View style={[styles.diffBadge, { backgroundColor: diffColor + '20', borderColor: diffColor + '60' }]}>
                    <Text style={[styles.diffBadgeText, { color: diffColor }]}>
                      {DIFFICULTY_LABELS[scenario.difficulty]}
                    </Text>
                  </View>
                </View>

                {/* 説明文 */}
                <Text style={[styles.cardDesc, { color: colors.muted }]} numberOfLines={2}>
                  {scenario.description}
                </Text>

                {/* カード下部 */}
                <View style={[styles.cardBottom, { borderTopColor: colors.border }]}>
                  <View style={styles.cardMetaGroup}>
                    <Text style={[styles.cardMetaItem, { color: colors.muted }]}>
                      ⏱ {scenario.estimatedMinutes}分
                    </Text>
                    <Text style={[styles.cardMetaItem, { color: colors.muted }]}>
                      {CATEGORY_ICONS[scenario.category]} {CATEGORY_LABELS[scenario.category]}
                    </Text>
                  </View>
                  <View style={styles.cardStatsGroup}>
                    {playCount > 0 ? (
                      <>
                        <Text style={[styles.cardStatText, { color: colors.muted }]}>{playCount}回</Text>
                        {clearCount > 0 && (
                          <Text style={[styles.cardClearText, { color: colors.success }]}>✓ クリア</Text>
                        )}
                        {bestScore !== null && (
                          <Text style={[styles.cardBestScore, { color: colors.primary }]}>{bestScore}pt</Text>
                        )}
                      </>
                    ) : (
                      <Text style={[styles.cardStatText, { color: colors.muted }]}>未プレイ</Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  filterModeRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  filterModeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterModeBtnText: { fontSize: 13, fontWeight: '600' },
  filterChipsRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChipIcon: { fontSize: 13 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    gap: 4,
  },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  filterChipBadge: {
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  filterChipBadgeText: { fontSize: 10, fontWeight: '700' },
  listContent: { padding: 12, gap: 10, paddingBottom: 24 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14 },
  scenarioCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryIcon: { fontSize: 28 },
  cardTopInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 1 },
  cardSubtitle: { fontSize: 11 },
  diffBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  diffBadgeText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { fontSize: 12, lineHeight: 18 },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  cardMetaGroup: { flexDirection: 'row', gap: 10 },
  cardMetaItem: { fontSize: 11 },
  cardStatsGroup: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  cardStatText: { fontSize: 11 },
  cardClearText: { fontSize: 11, fontWeight: '700' },
  cardBestScore: { fontSize: 11, fontWeight: '700' },
});
