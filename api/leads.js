module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const lead = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const nome = String(lead.nome || '').trim();
  const email = String(lead.email || '').trim().toLowerCase();
  const whatsapp = String(lead.whatsapp || '').replace(/\D/g, '');

  if (!nome || !/^\S+@\S+\.\S+$/.test(email) || whatsapp.length < 10) {
    return res.status(400).json({ error: 'Dados do formulário inválidos.' });
  }
  if (!process.env.BREVO_API_KEY || !process.env.BREVO_LIST_ID) {
    return res.status(500).json({ error: 'Integração de leads indisponível.' });
  }

  const payload = {
    email,
    listIds: [Number(process.env.BREVO_LIST_ID)],
    updateEnabled: true,
    attributes: {
      FIRSTNAME: nome.split(/\s+/)[0],
      PERFIL: String(lead.respostas?.perfil || ''),
      RISCO: String(lead.risco || ''),
      SCORE: Number(lead.score || 0),
      UTM_SOURCE: String(lead.utm?.utm_source || ''),
      UTM_MEDIUM: String(lead.utm?.utm_medium || ''),
      UTM_CAMPAIGN: String(lead.utm?.utm_campaign || ''),
      DATA_DIAGNOSTICO: String(lead.data || new Date().toISOString()).slice(0, 10),
      COMPROU: false,
      ETAPA_FUNIL: 'Diagnóstico Concluído',
      OPTIN_WHATSAPP: Boolean(lead.optinWhatsapp)
    }
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.error('Brevo contact error:', response.status, await response.text());
      return res.status(502).json({ error: 'Não foi possível registrar o lead.' });
    }
    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Brevo request error:', error);
    return res.status(502).json({ error: 'Não foi possível registrar o lead.' });
  }
};
