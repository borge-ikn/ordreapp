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

    if (path === 'orderlines/list') {
      const orderId = params.orderId;
      if (!orderId) return { statusCode: 400, body: JSON.stringify({ error: 'Mangler orderId' }) };
      url = `${PRODSYS_BASE}/orderlines?filter.orderId=${orderId}`;
      method = 'GET';
    } else if (path === 'articles/search') {
      const q = encodeURIComponent(params.q || '');
      url = `${PRODSYS_BASE}/articles/orders-list?filter.searchText=${q}&filter.typeId=2&dxLoadOptions.searchOperation=%22contains%22&dxLoadOptions.take=40`;
      method = 'GET';
    } else if (path === 'orderlines') {
      if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
      }
      url = `${PRODSYS_BASE}/orderlines`;
      method = 'POST';
      body = event.body;
    } else if (path === 'orderlines/commission') {
      if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
      }
      const id = params.id;
      if (!id) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Mangler id-parameter' }) };
      }
      url = `${PRODSYS_BASE}/orderlines/update-lines-with-commission/${id}`;
      method = 'POST';
      body = event.body || '{}';
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
