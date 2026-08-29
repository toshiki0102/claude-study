#!/usr/bin/env bash
# 上流由来ファイルへの変更に ADR が伴っているかを調べる（pre-push から呼ばれる）。
#
# なぜこれが要るか:
#   `.specify/` と `.claude/skills/` は Spec Kit（github/spec-kit）から再生成・更新される
#   領域で、ここへの変更はアップグレードで黙って上流の内容に戻されうる。戻ってもテストは
#   減るだけで CI は緑のままなので、検出する手立てが他に無い。「なぜ上流と違うのか」を
#   ADR に残しておかないと、次に差分を見た人が上流へ合わせて戻してしまう。
#   詳細は docs/adr/README.md の「必ず ADR が要る場合」節。
#
# 終了コード: 1 = ADR が要りそう（push を止める） / 0 = 問題なし
# 回避（ADR が不要な変更のとき）: git push --no-verify
#
# テスト: bash .githooks/checks/upstream-override-adr.test.sh
set -uo pipefail

# 上流から再生成・更新される領域。
UPSTREAM_RE='^(\.specify/|\.claude/skills/)'
# ただし constitution.md は「プロジェクト側が埋めること」を前提に置かれたテンプレートで、
# 埋めるのは上流に逆らう行為ではない。ここで ADR を要求すると、誤字修正のたびに
# --no-verify が常用され、本当に止めたい変更まで素通りするようになる。
EXCLUDE_RE='^\.specify/memory/constitution\.md$'
# ADR 本体のファイル名。docs/adr/README.md（一覧表）や template.md（雛形）は
# ADR ではないので、これらが増えただけでは「ADR を書いた」とみなさない。
ADR_RE='^docs/adr/[0-9]{4}-.+\.md$'

# 変更ファイル一覧・追加ファイル一覧は、テストから環境変数で差し込めるようにしてある
# （git を呼ばずに判定だけ試せる）。未設定なら origin/main との差分から求める。
if [ -n "${ADR_CHECK_CHANGED_FILES+set}" ]; then
  changed="$ADR_CHECK_CHANGED_FILES"
  added="${ADR_CHECK_ADDED_FILES-}"
else
  # origin/main が無いクローン（初回 push 前など）では判定材料が無いので黙って通す。
  base="$(git merge-base origin/main HEAD 2>/dev/null)" || exit 0
  [ -n "$base" ] || exit 0
  changed="$(git diff --name-only "$base"...HEAD 2>/dev/null)" || exit 0
  added="$(git diff --name-only --diff-filter=A "$base"...HEAD 2>/dev/null)" || exit 0
fi

hits="$(printf '%s\n' "$changed" | grep -E "$UPSTREAM_RE" | grep -vE "$EXCLUDE_RE" || true)"
[ -n "$hits" ] || exit 0

adrs="$(printf '%s\n' "$added" | grep -E "$ADR_RE" || true)"
[ -n "$adrs" ] && exit 0

printf '\033[33m⚠ 上流由来ファイルを変更しています:\033[0m\n' >&2
printf '%s\n' "$hits" | sed 's/^/    /' >&2
cat >&2 <<'MSG'

  これらは Spec Kit から再生成・更新される領域です。上流のデフォルトに
  逆らう変更なら、理由を ADR に残さないとアップグレードで黙って戻ります
  （docs/adr/README.md）。

  このブランチに新規 ADR はありません。

  ADR が不要な変更（上流の更新をそのまま受け入れる等）なら:
    git push --no-verify
MSG
exit 1
