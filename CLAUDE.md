# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

No test framework is configured.

## Architecture

A Next.js (App Router) location search UI. The app is a two-field origin/destination picker with Google Places autocomplete and geocoding.

**Data flow:**
1. User types in Origin or Destination field in `NavPill.jsx`
2. Input is debounced (600ms), then calls `PlacesAPI.getAutoComplete()` → Google Places Autocomplete API
3. User picks a suggestion → `PlacesAPI.getGeocode()` fetches lat/lng via Google Geocoding v3
4. Selection is returned to the parent as `{ field, label, placeId, lat, lng }`

**Key files:**
- `components/NavPill.jsx` — the main search UI; handles both desktop (pill layout) and mobile (full-screen overlay) modes, debounce, and race-condition prevention via a request sequence counter
- `lib/AutoCompleteAPI.js` — `PlacesAPI` class wrapping the two Google API calls
- `components/PlaceAutocomplete.jsx` — single-field autocomplete component (exists but not used in `page.js`)

**Responsive strategy:** `useIsMobile(768)` hook (via `window.matchMedia`) switches NavPill between a horizontal pill and a mobile overlay. The overlay sets `document.body.style.overflow = 'hidden'` while open.

**Race conditions:** NavPill uses a `requestSeq` counter to discard stale autocomplete responses when the user types quickly.

## Environment Variables

Both keys must be in `.env.local`:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...        # Google Places Autocomplete
NEXT_PUBLIC_GOOGLE_GEOCODING_API_KEY=...   # Google Geocoding v3
```

The Geocoding v4beta endpoint (`geocode.googleapis.com/v4beta`) has browser CORS restrictions and is not used; v3 (`maps.googleapis.com/maps/api/geocode/json`) is the active one.

## Known TODOs in Code

- `console.log` debug statements remain in `NavPill.jsx` and `AutoCompleteAPI.js`
- `getGeocodeV4` in `AutoCompleteAPI.js` is stubbed but unused (CORS issues in browser)
- `onSelect` callback in NavPill is wired up but `page.js` doesn't pass one yet
