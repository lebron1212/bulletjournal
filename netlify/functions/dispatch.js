export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: 'CORS preflight okay',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: 'Method Not Allowed',
    };
  }

  const token = process.env.GH_TOKEN_BUJO;
  const repo = 'lebron1212/bulletjournal';

  const getFileShaAndContent = async (filename) => {
    const filePath = `journals/collections/collection-${filename}.html`;

    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) throw new Error(`Failed to fetch file ${filename}`);

    return await res.json(); // includes sha & content (base64)
  };

  const writeFileToGitHub = async (filename, content) => {
    const filePath = `journals/collections/collection-${filename}.html`;

    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: `rename to: ${filename}`,
        content, // must be base64
      }),
    });

    if (!res.ok) throw new Error(`Failed to create renamed file`);
  };

  const deleteFileFromGitHub = async (filename, sha = null) => {
    const filePath = `journals/collections/collection-${filename}.html`;

    if (!sha) {
      const data = await getFileShaAndContent(filename);
      sha = data.sha;
    }

    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: `delete: ${filename}`,
        sha,
      }),
    });

    if (!res.ok) throw new Error(`Failed to delete file`);
  };

  try {
    const payload = JSON.parse(event.body);

    // 🗑 DELETE support
    if (payload.delete && payload.mode === 'collection') {
      await deleteFileFromGitHub(payload.delete);
      return {
        statusCode: 200,
        headers,
        body: `✅ Collection ${payload.delete} deleted`,
      };
    }

    // ✏️ RENAME support
    if (payload.rename && payload.to && payload.mode === 'collection') {
      const oldFile = await getFileShaAndContent(payload.rename);
      await writeFileToGitHub(payload.to, oldFile.content); // content is already base64
      await deleteFileFromGitHub(payload.rename, oldFile.sha);

      return {
        statusCode: 200,
        headers,
        body: `✅ Renamed ${payload.rename} ➝ ${payload.to}`,
      };
    }

    // 📨 Default: journal save dispatch
    const dispatchUrl = `https://api.github.com/repos/${repo}/dispatches`;

    const res = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.everest-preview+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: 'save-journal',
        client_payload: payload,
      }),
    });

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers,
        body: `GitHub dispatch failed with ${res.status}`,
      };
    }

    return {
      statusCode: 200,
      headers,
      body: '✅ Journal dispatched successfully',
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: `Server error: ${err.message}`,
    };
  }
}
