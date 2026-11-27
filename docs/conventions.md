# Conventions

The codebase is small and consistent. Match what is there instead of introducing a second style.

## Formatting and lint

- **Prettier** (`.prettierrc`): no semicolons, single quotes, trailing commas, `printWidth: 120`,
  2-space indent. `npm run format` rewrites `src/**`; `npm run format:check` is what CI enforces.
- **ESLint** (`eslint.config.mjs`): `js.recommended` + `typescript-eslint.recommended` +
  `react-hooks` recommended + `react-refresh`, with `eslint-config-prettier` last. `src-tauri` and
  `dist` are ignored. `@typescript-eslint/no-explicit-any` is a warning — don't add new `any`s.
- **Husky** runs `lint-staged` on commit (`eslint --fix` + `prettier --write` for `src/**`, prettier
  for json/md/yaml). If hooks cannot run because the local Node is broken, fix the environment rather
  than bypassing with `--no-verify`.

### The one rule that bites

`eslint-plugin-react-hooks` v7 includes **`react-hooks/set-state-in-effect`**. Calling `setState`
directly inside `useEffect` fails lint. Prefer, in this order:

1. derive the value during render (`const x = ...`) or memoise it (`useMemo`);
2. compute it in the event handler that caused the change;
3. only then, state + effect — and if a value must be synced, keep it in a store instead.

There are a few documented `// eslint-disable-next-line react-hooks/exhaustive-deps` uses in
`useTrackPlayback.ts` (deliberately narrow dependency lists). Leave them, but prefer fixing deps when
you touch that code.

## React

- Function components only, default exports for components and pages.
- State that more than one screen needs belongs in a zustand store, not in a page.
- Long-lived singletons (audio engines, scheduler) are subscribed to from one hook each; components
  never talk to them directly.
- Anything that must survive navigation (playback, alarm overlay) is mounted in `App.tsx`/`AppShell`,
  not in a page.
- Keys, aria labels and roles matter: the app has tests and users that rely on `aria-label`s
  (`Play <title>`, `Edit alarm "<time>"`, `Seek`, …). When you change a control, keep its accessible
  name meaningful — unnamed alarms fall back to the scheduled time.

## Stores (zustand)

- One store per domain: `alarmStore`, `playlistStore`, `playerStore`, `uiStore`.
- Actions live inside the store; components call `useStore((s) => s.action)`.
- Inside async code or callbacks, read fresh state with `useStore.getState()` instead of closing over
  a render's value.
- Persistence is the store's job: mutate Dexie first, then `set(...)` so the UI and DB agree.

## Persistence (Dexie)

- Two databases, both in `src/db/`: `AlarmPlaylistDB` (`playlists`, `alarms`) and
  `AlarmPlaylistAudio` (`files`). Schema changes need a new `db.version(n).stores(...)` upgrade.
- Audio blobs are only read through `audioStorage.ts`. **Always play through `getAudioSource(id)`**,
  which returns `{ url, format }` — the format is required for `blob:` URLs (see known-issues).
- Never persist an object URL as durable data: `blob:` URLs die with the page load.

## Styling

- Tailwind CSS 4 via `@tailwindcss/vite`; utility classes inline, no CSS modules.
- Dark-only design: `bg-slate-900/950`, `text-slate-100/300/400`, `border-slate-700/800`, indigo
  (`indigo-500/600`) as the accent. Playlist colours come from a fixed palette in
  `CreatePlaylistModal`.
- Class composition with `clsx`/`cn` (`src/utils/cn.ts`).
- Keep interactions keyboard-reachable; existing components use `aria-pressed`, `role="slider"`,
  `role="alertdialog"` — follow that pattern.

## Tests

- Vitest + Testing Library + jsdom, `fake-indexeddb` in `src/test/setup.ts`.
- Files are named by domain first: `components.Modal.test.tsx`, `hooks.useTrackPlayback.test.tsx`,
  `services.player.test.ts`, `utils.audio.test.ts`, `db.audioStorage.test.ts`.
- Mock modules with `vi.mock`; put shared mock factories in `vi.hoisted` so they are available to the
  hoisted call. Mock the audio engines rather than letting Howler run in jsdom.
- Prefer asserting user-visible results (roles, text, aria labels) over internal state.
- Fake timers (`vi.useFakeTimers()` + `act`) when a component has intervals; reset with
  `vi.useRealTimers()` in `afterEach`.
- Every bug fix that shaped a behaviour above should get a test that fails without the fix.

## Git

- Conventional commits: `feat(scope):`, `fix(scope):`, `build:`, `chore:`, `refactor:`, `test:`,
  `docs:`. Imperative subject, short; body explains **why**, wrapped near 72 characters.
- Run `lint`, `format:check`, `build` and `test` before committing (CI enforces them).
- Stage only what the change needs; never commit `.env`, keys or generated output (`dist/` is ignored).
- `AGENTS.md` at the repository root holds the broader workflow rules for AI tools; it is currently
  untracked local guidance.
