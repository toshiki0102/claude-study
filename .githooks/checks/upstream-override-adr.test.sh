#!/usr/bin/env bash
# upstream-override-adr.sh のテスト。
# 実行: bash .githooks/checks/upstream-override-adr.test.sh
#
# 判定対象のスクリプトは、環境変数で「変更ファイル一覧」「追加ファイル一覧」を
# 差し込めるようにしてある（git を呼ばずに判定だけ試せる）。
set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$DIR/upstream-override-adr.sh"

pass=0
fail=0

# expect_exit <期待する終了コード> <説明> <変更ファイル群> <追加ファイル群>
#   終了コード 1 = ADR が要りそうなので push を止める
#   終了コード 0 = 問題なし（通過）
expect_exit() {
  local want="$1" desc="$2" changed="$3" added="$4"
  local got=0
  ADR_CHECK_CHANGED_FILES="$changed" ADR_CHECK_ADDED_FILES="$added" \
    bash "$TARGET" >/dev/null 2>&1 || got=$?

  if [ "$got" = "$want" ]; then
    printf '  \033[32mok\033[0m   %s\n' "$desc"
    pass=$((pass + 1))
  else
    printf '  \033[31mNG\033[0m   %s（期待 exit %s / 実際 exit %s）\n' "$desc" "$want" "$got"
    fail=$((fail + 1))
  fi
}

echo "upstream-override-adr.sh"

# --- 止めるべきケース ---------------------------------------------------------

expect_exit 1 ".specify/ を変更したのに ADR が無い → 止める" \
  '.specify/templates/tasks-template.md' \
  ''

expect_exit 1 ".claude/skills/ を変更したのに ADR が無い → 止める" \
  '.claude/skills/speckit-tasks/SKILL.md' \
  ''

# docs/adr/ にファイルが増えていても、README.md や template.md は ADR 本体ではない。
# これを ADR とみなすと、一覧表を1行足しただけでチェックを素通りできてしまう。
expect_exit 1 "docs/adr/README.md だけ増えても ADR とはみなさない → 止める" \
  '.specify/templates/tasks-template.md' \
  'docs/adr/README.md'

expect_exit 1 "docs/adr/template.md だけ増えても ADR とはみなさない → 止める" \
  '.specify/templates/tasks-template.md' \
  'docs/adr/template.md'

# constitution.md は除外するが、それは「このファイル1つ」の話。同じコミットで
# .specify/ の他のファイルも触っているなら、従来どおり ADR が要る。
expect_exit 1 "constitution.md と一緒に他の .specify/ も変更 → 止める" \
  '.specify/memory/constitution.md
.specify/templates/plan-template.md' \
  ''

# 名前に constitution を含むだけの上流ファイルまで通してはいけない。
# constitution-template.md は上流の雛形そのもので、変更すれば再生成で戻る。
expect_exit 1 "constitution-template.md は除外対象ではない → 止める" \
  '.specify/templates/constitution-template.md' \
  ''

# --- 通すべきケース -----------------------------------------------------------

# constitution.md は「プロジェクト側が埋めること」を前提に置かれたテンプレートで、
# 埋めるのは上流に逆らう行為ではない。ここで ADR を要求すると、誤字修正のたびに
# --no-verify が常用され、本当に止めたい変更まで素通りするようになる（Issue #5）。
expect_exit 0 "constitution.md だけの変更は ADR 不要 → 通す" \
  '.specify/memory/constitution.md' \
  ''

expect_exit 0 "上流由来ファイルを変更し ADR も追加した → 通す" \
  '.specify/templates/tasks-template.md
.claude/skills/speckit-tasks/SKILL.md' \
  'docs/adr/0008-test-tasks-are-mandatory-in-speckit.md'

expect_exit 0 "上流由来ファイルを触っていない（通常の開発）→ 通す" \
  'frontend/src/App.tsx
backend/functions/resolver/handler.py' \
  ''

expect_exit 0 "変更ファイルが無い → 通す" \
  '' \
  ''

# `.claude/settings.json` などスキル以外の .claude 配下は対象外。
# 上流から再生成されるのは skills/ であって .claude/ 全体ではない。
expect_exit 0 ".claude/ でも skills/ 以外は対象外 → 通す" \
  '.claude/settings.json' \
  ''

# --- 結果 ---------------------------------------------------------------------

echo
if [ "$fail" -gt 0 ]; then
  printf '\033[31m%d 件失敗\033[0m / %d 件成功\n' "$fail" "$pass"
  exit 1
fi
printf '\033[32m%d 件すべて成功\033[0m\n' "$pass"
