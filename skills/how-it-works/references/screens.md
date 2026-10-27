# Capturing screens

Read before capturing or recapturing the screens of a page.

## One file per state

- Capture each screen state into `.scratch/<slug>/screens/<state>.<ext>`, named after the state (`checkout-payment.webp`, `framing-editor.jpg`), so a recapture replaces the same file.
- Use the browser automation you have: Playwright (`page.screenshot({ type: "jpeg", quality: 80 })`, or `locator.screenshot()` to crop on one element), Chrome DevTools, or your host's browser tool.
- Fill the screens with demo or seeded data. When only a real record shows the state, replace the person's name, email, phone, and address before you capture.

## Size and crop

| Screen | Viewport | Scale |
| --- | --- | --- |
| Phone interface | 390 × 844 | 2 |
| Desktop interface | 1440 × 900 | 1 |

- Keep one viewport across the screens of one strip of steps, so they line up.
- Capture the full screen for a page. When the step is a dialog, a sheet, a menu, or a toast, crop on that element with about 24 px around it, so the reader sees what changed.
- Save phone screens as WebP or JPEG at quality 80, under 150 KB each, and desktop screens under 250 KB. Convert a PNG with `cwebp -q 80 in.png -o out.webp` or `ffmpeg -i in.png -q:v 3 out.jpg` when either tool is installed. The build warns about any image over 400 KB.

## Links to the live screen

Give a screen `data-href` with the plain URL of its state when the reader can open it (a prototype, a design site, staging); the carousel then offers to open the live screen. The reader signs in on their own, so the URL carries only the path and the state parameters.

## The project recipe

`docs/agents/how-it-works.md` keeps what the next run needs to capture the same screens without searching again. Write it, when the user agrees, with these sections:

- **Screen source**: where the states live, such as a prototype site, a local environment command, or staging.
- **Sign-in**: how the agent signs in, by the name of the environment variable or secret store that holds the credentials.
- **State URLs**: the URL pattern of a state and where the list of states lives.
- **Crop targets**: the selector of each element worth cropping on, such as the dialog panel or the bottom sheet.
- **Capture setup**: the browser binary, package, or command that works on this machine.
