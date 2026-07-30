module.exports = async (req, res) => {
  const verifyToken = process.env.META_VERIFY_TOKEN;

  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && verifyToken && token === verifyToken) return res.status(200).send(challenge);
    return res.status(403).send('Token inválido.');
  }

  if (req.method === 'POST') {
    console.log('Meta webhook recebido:', JSON.stringify(req.body || {}));
    return res.status(200).send('EVENT_RECEIVED');
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).send('Método não permitido.');
};
