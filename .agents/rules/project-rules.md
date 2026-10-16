# Local-First Health App Rules

## Architecture & Tech Stack
- Framework: Next.js (App Router, TypeScript) + Tailwind CSS + shadcn/ui + Lucide Icons
- Local Database: Dexie.js (IndexedDB) を使用し、サーバーサイドDBは使用しないこと（完全ローカル完結）。
- Charts & Animation: Recharts と Framer Motion を使用すること。

## Design System
- Theme: 洗練されたダークモード基調（背景は slate-950、カードは slate-900/80 + 繊細なボーダー）。
- Layout: モバイルでもPCでも見やすいBento Grid（弁当箱型グリッド）レイアウト。
- UX: 入力の摩擦を最小限にするため、ページ遷移ではなくドロワー（下から出るシート）やモーダルで即座に記録できるUIにすること。

## Data Schema (Dexie.js)
すべてのログは日付文字列 (`YYYY-MM-DD`) でインデックス化し、以下のテーブルを持つこと：
1. `meals`: id, date, timestamp, mealType (breakfast/lunch/dinner/snack), description, calories, protein, fat, carbs
2. `workouts`: id, date, timestamp, type, durationMinutes, intensity (1-5), caloriesBurned, memo
3. `sleepLogs`: id, date, bedTime, wakeTime, durationHours, qualityScore (1-5)
4. `bodyMetrics`: id, date, weightKg, bodyFatPercentage
5. `activities`: id, date, steps, activeMinutes, readinessScore (自動算出)

## Safety Requirement
- 設定画面に必ず「全データのJSONエクスポート / インポート機能」と「デモデータ生成ボタン（30日分のリアルなダミーデータを投入する機能）」を実装すること。

