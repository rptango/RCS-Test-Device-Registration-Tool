
# RCS Test Device Registration
Builds the API call needed to invite a phone number as a tester / test device for an RCS Agent. Pick a **Provider** (Google, Syniverse, Vibes, Cisco, Telnyx), enter the **RCS Agent ID** and **Phone Number**, and paste in the OAuth2 access token or Bearer token that provider requires — the endpoint, headers and request body update automatically. The request preview is fully editable, can be sent directly from the browser, or copied as a `curl` command to run elsewhere. Google, Syniverse, Vibes and Telnyx templates are based on confirmed provider APIs; Cisco (Webex Connect) doesn't publish a dedicated test-device endpoint, so it's a placeholder to confirm with the provider before use.

For **Vibes**, authentication is a two-step OAuth2 client credentials flow: enter your **Client ID** and **Client Secret**, then click **Fetch Access Token** to exchange them for a Bearer token at `https://auth.rcsstudio.ai/oauth2/token` (or click **Copy Token cURL** to run that exchange from a terminal instead, if the browser call is blocked by CORS). The returned token is filled into the Bearer Token field automatically and used for the test-device request.

For **Cisco (Webex Connect)**, authentication follows their documented Service Key / JWT scheme rather than a token-exchange call: enter your **Service ID** and **Service Secret (base64)**, then click **Generate JWT**. This builds a self-signed HS256 JWT (`iss`, `iat`, `exp` claims, valid 60 minutes) entirely client-side using the Web Crypto API — no network request is made for this step — and fills it into the Bearer Token field.
# License 
See License.md
