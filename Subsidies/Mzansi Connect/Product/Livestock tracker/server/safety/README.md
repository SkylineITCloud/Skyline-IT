# Safety API for the adapted existing website

Start the combined preview from the parent Mzansi Connect folder using start-server.bat, or run `python preview.py` here. Default URL: http://127.0.0.1:8790/ ; authenticated tracker: /tracker/ ; the retained /livestock/ alias also loads the adapted tracker.

The API is copied from the tested development package produced in this chat, with its account/device/event/contact permission model retained. Use synthetic identities and coordinates only. Production identity verification, physical pairing, actual notification transport, recovery, retention and deployment remain pending. No old database is migrated.

Key flows: POST /api/register and /api/login issue an in-memory client session; GET/POST /api/devices register development devices; device credentials POST /api/device/events and /api/device/events/:id/locations; users GET /api/events and scoped event details/history; accepted contacts receive explicit per-event grants. Invitation acceptance alone grants no location access. A contact can acknowledge an event but cannot close it. Wearer cancellation and closure are separate. Notifications processed by /api/simulation/dispatch stay SIMULATED_ONLY; no messages are sent.

The preview serves only approved public page/asset roots and denies source, runtime database, private configuration, dot paths and traversal. Old public livestock API routes are not mounted. The listener is loopback-only. Main marketing page retains its existing inline scripts; the authenticated dashboard uses external scripts under a stricter policy.

Verification from this directory:

```
python -m unittest -v test_preview test_http
python -m unittest -v test_app
node test_web.cjs
```

The domain test includes 1,000 durable duplicate receipts and can take several minutes. Tests use temporary databases. Actual merge verification/evidence is included in the chat's Mzansi-Connect-Womens-Safety-Merge outputs. No wearable, carrier, emergency dispatch or real-world safety outcome is tested by these checks.
