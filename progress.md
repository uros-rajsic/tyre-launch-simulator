Original prompt: Improve mobile support for the deployed static web game repo. Touch already works for the rope, tyre pickup, and stick, but mobile needs controls for revving the engine, moving/pitching the ladder, and steering in flight. Hide or move debug/helper text that blocks touch.

## Progress

- Planned a touch-first UI: compact mobile HUD, right-side throttle while mounted, ladder slide + pitch while rolling, and a flight joystick while airborne.

## TODO

- No known follow-up blockers from this pass.

- Implemented mobile touch overlay markup/CSS and JS bindings for throttle, ladder slide/pitch, and flight joystick. Next: run locally and verify in a mobile viewport.

- Added inline favicon to avoid client-recorded 404 noise and added window-level slider release handling. Verified throttle/ladder/flight controls with mobile Playwright screenshots.
