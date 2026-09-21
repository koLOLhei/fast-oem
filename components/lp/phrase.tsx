import 'server-only'
import { Fragment } from 'react'
import { loadDefaultJapaneseParser } from 'budoux'

const parser = loadDefaultJapaneseParser()

/**
 * 日本語を文節の切れ目でだけ改行させる（「ピンバッ｜ジ」のような単語途中の改行を防ぐ）。
 * Chrome は CSS の word-break: auto-phrase で同じことができるが Safari は未対応のため、
 * BudouX で文節に分けて <wbr> を差し込む。ビルド時に処理するのでブラウザ側のJSは増えない。
 * 「・」「／」の後ろも改行位置にする（「アクリル・缶バッジ・…」のような列挙用）。
 */
export function Phrase({ children }: { children: string }) {
  const chunks = parser.parse(children).flatMap((chunk) => chunk.split(/(?<=[・／])/))
  return (
    <span className="phrase">
      {chunks.map((chunk, i) => (
        <Fragment key={i}>
          {i > 0 && <wbr />}
          {chunk}
        </Fragment>
      ))}
    </span>
  )
}
