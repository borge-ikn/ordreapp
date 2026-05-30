const PRODSYS_BASE = 'https://app2.prodsys.no/api';

exports.handler = async (event) => {
  const token = process.env.PRODSYS_API_TOKEN;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'PRODSYS_API_TOKEN ikke satt' }) };
  }

  const params = event.queryStringParameters || {};
  const path = params.path || '';

  const headers = {
    'x-token': token,
    'Content-Type': 'application/json',
  };

  try {
    let url, method, body;

    // ── ORDRELINJER ───────────────────────────────────────────────────────────
    if (path === 'orderlines/list') {
      const orderId = params.orderId;
      if (!orderId) return { statusCode: 400, body: JSON.stringify({ error: 'Mangler orderId' }) };
      url = `${PRODSYS_BASE}/orderlines?filter.orderId=${orderId}`;
      method = 'GET';
    } else if (path === 'orderlines/delete') {
      if (event.httpMethod !== 'DELETE') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
      const id = params.id;
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Mangler id' }) };
      url = `${PRODSYS_BASE}/orderlines/${id}`;
      method = 'DELETE';
    } else if (path === 'orderlines/update') {
      if (event.httpMethod !== 'PUT') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
      const id = params.id;
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Mangler id' }) };
      url = `${PRODSYS_BASE}/orderlines/${id}`;
      method = 'PUT';
      body = event.body;
    } else if (path === 'orderlines') {
      if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
      url = `${PRODSYS_BASE}/orderlines`;
      method = 'POST';
      body = event.body;
    } else if (path === 'orderlines/commission') {
      if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
      const id = params.id;
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Mangler id-parameter' }) };
      url = `${PRODSYS_BASE}/orderlines/update-lines-with-commission/${id}`;
      method = 'POST';
      body = event.body || '{}';

    // ── ARTIKKELSØK ───────────────────────────────────────────────────────────
    } else if (path === 'articles/search') {
      const q = encodeURIComponent(params.q || '');
      url = `${PRODSYS_BASE}/articles/orders-list?filter.searchText=${q}&filter.typeId=2&dxLoadOptions.searchOperation=%22contains%22&dxLoadOptions.take=40`;
      method = 'GET';

    // ── DOKUMENTER ────────────────────────────────────────────────────────────
    } else if (path === 'orders/documents') {
      const id = params.id;
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Mangler id' }) };
      url = `${PRODSYS_BASE}/orders/${id}/documents`;
      method = 'GET';
    } else if (path === 'document-codes') {
      url = `${PRODSYS_BASE}/document-codes/simple`;
      method = 'GET';
    } else if (path === 'documents') {
      if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
      url = `${PRODSYS_BASE}/documents`;
      method = 'POST';
      body = event.body;
    } else if (path === 'documents/files/upload') {
      if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
      const id = params.id;
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Mangler id' }) };
      url = `${PRODSYS_BASE}/documents/files/${id}`;
      method = 'POST';
      // Multipart: forward raw body og original Content-Type (inkl. boundary)
      const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64')
        : Buffer.from(event.body || '');
      const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
      const resp = await fetch(url, {
        method,
        headers: { 'x-token': token, 'Content-Type': contentType },
        body: rawBody,
      });
      const text = await resp.text();
      return { statusCode: resp.status, headers: { 'Content-Type': 'application/json' }, body: text };

    // ── FILNEDLASTING ─────────────────────────────────────────────────────────
    } else if (path === 'files') {
      const id = params.id;
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Mangler id' }) };
      const resp = await fetch(`${PRODSYS_BASE}/files/${id}`, { method: 'GET', headers: { 'x-token': token } });
      if (!resp.ok) return { statusCode: resp.status, body: JSON.stringify({ error: 'Feil fra ProdSys' }) };
      const arrayBuf = await resp.arrayBuffer();
      return {
        statusCode: 200,
        isBase64Encoded: true,
        headers: {
          'Content-Type': resp.headers.get('content-type') || 'application/octet-stream',
          'Content-Disposition': resp.headers.get('content-disposition') || 'attachment',
        },
        body: Buffer.from(arrayBuf).toString('base64'),
      };

    } else {
      return { statusCode: 400, body: JSON.stringify({ error: `Ukjent path: ${path}` }) };
    }

    const fetchOpts = { method, headers };
    if (body) fetchOpts.body = body;

    const resp = await fetch(url, fetchOpts);
    const text = await resp.text();

    return {
      statusCode: resp.status,
      headers: { 'Content-Type': 'application/json' },
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
