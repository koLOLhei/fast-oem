/**
 * Send a plain-text message to Slack via the incoming webhook URL.
 *
 * Used from Next.js server actions (Node.js runtime):
 *   - app/actions/stripe.ts  — checkout session creation alerts
 *   - app/actions/factory.ts — shipping / cancellation alerts
 *
 * NOTE: The Supabase Edge Function (supabase/functions/stripe-webhook/slack.ts)
 * has its own Deno-based implementation for webhook-triggered alerts.
 * Both post to the same Slack channel. This is intentional — the Edge Function
 * runs in a different runtime (Deno) and cannot import Node.js modules.
 */
export async function sendSlackMessage(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL
  if (!url) {
    console.warn('[slack] SLACK_WEBHOOK_URL is not configured — message not sent:', text.substring(0, 100))
    return
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) {
      console.error(`[slack] Failed to send message (${res.status})`)
    }
  } catch (err: any) {
    console.error(`[slack] Error: ${err.message}`)
  }
}
