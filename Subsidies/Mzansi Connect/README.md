# Mzansi Connect — Women's Safety Tracker Family

The existing Mzansi Connect pages now present a women-centred personal-safety concept for South Africa: a Pendant, Wristband and Clip, supported by wearer-controlled trusted-contact sharing. Existing page locations, branding and map-dashboard structure are retained and adapted from the livestock project.

This is a development concept and local software prototype. It does not guarantee protection, assistance or rescue. Notifications are simulated. Hardware, cellular coverage, battery duration, water resistance and emergency-service integration have not been validated. The supplied artwork includes aspirational features; adjacent website captions identify them as concept claims, not specifications.

## Open the adapted pages together

Requires Python 3.11+. Double-click **start-safety-preview.bat**, or run:

```powershell
python "Product/Livestock tracker/server/safety/preview.py"
```

Open **http://127.0.0.1:8790/**. This preview serves only public web assets and the authenticated prototype API; it does not expose the project root, source folders or private configuration.

| Original page | Preview address | New role |
|---|---|---|
| index.html | / | Women's safety story, three wearables and concept gallery |
| Product/Livestock tracker/web/ | /tracker/ | Authenticated wearer/contact/device/emergency dashboard; original map/sidebar shell |
| Product/Mzansi Connect App/web/ | /app/ | Companion app concept preview |
| Product/Mzansi Cloud/web/ | /cloud/ | Authorised support concept preview |
| Product/Mzansi Marketplace/web/ | /marketplace/ | Support service concept preview |

Use fictional accounts and synthetic events on the tracker page. Accepting an invitation alone grants no location access; an event must be explicitly shared. Receipt, acknowledgement and response evidence are separate. No real SMS, email, push or emergency-service call is sent. The other three ecosystem pages are concept previews, not live operations or verified service listings.

The new Python API is under Product/Livestock tracker/server/safety/. It reuses the tested local prototype from this chat and stores separate development SQLite data in its ignored runtime/ directory. This is not a migration of the old Supabase/JSON data or the deployed Skyline backend. The old firmware, PCB, database, Android client and legacy API remain historical engineering inputs; they have not become validated women's safety hardware through a copy change.

## Assets and source preservation

images/safety/ contains the three supplied concept graphics plus the fifteen-view family concept generated in this chat. Artwork is not an engineering drawing. The original source licenses/notices remain in place. The original page files were backed up and SHA256-inventoried in the chat's Mzansi-Connect-Womens-Safety-Merge output folder before editing.

The parent folder is the working source. The nested Mzansi-Connect/ checkout and Skyline-IT/Subsidies/Mzansi Connect/ are GitHub copies, synchronized for this user-authorized update. GitHub Pages serves the appearance previews; authenticated account operations require the local Python API or a separately deployed backend. No backend is supplied by GitHub Pages.

Read docs/WOMENS_SAFETY_TRANSITION.md for reuse decisions, remaining engineering work and the feature-status boundary. Do not launch the old public livestock API with real personal-location data. A complete privacy, threat, hardware and field validation process remains required before production.

Legacy /livestock/ links also load the adapted tracker in the local preview. The default start-server.bat now launches this combined safety preview; the old launcher is preserved in the before-change backup.

A separate black-and-purple test copy is in Purple/. Compare it at /Purple/ in the local preview. Product cards now use new device design pictures. The tracker has Original and Purple appearance buttons. Both appearances and their public assets are included in the GitHub copies under the user’s 24 October 2026 publishing instruction.

## 24 October shop and hardware update

The shop follows the appearance controls and prepares an email enquiry, without taking payment. Both tracker appearances use the same scoped safety client. New KiCad architecture inputs and the audit are in Product/Livestock tracker/hardware/kicad/womens-safety-reference/. They are not a completed electrical PCB or fabrication release.
