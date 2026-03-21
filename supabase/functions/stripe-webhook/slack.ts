/** Send a message to the Slack channel configured via SLACK_WEBHOOK_URL secret. */
export async function sendSlackMessage(text: string): Promise<void> {
  const url = Deno.env.get('SLACK_WEBHOOK_URL')
  if (!url) {
    console.error('[slack] SLACK_WEBHOOK_URL is not set — skipping Slack notification')
    return
  }
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!response.ok) {
      console.error(`[slack] Failed to send message (${response.status}): ${await response.text()}`)
    }
  } catch (err: any) {
    console.error(`[slack] Error sending message: ${err.message}`)
  }
}
