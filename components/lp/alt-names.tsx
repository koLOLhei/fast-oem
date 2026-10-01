import { Fragment } from 'react'

/**
 * 「別名：A・B・C」の表示。改行は「・」の後ろでだけ起こす。
 * 名前の途中で折れないよう、1つの名前は折り返さない（文節分割だと造語の途中で切れることがある）。
 */
export function AltNames({ names, className }: { names: string[]; className?: string }) {
  return (
    <p className={className}>
      別名：
      {names.map((n, i) => (
        <Fragment key={n}>
          <span className="whitespace-nowrap">
            {n}
            {i < names.length - 1 && '・'}
          </span>
          {i < names.length - 1 && <wbr />}
        </Fragment>
      ))}
    </p>
  )
}
