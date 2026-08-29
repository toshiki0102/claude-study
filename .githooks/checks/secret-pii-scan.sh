#!/usr/bin/env bash
# ステージ済みの差分（追加行）と対象ファイル名を走査し、秘密情報・個人情報(PII)・
# 機密ファイルを検出したら非ゼロで終了する。依存ツールなし（bash + grep/sed）。
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
ALLOW="$ROOT/.githooks/allowlist.txt"

red() { printf '\033[31m%s\033[0m\n' "$*"; }
problems=0

# --- 1) コミットしてはいけないファイル名を弾く -------------------------------
while IFS= read -r f; do
  [ -z "$f" ] && continue
  base="$(basename "$f")"
  case "$f" in
    *.pem|*.key|*.p12|*.pfx|*id_rsa) red "● 機密ファイルの可能性: $f"; problems=$((problems+1));;
    *.tfstate|*.tfstate.*)            red "● Terraform state はコミット禁止: $f"; problems=$((problems+1));;
  esac
  case "$base" in
    *.example) : ;;                                # .env.example / tfvars.example は許可
    .env|.env.*|*.env) red "● 環境変数ファイルの可能性: $f"; problems=$((problems+1));;
    terraform.tfvars)  red "● tfvars はコミット禁止（.example のみ可）: $f"; problems=$((problems+1));;
  esac
done < <(git diff --cached --name-only --diff-filter=ACM || true)

# --- 2) 追加行を抽出（+++ ヘッダ除外、先頭 + を除去）-------------------------
# 依存ロックファイルは生成物で、依存パッケージ作者のメールや整合ハッシュを大量に含む。
# ユーザーの秘密情報は通常入らないため、内容スキャンの対象外にする（誤検知の恒久対策）。
# 注: 機密ファイル名チェック（Section 1）は全ファイル対象のまま。
added="$(git diff --cached --diff-filter=ACM -U0 -- . \
  ':(exclude)**/package-lock.json' \
  ':(exclude)**/yarn.lock' \
  ':(exclude)**/pnpm-lock.yaml' \
  | grep -E '^\+[^+]' | sed 's/^+//' || true)"

# allowlist（コメント/空行を除いた正規表現）で既知の安全行を除外
allowpat="$(grep -vE '^[[:space:]]*(#|$)' "$ALLOW" 2>/dev/null || true)"
if [ -n "$allowpat" ] && [ -n "$added" ]; then
  added="$(printf '%s\n' "$added" | grep -vEf <(printf '%s\n' "$allowpat") || true)"
fi

# 検出ヘルパー: ラベルとパターン。マッチ行は値をマスクして表示する。
check() {
  local label="$1" pat="$2" input="${3:-$added}" hits
  [ -z "$input" ] && return 0
  hits="$(printf '%s\n' "$input" | grep -iE "$pat" || true)"
  if [ -n "$hits" ]; then
    red "● $label を検出:"
    printf '%s\n' "$hits" | sed -E 's#[A-Za-z0-9_+/.-]{8,}#***REDACTED***#g' \
      | sort -u | head -5 | sed 's/^/    /'
    problems=$((problems+1))
  fi
}

# --- 3) 秘密情報（高信頼パターン）-------------------------------------------
check "AWS アクセスキー"        'AKIA[0-9A-Z]{16}'
check "AWS シークレットキー"    'aws_secret_access_key[[:space:]]*[:=]'
check "秘密鍵(PEM)"             'BEGIN [A-Z ]*PRIVATE KEY'
check "GitHub トークン"         '(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}'
check "Slack トークン"          'xox[baprs]-[A-Za-z0-9-]{10,}'
check "Google API キー"         'AIza[0-9A-Za-z_-]{35}'
check "Google OAuth シークレット" 'GOCSPX-[A-Za-z0-9_-]{10,}'
check "Stripe シークレットキー"  'sk_live_[A-Za-z0-9]{10,}'
check "JWT"                     'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'

# 汎用の代入（実値らしい長い引用符付きリテラルのみ）。プレースホルダ等は除外。
generic="$(printf '%s\n' "$added" | grep -ivE 'xxx|example|changeme|placeholder|dummy|your[-_]|sample|redacted|<[^>]*>|\$\{|\$\(|var\.|random_password|os\.environ|getenv|process\.env|import\.meta\.env|_arn|secretarn|secretsmanager|getsecretvalue|isnull|stringvalue' || true)"
check "秘密情報らしき代入" '(secret|password|passwd|token|api[_-]?key)["'"'"']?[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"']{16,}["'"'"']' "$generic"

# --- 4) 個人情報(PII) -------------------------------------------------------
check "メールアドレス"  '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
check "電話番号(日本)"  '0[0-9]{1,4}-[0-9]{1,4}-[0-9]{4}|0[789]0[0-9]{8}'

# --- 結果 -------------------------------------------------------------------
if [ "$problems" -gt 0 ]; then
  red ""
  red "コミットを中止しました（$problems 件）。秘密情報/個人情報/機密ファイルの可能性があります。"
  echo "  該当箇所: git diff --cached で確認してください。"
  echo "  誤検知の場合: .githooks/allowlist.txt にパターンを追加するか、"
  echo "  どうしても必要なら（非推奨）: git commit --no-verify"
  exit 1
fi
exit 0
