# PayPal sandbox checkout

Loopback-only standalone Python 3.11+ test server. Start from this folder: `python server.py`, then open http://127.0.0.1:8800/. Keep the safety preview on port8790 separate.

Set server environment variables PAYPAL_SANDBOX_CLIENT_ID, PAYPAL_SANDBOX_CLIENT_SECRET and PAYPAL_SANDBOX_USD_PER_ZAR from a PayPal developer sandbox application. Do not put secrets in HTML, Git or chat. No credentials were supplied or created by this change.

The last variable is an explicitly chosen test USD per rand rate, not a live FX quote. The checkout displays the original rand price and converted test amount before redirecting. PayPal does not list ZAR among supported REST payment currencies: https://developer.paypal.com/api/codes/currency . It is never safe to relabel a rand value as USD.

This tests a single first-month payment (350 per device +50 service for first and25 thereafter). It does not establish six instalments, renewals, subscriptions, deliveries, VAT treatment or existing-account discounts. Later service payments must not be billed through this first-month test. Both shop themes link to this harness only on local preview pages. Hosted GitHub pages cannot execute the Python service.

The API origin is hardcoded to api-m.sandbox.paypal.com; live mode is absent. OAuth stays server-side. SQLite binds orders to an HttpOnly/SameSite=Lax cookie (retained on the PayPal top-level return; POSTs require exact Origin) and persists capture idempotency keys. Only a completed matching USD capture confirms the test, with no fulfilment action. Origin/Host checks, size limits and server-calculated pricing reject arbitrary browser amounts. Public deployment, production customer identity, abuse limits, verified webhooks, reconciliation/refunds and recurring plans are intentionally outside this local harness.

Required final manual test: use separate sandbox merchant and buyer accounts; review displayed conversion, approve on sandbox.paypal.com, return, explicitly confirm, retry capture and check merchant/buyer sandbox activity. No real sandbox transaction has been claimed without credentials and this test.

Official integration: https://developer.paypal.com/checkout/put-it-all-together/ ; idempotency: https://developer.paypal.com/api/make-api-requests .
