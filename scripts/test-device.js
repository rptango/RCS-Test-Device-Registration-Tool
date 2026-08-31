(function () {
  const PROVIDERS = {
    google: {
      label: 'Google',
      authType: 'oauth2',
      authLabel: 'OAuth2 Access Token',
      authHint: 'OAuth2 access token with scope https://www.googleapis.com/auth/businesscommunications (obtained via a service account or the OAuth2 consent flow).',
      agentLabel: 'Agent ID',
      agentPlaceholder: 'e.g. brand_ab12cd34',
      verified: true,
      docsUrl: 'https://developers.google.com/business-communications/rcs-business-messaging/reference/business-communications/rest/v1/TopLevel/testers',
      buildRequest({ agentId, phoneNumber, token }) {
        return {
          method: 'POST',
          url: 'https://businesscommunications.googleapis.com/v1/testers',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: { agentId, phoneNumber },
        };
      },
    },
    syniverse: {
      label: 'Syniverse',
      authType: 'bearer',
      authLabel: 'Bearer Token',
      authHint: 'Bearer token issued for the Syniverse SCG External API.',
      agentLabel: 'Sender ID',
      agentPlaceholder: 'e.g. vAh0hCAVYX0VXTTLdL3sn3',
      verified: true,
      docsUrl: 'https://sdcdocumentation.syniverse.com/index.php/omni-channel/user-guides/rich-service-communication-rcs-user-guide',
      buildRequest({ agentId, phoneNumber, token }) {
        return {
          method: 'POST',
          url: 'https://api.syniverse.com/scg-external-api/api/v1/messaging/messages',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: {
            from: `sender_id: ${agentId}`,
            to: phoneNumber,
            content_type: 'application/vnd.scg.tester-invitation',
            body: '',
          },
        };
      },
    },
    vibes: {
      label: 'Vibes',
      authType: 'oauth2-cc',
      authLabel: 'Access Token',
      authHint: 'Auto-filled after clicking "Fetch Access Token" above, or paste one in manually.',
      agentLabel: 'Agent ID',
      agentPlaceholder: 'e.g. rcs_test_agent_yqdm45yl_agent',
      verified: true,
      docsUrl: 'https://developer-aggregation.vibes.com/',
      tokenUrl: 'https://auth.rcsstudio.ai/oauth2/token',
      tokenHint: 'Retrieves a Bearer token via the OAuth2 client_credentials grant against https://auth.rcsstudio.ai/oauth2/token.',
      buildTokenRequest({ clientId, clientSecret }) {
        const params = new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        });
        return {
          method: 'POST',
          url: 'https://auth.rcsstudio.ai/oauth2/token',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        };
      },
      buildRequest({ agentId, phoneNumber, token }) {
        return {
          method: 'POST',
          url: `https://api.rcsstudio.ai/agents/${encodeURIComponent(agentId)}/test-devices`,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: { msisdn: `+${phoneNumber.replace(/^\+/, '')}` },
        };
      },
    },
    cisco: {
      label: 'Cisco (Webex Connect)',
      authType: 'jwt-hs256',
      authLabel: 'Bearer Token (JWT)',
      authHint: 'Auto-filled after clicking "Generate JWT" above, or paste a Service Key / JWT in manually. Webex Connect has not published a dedicated test-device endpoint, so the request below is a placeholder — replace {region} and confirm the real endpoint with your Webex Connect account team.',
      agentLabel: 'Agent / Channel ID',
      agentPlaceholder: 'e.g. rcs_channel_id',
      verified: false,
      docsUrl: 'https://developers.webexconnect.io/reference/using-jwt-for-api-authentication',
      jwtHint: 'Generates a self-signed HS256 JWT (claims: iss = Service ID, iat, exp) signed locally with your base64-decoded Service Secret — nothing is sent over the network for this step. Per Webex Connect docs, tokens are valid for 60 minutes.',
      async buildAuthToken({ serviceId, serviceSecret }) {
        const header = { alg: 'HS256', typ: 'JWT' };
        const nowSeconds = Math.floor(Date.now() / 1000);
        const payload = { iss: serviceId, iat: nowSeconds, exp: nowSeconds + 3600 };

        const base64url = (bytesOrString) => {
          const base64 = typeof bytesOrString === 'string'
            ? btoa(unescape(encodeURIComponent(bytesOrString)))
            : btoa(String.fromCharCode(...new Uint8Array(bytesOrString)));
          return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        };

        const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

        let secretBytes;
        try {
          secretBytes = Uint8Array.from(atob(serviceSecret), (c) => c.charCodeAt(0));
        } catch (e) {
          throw new Error('Service Secret is not valid base64.');
        }

        const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));

        return `${signingInput}.${base64url(signature)}`;
      },
      buildRequest({ agentId, phoneNumber, token }) {
        return {
          method: 'POST',
          url: 'https://{region}.webexconnect.io/v2/testers',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: { channelId: agentId, msisdn: phoneNumber },
        };
      },
    },
    telnyx: {
      label: 'Telnyx',
      authType: 'bearer',
      authLabel: 'API Key (Bearer)',
      authHint: 'Telnyx API Key from the Telnyx portal, sent as a Bearer token.',
      agentLabel: 'Agent ID',
      agentPlaceholder: 'e.g. TestAgent',
      verified: true,
      docsUrl: 'https://developers.telnyx.com/api/messaging/invite-a-test-number-to-an-rcs-agent',
      buildRequest({ agentId, phoneNumber, token }) {
        return {
          method: 'PUT',
          url: `https://api.telnyx.com/v2/messaging/rcs/test_number_invite/${encodeURIComponent(agentId)}/${encodeURIComponent(phoneNumber)}`,
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: null,
        };
      },
    },
  };

  const providerSelect = document.getElementById('provider');
  const providerHint = document.getElementById('provider-hint');
  const agentIdLabel = document.getElementById('agent-id-label');
  const agentIdInput = document.getElementById('agent-id');
  const phoneInput = document.getElementById('phone-number');
  const authLabel = document.getElementById('auth-label');
  const authTokenInput = document.getElementById('auth-token');
  const toggleTokenBtn = document.getElementById('toggle-token');
  const authHint = document.getElementById('auth-hint');
  const docsLink = document.getElementById('docs-link');

  const clientCredsBox = document.getElementById('client-creds-box');
  const clientIdInput = document.getElementById('client-id');
  const clientSecretInput = document.getElementById('client-secret');
  const fetchTokenBtn = document.getElementById('fetch-token-btn');
  const tokenCurlBtn = document.getElementById('token-curl-btn');
  const tokenHint = document.getElementById('token-hint');

  const jwtCredsBox = document.getElementById('jwt-creds-box');
  const serviceIdInput = document.getElementById('service-id');
  const serviceSecretInput = document.getElementById('service-secret');
  const generateJwtBtn = document.getElementById('generate-jwt-btn');
  const jwtHint = document.getElementById('jwt-hint');

  const methodInput = document.getElementById('req-method');
  const urlInput = document.getElementById('req-url');
  const headersArea = document.getElementById('req-headers');
  const bodyArea = document.getElementById('req-body');

  const resetBtn = document.getElementById('reset-btn');
  const curlBtn = document.getElementById('curl-btn');
  const sendBtn = document.getElementById('send-btn');
  const responseOutput = document.getElementById('response-output');

  let userEdited = false;

  function currentProvider() {
    return PROVIDERS[providerSelect.value];
  }

  function buildDefaultRequest() {
    const provider = currentProvider();
    return provider.buildRequest({
      agentId: agentIdInput.value.trim(),
      phoneNumber: phoneInput.value.trim(),
      token: authTokenInput.value.trim(),
    });
  }

  function renderRequest() {
    const req = buildDefaultRequest();
    methodInput.value = req.method;
    urlInput.value = req.url;
    headersArea.value = JSON.stringify(req.headers, null, 2);
    bodyArea.value = req.body == null ? '' : JSON.stringify(req.body, null, 2);
  }

  function renderProviderMeta() {
    const provider = currentProvider();
    agentIdLabel.firstChild.textContent = `${provider.agentLabel} `;
    agentIdInput.placeholder = provider.agentPlaceholder;
    authLabel.firstChild.textContent = `${provider.authLabel} `;
    authHint.textContent = provider.authHint;

    const isClientCreds = provider.authType === 'oauth2-cc';
    const isJwt = provider.authType === 'jwt-hs256';
    clientCredsBox.style.display = isClientCreds ? 'block' : 'none';
    jwtCredsBox.style.display = isJwt ? 'block' : 'none';
    if (isClientCreds) tokenHint.textContent = provider.tokenHint;
    if (isJwt) jwtHint.textContent = provider.jwtHint;

    if (isClientCreds) {
      providerHint.textContent = 'This provider authenticates with OAuth2 client credentials — enter the Client ID and Client Secret, then click "Fetch Access Token".';
    } else if (isJwt) {
      providerHint.textContent = 'This provider authenticates with a self-signed JWT — enter your Service ID and Service Secret, then click "Generate JWT".';
    } else if (provider.authType === 'oauth2') {
      providerHint.textContent = 'This provider authenticates with OAuth2 — paste an access token already obtained through that flow.';
    } else {
      providerHint.textContent = 'This provider authenticates with a bearer token / API key.';
    }

    docsLink.innerHTML = `Reference: <a href="${provider.docsUrl}" target="_blank" rel="noopener">${provider.docsUrl}</a>`;
  }

  function fullUpdate() {
    renderProviderMeta();
    renderRequest();
    userEdited = false;
    responseOutput.textContent = 'Nothing sent yet.';
  }

  function parseHeaders() {
    const raw = headersArea.value.trim();
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch (e) {
      throw new Error('Headers is not valid JSON: ' + e.message);
    }
  }

  function bodyForFetch() {
    const raw = bodyArea.value.trim();
    if (!raw) return undefined;
    try {
      JSON.parse(raw);
    } catch (e) {
      throw new Error('Body is not valid JSON: ' + e.message);
    }
    return raw;
  }

  function buildCurl() {
    const method = methodInput.value.trim() || 'GET';
    const url = urlInput.value.trim();
    const headers = parseHeaders();
    const bodyRaw = bodyArea.value.trim();

    let cmd = `curl -X ${method} '${url}'`;
    Object.entries(headers).forEach(([key, value]) => {
      cmd += ` \\\n  -H '${key}: ${value}'`;
    });
    if (bodyRaw) {
      const escaped = bodyRaw.replace(/'/g, "'\\''");
      cmd += ` \\\n  -d '${escaped}'`;
    }
    return cmd;
  }

  function buildCurlFor(req) {
    let cmd = `curl -X ${req.method} '${req.url}'`;
    Object.entries(req.headers || {}).forEach(([key, value]) => {
      cmd += ` \\\n  -H '${key}: ${value}'`;
    });
    if (req.body) {
      const escaped = String(req.body).replace(/'/g, "'\\''");
      cmd += ` \\\n  -d '${escaped}'`;
    }
    return cmd;
  }

  providerSelect.onchange = fullUpdate;

  [agentIdInput, phoneInput, authTokenInput].forEach((el) => {
    el.oninput = () => {
      if (!userEdited) renderRequest();
    };
  });

  [methodInput, urlInput, headersArea, bodyArea].forEach((el) => {
    el.oninput = () => {
      userEdited = true;
    };
  });

  resetBtn.onclick = () => {
    renderRequest();
    userEdited = false;
  };

  toggleTokenBtn.onclick = () => {
    const isPassword = authTokenInput.type === 'password';
    authTokenInput.type = isPassword ? 'text' : 'password';
    toggleTokenBtn.textContent = isPassword ? 'Hide' : 'Show';
  };

  tokenCurlBtn.onclick = async () => {
    const provider = currentProvider();
    if (!provider.buildTokenRequest) return;
    if (!clientIdInput.value.trim() || !clientSecretInput.value.trim()) {
      responseOutput.textContent = 'Fill in Client ID and Client Secret first.';
      return;
    }
    const tokenReq = provider.buildTokenRequest({
      clientId: clientIdInput.value.trim(),
      clientSecret: clientSecretInput.value.trim(),
    });
    const cmd = buildCurlFor(tokenReq);
    try {
      await navigator.clipboard.writeText(cmd);
      responseOutput.textContent = 'Token request cURL copied to clipboard.\n\n' + cmd;
    } catch (e) {
      responseOutput.textContent = cmd;
    }
  };

  fetchTokenBtn.onclick = async () => {
    const provider = currentProvider();
    if (!provider.buildTokenRequest) return;
    if (!clientIdInput.value.trim() || !clientSecretInput.value.trim()) {
      responseOutput.textContent = 'Fill in Client ID and Client Secret first.';
      return;
    }

    const tokenReq = provider.buildTokenRequest({
      clientId: clientIdInput.value.trim(),
      clientSecret: clientSecretInput.value.trim(),
    });

    responseOutput.textContent = 'Fetching access token...';
    fetchTokenBtn.disabled = true;
    try {
      const res = await fetch(tokenReq.url, {
        method: tokenReq.method,
        headers: tokenReq.headers,
        body: tokenReq.body,
      });
      const text = await res.text();
      if (!res.ok) {
        responseOutput.textContent = `Token request failed: HTTP ${res.status} ${res.statusText}\n\n${text || '(empty response body)'}`;
        return;
      }
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        responseOutput.textContent = `Token endpoint returned a non-JSON response:\n\n${text}`;
        return;
      }
      if (!data.access_token) {
        responseOutput.textContent = `Token response had no "access_token" field:\n\n${text}`;
        return;
      }
      authTokenInput.value = data.access_token;
      if (!userEdited) renderRequest();
      const expires = data.expires_in ? ` (expires in ${data.expires_in}s)` : '';
      responseOutput.textContent = `Access token retrieved${expires} and filled into the Bearer Token field below.`;
    } catch (e) {
      responseOutput.textContent =
        `Token request failed: ${e.message}\n\n` +
        'This is most likely a browser CORS restriction. Use "Copy Token cURL", run it from a terminal, and paste the returned access_token into the Bearer Token field manually.';
    } finally {
      fetchTokenBtn.disabled = false;
    }
  };

  generateJwtBtn.onclick = async () => {
    const provider = currentProvider();
    if (!provider.buildAuthToken) return;
    if (!serviceIdInput.value.trim() || !serviceSecretInput.value.trim()) {
      responseOutput.textContent = 'Fill in Service ID and Service Secret first.';
      return;
    }

    responseOutput.textContent = 'Generating JWT...';
    generateJwtBtn.disabled = true;
    try {
      const jwt = await provider.buildAuthToken({
        serviceId: serviceIdInput.value.trim(),
        serviceSecret: serviceSecretInput.value.trim(),
      });
      authTokenInput.value = jwt;
      if (!userEdited) renderRequest();
      responseOutput.textContent = 'JWT generated locally (valid 60 minutes) and filled into the Bearer Token field below.';
    } catch (e) {
      responseOutput.textContent = `Could not generate JWT: ${e.message}`;
    } finally {
      generateJwtBtn.disabled = false;
    }
  };

  curlBtn.onclick = async () => {
    let cmd;
    try {
      cmd = buildCurl();
    } catch (e) {
      responseOutput.textContent = e.message;
      return;
    }
    try {
      await navigator.clipboard.writeText(cmd);
      responseOutput.textContent = 'cURL command copied to clipboard.\n\n' + cmd;
    } catch (e) {
      responseOutput.textContent = cmd;
    }
  };

  sendBtn.onclick = async () => {
    if (!agentIdInput.value.trim() || !phoneInput.value.trim() || !authTokenInput.value.trim()) {
      responseOutput.textContent = 'Fill in Agent ID, Phone Number and the auth token first.';
      return;
    }

    const method = methodInput.value.trim() || 'GET';
    const url = urlInput.value.trim();
    let headers;
    let body;
    try {
      headers = parseHeaders();
      body = bodyForFetch();
    } catch (e) {
      responseOutput.textContent = e.message;
      return;
    }

    responseOutput.textContent = 'Sending...';
    sendBtn.disabled = true;
    try {
      const res = await fetch(url, { method, headers, body });
      const text = await res.text();
      responseOutput.textContent = `HTTP ${res.status} ${res.statusText}\n\n${text || '(empty response body)'}`;
    } catch (e) {
      const provider = currentProvider();
      const unverifiedNote = provider.verified
        ? ''
        : `\n\nNote: this is a placeholder endpoint for ${provider.label}, not confirmed against provider docs (see the Reference link above) — it may not be the real URL. Confirm the correct endpoint with your ${provider.label} account team before assuming this is just a CORS block.`;
      responseOutput.textContent =
        `Request failed: ${e.message}\n\n` +
        'A browser can\'t tell "blocked by CORS" apart from "wrong URL" or "network error" — both throw the same generic failure. ' +
        'Use "Copy as cURL" and run the request from a terminal, server, or API client instead; that will show you the real HTTP status or connection error.' +
        unverifiedNote;
    } finally {
      sendBtn.disabled = false;
    }
  };

  fullUpdate();
})();
