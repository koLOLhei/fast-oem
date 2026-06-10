'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Copy, Check, ShieldCheck, AlertTriangle, CreditCard, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js'
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'

interface AgentKey {
  id: string
  name: string
  prefix: string
  daily_cap_jpy: number
  enabled: boolean
  stripe_default_pm_id: string | null
  last_used_at: string | null
  created_at: string
  disabled_at: string | null
}

interface Props { userEmail: string }

export function AgentAccessClient({ userEmail }: Props) {
  const [keys, setKeys] = useState<AgentKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyCap, setNewKeyCap] = useState('100000')
  const [freshSecret, setFreshSecret] = useState<{ id: string; secret: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [cardSetupForKey, setCardSetupForKey] = useState<string | null>(null)
  const [loadError, setLoadError] = useState('')

  async function refresh() {
    setLoading(true)
    // try/catch (not just finally): a non-JSON error response (HTML 500, gateway
    // error) makes res.json() reject; bare refresh() in useEffect would otherwise
    // become an unhandled promise rejection.
    try {
      const res = await fetch('/api/mypage/agent-keys')
      if (!res.ok) { setLoadError('キーの読み込みに失敗しました。時間をおいて再度お試しください。'); return }
      const json = await res.json()
      setKeys(json.keys ?? [])
      setLoadError('')
    } catch {
      setLoadError('キーの読み込みに失敗しました。時間をおいて再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  async function createKey() {
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/mypage/agent-keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newKeyName || 'Default Agent Key', dailyCapJpy: Number(newKeyCap) || 100000 }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        alert('作成失敗: ' + (json.error ?? 'unknown'))
        return
      }
      const json = await res.json()
      setFreshSecret({ id: json.id, secret: json.secret })
      setNewKeyName('')
      await refresh()
    } catch {
      alert('作成に失敗しました。通信状態を確認して再度お試しください。')
    } finally {
      setCreating(false)
    }
  }

  async function copySecret() {
    if (!freshSecret) return
    await navigator.clipboard.writeText(freshSecret.secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function revoke(keyId: string) {
    if (!confirm('このキーを無効化します。AI エージェントが使用できなくなります。よろしいですか？')) return
    try {
      const res = await fetch('/api/mypage/agent-keys/revoke', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agentKeyId: keyId }),
      })
      if (!res.ok) { alert('無効化に失敗しました。'); return }
      await refresh()
    } catch {
      alert('無効化に失敗しました。通信状態を確認して再度お試しください。')
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <div>
          <Link href="/mypage" className="text-sm text-primary hover:underline">← マイページに戻る</Link>
          <h1 className="text-2xl font-bold mt-2">Agent API キー</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AIエージェント (Claude / GPT など) に自動発注させるための API キーを発行します。カードを事前登録すれば、エージェントが注文すると自動で決済が完了します。
          </p>
        </div>

        {loadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {/* Info card */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 space-y-2">
              <p className="font-semibold">仕組み</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>キーを発行（発行時だけ平文が見られます）</li>
                <li>このページでカードを登録（Stripe が安全に保管、当社サーバーには番号を保存しません）</li>
                <li>エージェントに <code className="bg-white px-1 rounded">Authorization: Bearer &lt;sk_agent_...&gt;</code> で API を叩かせる</li>
                <li>1日の上限額を超える注文はエージェントから弾かれます</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Create */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold text-lg">新しいキーを発行</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">名前</label>
                <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="例: Claude Desktop" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">1日の上限額（円）</label>
                <Input type="number" value={newKeyCap} onChange={(e) => setNewKeyCap(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button onClick={createKey} disabled={creating} className="w-full">
                  {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  発行
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {freshSecret && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-semibold">このキーは一度だけ表示されます。今すぐ安全な場所にコピーしてください。</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white p-3 rounded border">
                <code className="flex-1 text-xs break-all">{freshSecret.secret}</code>
                <button onClick={copySecret} className="p-2 hover:bg-muted rounded" aria-label="コピー">
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button className="text-xs text-amber-700 underline" onClick={() => setFreshSecret(null)}>
                コピーしたので閉じる
              </button>
            </CardContent>
          </Card>
        )}

        {/* List */}
        <div>
          <h2 className="font-semibold text-lg mb-3">発行済みのキー</h2>
          {loading ? (
            <div className="text-sm text-muted-foreground">読み込み中...</div>
          ) : keys.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                まだキーがありません。上のフォームから発行してください。
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {keys.map((k) => (
                <Card key={k.id} className={!k.enabled ? 'opacity-60' : ''}>
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{k.name}</p>
                          {!k.enabled && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">無効化済</span>}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-1">{k.prefix}***</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          1日上限 ¥{k.daily_cap_jpy.toLocaleString()} / 作成: {new Date(k.created_at).toLocaleString('ja-JP')}
                        </p>
                        <p className="text-xs mt-1">
                          カード登録: {k.stripe_default_pm_id ? (
                            <span className="text-green-700 font-medium">✓ 登録済み（off-session決済可）</span>
                          ) : (
                            <span className="text-amber-700">未登録（この状態では checkout URL のみ返る）</span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {k.enabled && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCardSetupForKey(k.id)}
                          >
                            <CreditCard className="w-4 h-4 mr-1" />
                            {k.stripe_default_pm_id ? 'カード再登録' : 'カードを登録'}
                          </Button>
                        )}
                        {k.enabled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => revoke(k.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            無効化
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {cardSetupForKey && (
          <CardSetupModal
            agentKeyId={cardSetupForKey}
            onClose={() => { setCardSetupForKey(null); refresh() }}
          />
        )}

        <Card className="border-border">
          <CardContent className="p-5 text-xs text-muted-foreground space-y-2">
            <p><strong>MCP 接続例 (Claude Desktop / Cursor 等):</strong></p>
            <pre className="bg-muted p-3 rounded overflow-x-auto text-[10px]">{`{
  "mcpServers": {
    "fast-oem": {
      "url": "https://fast-oem.soara-mu.jp/api/mcp",
      "transport": "streamable-http",
      "headers": { "Authorization": "Bearer sk_agent_...." }
    }
  }
}`}</pre>
            <p>MCPクライアントが Authorization ヘッダを送れない場合は、<code>create_order</code> ツールの <code>agentApiKey</code> パラメータに直接渡してください。</p>
            <p><a href="/llms.txt" className="text-primary underline">/llms.txt</a> に OpenAPI スキーマや全API仕様があります（{userEmail}）。</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ── Card registration modal (Stripe SetupIntent) ───────────────────────────
function CardSetupModal({ agentKeyId, onClose }: { agentKeyId: string; onClose: () => void }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/mypage/setup-intent', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ agentKeyId }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'setup intent failed')
        setClientSecret(json.clientSecret)
        setStripePromise(loadStripe(json.publishableKey))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'unknown')
      }
    })()
  }, [agentKeyId])

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-lg mb-3">カードを登録</h3>
        {error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : !clientSecret || !stripePromise ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> 初期化中...
          </div>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <CardSetupForm agentKeyId={agentKeyId} onDone={onClose} />
          </Elements>
        )}
      </div>
    </div>
  )
}

function CardSetupForm({ agentKeyId, onDone }: { agentKeyId: string; onDone: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: typeof window !== 'undefined' ? `${window.location.origin}/mypage/agent-access` : '',
        },
      })
      if (result.error) throw new Error(result.error.message ?? 'confirmation failed')
      const setupIntent = result.setupIntent
      if (!setupIntent || typeof setupIntent.payment_method !== 'string') throw new Error('payment method missing')

      const attach = await fetch('/api/mypage/agent-keys/attach-pm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agentKeyId, paymentMethodId: setupIntent.payment_method }),
      })
      if (!attach.ok) throw new Error('attach failed')
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement />
      {error && <div className="text-sm text-destructive">{error}</div>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onDone} disabled={submitting}>キャンセル</Button>
        <Button type="submit" disabled={submitting || !stripe}>
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          カードを登録
        </Button>
      </div>
    </form>
  )
}
