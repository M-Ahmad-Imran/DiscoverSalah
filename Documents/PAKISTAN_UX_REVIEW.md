# Pakistan audience usability review

8 November 2026. This is a source-code and browser-flow review informed by published research, not a field study or a WCAG conformance certification. The intended audience includes people with limited technical experience; that is not a claim about every Pakistani user.

## Assessment

The product's core idea fits a clear task: a person in an unfamiliar area needs a nearby mosque, its congregation time and directions. Free browsing without an account, Urdu/English switching, mosque-specific times and separate staff roles support that task. Broad public comfort is not yet established: real users on low-cost phones must test the full journey.

GSMA's Pakistan research identifies literacy, digital skills and affordability as barriers. This supports short instructions, clear controls and low-data paths; it does not establish that everyone prefers the same language. Preserve a visible language choice and test Urdu script versus familiar English terms with actual participants. Do not assume Roman Urdu or an Urdu-only default is universally better.

## Improvements implemented

| Finding | Change | User benefit |
| --- | --- | --- |
| Homepage language was abstract | Explicit unfamiliar-area use case and no-account message in Urdu/English | Explains the service before asking for action |
| Coordinates appeared as ordinary required-looking work | Moved into optional expandable section | GPS/city browsing is easier to understand |
| Manual address text was presented like address search | Clearly labelled as a reference label; explains city-only filtering | Avoids false expectations of geocoding |
| GPS could still require an unrelated city | GPS searches clear city filtering; city required only without coordinates | Nearby discovery is not blocked by city entry |
| Coordinate pairs could be incomplete | Both values required when either is supplied | Prevents silently falling back to city browsing |
| Small mobile form text and some compact controls | 16px mobile inputs, larger public body/label text, 44px key controls | Easier reading/tapping; 44px is a design target, not a whole-site accessibility claim |
| Toggle state was visual only | Added aria-pressed to scope/travel buttons | Announces selected options to assistive technology |
| Language control lacked explicit language metadata | Added destination language and label | Clearer screen-reader pronunciation |
| Field helper could replace existing description | Merge aria-describedby IDs | Preserves existing accessible instructions |
| Cold starts could look like a broken app | Shared bounded readiness check and Urdu/English status | Explains delays without replaying submissions |
| Connection status could retain old language | Render it inside the updating application provider | Status follows language changes |

## Priorities before a public launch

1. **Observed mobile task testing:** recruit 6–8 people across visitors, representatives and focal persons, including older users and people with limited smartphone experience. Include women and shared-device users; do not rely only on the development team.
2. **Location permission refusal:** ask participants to find a mosque after denying GPS. Manual city entry still needs the stored city's spelling; city suggestions/search across Urdu/English aliases would improve it. This is a remaining feature, not implemented geocoding.
3. **Trusted times:** have users explain which mosque/date/prayer they are viewing, whether a change is pending or approved, and how to report an incorrect time. Never hide approval states just to shorten a form.
4. **Staff forms:** observe a representative updating a time and a focal person reviewing it. Simplify individual confusing terms only after observation; retain identity, confirmation and audit requirements.
5. **Low-cost phones and weak networks:** test 360px-wide Android screens, large system text, interrupted connections and Render cold starts. Do not claim offline support: current timings must come from the server.
6. **Language review:** a Pakistani Urdu-speaking reviewer should check all management, MFA and error messages. Urdu script, common English words and Roman Urdu are different preferences; test before adding another translation layer.

## Practical acceptance exercise

Ask participants, without coaching, to: switch language; find a mosque in a new area; read today's selected prayer time; open directions; deny location and browse a city; recover from a connection failure. Staff additionally submit and approve a timing change and explain the result.

Record completion, time, wrong taps, requests for help, and whether the user correctly understood the displayed time/status. Suggested initial target: at least 80% unassisted completion for each public task and no mistaken mosque/prayer/date interpretation. These are proposed acceptance criteria, not measured results. Obtain consent, use synthetic accounts, and do not record real passwords, MFA codes or precise home locations.

## Sources

- [GSMA: Pakistan digital inclusion research, 2025](https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/gsma_resources/a-breakthrough-year-for-womens-digital-inclusion-in-pakistan/)
- [GSMA: barriers to mobile internet adoption](https://www.gsma.com/somic/barriers-to-mobile-internet-adoption-and-use/)
- [W3C: target size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)

Automated tests and browser checks cannot establish whether the language feels natural or the product feels comfortable to this audience. Those conclusions require the participant exercise above.
