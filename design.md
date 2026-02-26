# Nurse Rescue - モバイルアプリ UI/UX 設計書

## アプリコンセプト

臨床現場の「ヒヤリハット」や「急変」を、バイタル測定とアセスメントを通じて疑似体験する看護師向けロールプレイングゲーム。

---

## カラーパレット

| トークン | ライト | ダーク | 用途 |
|---|---|---|---|
| primary | #1A6B8A | #2E9EC4 | メインアクセント（医療ブルー） |
| background | #F0F4F8 | #0F1923 | 画面背景 |
| surface | #FFFFFF | #1A2535 | カード・パネル背景 |
| foreground | #1A2535 | #E8EDF2 | 主要テキスト |
| muted | #6B7A8D | #8A9BB0 | 補助テキスト |
| border | #D1DCE8 | #2A3A50 | ボーダー |
| success | #2E9E6B | #4ADE80 | 回復・正解 |
| warning | #E8A020 | #FBBF24 | 注意・悪化 |
| error | #D94040 | #F87171 | 危険・失敗 |
| danger | #8B1A1A | #FF4444 | 重篤状態 |
| accent | #7B4FBE | #9B6FDE | 特殊アクション |

---

## 画面一覧

### 1. ホーム画面 (`/`)
- アプリロゴ・タイトル
- 「シナリオを選ぶ」ボタン
- 学習履歴サマリー（直近3件）
- 総合スコア・クリア数バッジ

### 2. シナリオ選択画面 (`/scenarios`)
- シナリオカード一覧（FlatList）
  - シナリオ名・難易度バッジ
  - 疾患カテゴリアイコン
  - ベストスコア・クリア回数
  - ロック/アンロック状態
- 難易度フィルター（初級/中級/上級）

### 3. シナリオ開始画面 (`/scenarios/[id]`)
- 患者プロフィールカード
  - 名前・年齢・性別
  - 主訴・既往歴
  - 現在の指示（Dr.オーダー）
- 「シミュレーション開始」ボタン
- 難易度・推定時間表示

### 4. メインシミュレーション画面 (`/simulation/[id]`)
- **上部エリア**: 患者イラスト（状態により変化: 正常/不安/重篤）
- **バイタルパネル**: 意識レベル・血圧・心拍数・SpO2・血糖値
- **タイマー**: カウントダウン（特定フェーズ）
- **ログエリア**: 行動履歴（スクロール可能）
- **コマンドメニュー（下部）**:
  - 測定する（バイタル・血糖・SpO2等）
  - 診察する（視診・触診・聴診）
  - 問診する（症状・既往歴確認）
  - 処置する（ブドウ糖投与・ルート確保等）
  - 呼ぶ（医師・先輩看護師）
  - 報告する（SBAR形式）

### 5. リザルト画面 (`/result/[id]`)
- クリア/失敗バナー
- 経過時間・アクション数
- バイタル変動グラフ（簡易）
- アセスメント正確性スコア
- 行動ログ振り返り
- 解説テキスト（エビデンスベース）
- 「もう一度」「次のシナリオ」ボタン

### 6. 学習履歴画面 (`/history`)
- 過去のプレイ記録一覧
- スコア推移
- 弱点分析

---

## キーユーザーフロー

### メインフロー（低血糖シナリオ例）
1. ホーム → 「シナリオを選ぶ」タップ
2. シナリオ選択 → 「低血糖」カード選択
3. シナリオ開始 → 患者情報確認 → 「開始」タップ
4. シミュレーション開始（タイマースタート）
5. コマンド選択 → 「測定する」→「血糖測定」
6. 結果表示（45mg/dL）→ 次のアクション選択
7. 「処置する」→「ブドウ糖投与」→ 患者回復
8. シナリオ終了 → リザルト画面

### 失敗フロー
1. 「様子を見る」選択 → 30秒後に意識消失
2. タイマー切れ → 自動的に失敗判定
3. リザルト画面（失敗）→ 解説確認

---

## タブ構成

| タブ | アイコン | 画面 |
|---|---|---|
| ホーム | house.fill | ホーム画面 |
| シナリオ | stethoscope | シナリオ選択 |
| 履歴 | clock.arrow.circlepath | 学習履歴 |

---

## 患者状態モデル

```
PatientStatus {
  consciousness: number  // JCS値 (0=清明, 1-3=I群, 10-30=II群, 100-300=III群)
  bloodPressure: { systolic: number, diastolic: number }
  heartRate: number
  spO2: number
  bloodGlucose: number | null
  temperature: number
  respiratoryRate: number
  appearance: 'normal' | 'anxious' | 'pale' | 'critical' | 'unconscious'
}
```

---

## シナリオデータ構造（JSON）

```json
{
  "id": "hypoglycemia",
  "title": "低血糖",
  "difficulty": "beginner",
  "category": "endocrine",
  "timeLimit": 300,
  "patient": { ... },
  "initialState": { ... },
  "phases": [
    {
      "id": "phase1",
      "description": "患者が冷や汗をかいて訴えている",
      "availableActions": [...],
      "timeLimit": 60,
      "nextPhase": { "correct": "phase2", "timeout": "phase_fail" }
    }
  ],
  "actions": [
    {
      "id": "measure_glucose",
      "label": "血糖測定",
      "category": "measure",
      "isCorrect": true,
      "result": { "bloodGlucose": 45 },
      "feedback": "血糖値45mg/dL。低血糖と確定。",
      "score": 20
    }
  ]
}
```
