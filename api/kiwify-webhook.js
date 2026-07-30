module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  const expectedToken = process.env.KIWIFY_WEBHOOK_TOKEN;
  const receivedToken = req.headers['x-kiwify-webhook-token'] || req.headers['x-webhook-token'] || req.body?.token;
  if (!expectedToken) return res.status(503).json({ error: 'Webhook ainda não configurado.' });
  if (expectedToken && receivedToken !== expectedToken) return res.status(401).json({ error: 'Webhook não autorizado.' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const event = String(body.event || body.type || body.trigger || '').toLowerCase();
  const approved = event.includes('aprov') || event.includes('approved') || event === 'purchase';
  if (!approved) return res.status(200).json({ ok: true, ignored: true });

  const data = body.data || body.order || body.customer || body;
  const customer = data.customer || data.buyer || body.customer || body.buyer || data;
  const email = String(customer.email || data.email || '').trim().toLowerCase();
  if (!email || !process.env.BREVO_API_KEY) return res.status(400).json({ error: 'Comprador ou configuração ausente.' });

  const response = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
    method: 'PUT',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      attributes: {
        COMPROU: true,
        DATA_COMPRA: new Date().toISOString(),
        ETAPA_FUNIL: 'Cliente'
      },
      updateEnabled: true
    })
  });

  if (!response.ok) {
    console.error('Brevo purchase update error:', response.status, await response.text());
    return res.status(502).json({ error: 'Não foi possível atualizar o comprador.' });
  }
  return res.status(200).json({ ok: true, email });
};
