/** Send a plain-text message to Slack via the incoming webhook URL.
 *  Used from Next.js server actions and API routes (Node.js runtime).
 *  Logs a warning when SLACK_WEBHOOK_URL is not configured.
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
