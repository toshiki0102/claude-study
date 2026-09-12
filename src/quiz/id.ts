/**
 * 問題文のテキストだけから設問の識別子を作る（FR-019 / ADR-0004）。
 * 同期・決定的: 同じ入力からは必ず同じ 8桁16進が出る。
 * 正規化: NFC → trim → 連続空白を半角スペース1つに。
 * ハッシュ: FNV-1a 32bit（UTF-8 バイト列に対して）。
 */
export function questionId(questionText: string): string {
  const normalized = questionText.normalize('NFC').trim().replace(/\s+/g, ' ')
  let hash = 0x811c9dc5
  for (const byte of new TextEncoder().encode(normalized)) {
    hash ^= byte
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}
