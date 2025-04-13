// netlify/functions/dispatch.js

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const token = process.env.GH_TOKEN_BUJO;
  const repo = 'lebron1212/bulletjournal';
  const url = `https://api.github.com/repos/${repo}/dispatches`;

  try {
    const payload = JSON.parse(event.body);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.everest-preview+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event_type: 'save-journal',
        client_payload: payload
      })
    });

    if (!res.ok) {
      return {
        statusCode: res.status,
        body: `GitHub dispatch failed with ${res.status}`
      };
    }

    return {
      statusCode: 200,
      body: '✅ Journal dispatched successfully'
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: `Server error: ${err.message}`
    };
  }
}
