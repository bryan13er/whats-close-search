'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   NavPill — dual-field location picker (origin + destination)

   Desktop: classic pill with floating dropdown (unchanged from v1).
   Mobile:  lives inside <BottomSheet>. Both fields are always rendered as rows.
            Tapping a field requests the sheet to expand (via SheetContext) and
            focuses that field's input. Suggestions appear inline below the fields.
            Selecting a place collapses the sheet back to its resting position.
───────────────────────────────────────────────────────────────────────────── */

import { useState, useRef, useEffect, Fragment } from 'react';
import { PlacesAPI } from '@/lib/AutoCompleteAPI';
import { useSheet } from '@/components/BottomSheet';
import './NavPill.css';

const places = new PlacesAPI(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

/* Debounce delay — balances UX responsiveness against API cost */
const DELAY         = 600;
const INPUT_CHAR_MIN = 5;

const FIELDS = [
  { id: 'origin', label: 'Origin',      placeholder: 'Where from?', icon: HomeIcon },
  { id: 'dest',   label: 'Destination', placeholder: 'Where to?',   icon: DestIcon },
];

/* ── SSR-safe responsive hook ───────────────────────────────────────────── */
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(null);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = (e) => setIsMobile(e?.matches ?? mq.matches);
    update();
    if (mq.addEventListener) {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, [breakpoint]);
  return isMobile;
}

/* ── Shared sub-components ─────────────────────────────────────────────── */

function SuggestionList({ suggestions, onSelect, inOverlay = false }) {
  if (!suggestions.length) return null;
  return (
    <ul className={`np-dropdown ${inOverlay ? 'np-dropdown--overlay' : 'np-dropdown--floating'}`}>
      {suggestions.map((s) => (
        <li
          aria-label={s.placePrediction.placeId}
          key={s.placePrediction.placeId}
          className="np-dropdown__item"
          onMouseDown={() => onSelect(s)}
          onTouchEnd={(e) => { e.preventDefault(); onSelect(s); }}
        >
          <span className="np-dropdown__pin">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5C5.51 1.5 3.5 3.51 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6c0-2.49-2.01-4.5-4.5-4.5zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="currentColor" />
            </svg>
          </span>
          <span className="np-dropdown__text">{s.placePrediction.text.text}</span>
        </li>
      ))}
      <li className="np-dropdown__attribution">Powered by Google</li>
    </ul>
  );
}

function HomeIcon() {
  return (
    <svg className="np-field__icon" width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M2 6.5L8 2l6 4.5V14a1 1 0 01-1 1H3a1 1 0 01-1-1V6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6 15v-5h4v5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function DestIcon() {
  return (
    <svg className="np-field__icon" width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M3 2v12M3 3l9 2.5L3 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClearButton({ visible, onMouseDown }) {
  return (
    <button
      className={`np-field__clear ${visible ? 'np-field__clear--visible' : 'np-field__clear--hidden'}`}
      onMouseDown={onMouseDown}
      aria-label="Clear"
    >
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
        <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/* ── Desktop pill field ─────────────────────────────────────────────────── */
function PillField({ fieldRef, inputRef, icon: Icon, label, value, placeholder, onChange, onFocus, onClear, active }) {
  return (
    <div ref={fieldRef} className={`np-field ${active ? 'np-field--active' : ''}`}>
      <Icon />
      <div className="np-field__body">
        <span className="np-field__label">{label}</span>
        <input
          ref={inputRef}
          className="np-field__input"
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          placeholder={placeholder}
        />
      </div>
      <ClearButton visible={value.length > 0} onMouseDown={onClear} />
    </div>
  );
}

/* ── Mobile sheet field row ─────────────────────────────────────────────────
   Renders one origin/destination row inside the bottom sheet.
   Active rows show a live <input>; inactive rows show the selected label
   (or placeholder) as static text — tapping activates and expands the sheet.
─────────────────────────────────────────────────────────────────────────── */
function SheetFieldRow({ field, inputRef, value, label, active, onTap, onChange, onClear }) {
  const Icon = field.icon;
  return (
    <div
      className={`np-sheet-row ${active ? 'np-sheet-row--active' : ''}`}
      onClick={!active ? onTap : undefined}
    >
      <span className="np-sheet-row__icon-wrap">
        <Icon />
      </span>

      <div className="np-sheet-row__body">
        <span className="np-sheet-row__label">{field.label}</span>

        {active ? (
          /* Editable input — shown when this field is focused */
          <input
            ref={inputRef}
            className="np-sheet-row__input"
            value={value}
            onChange={onChange}
            placeholder={field.placeholder}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
        ) : (
          /* Read-only display — tapping this opens the field */
          <span className={`np-sheet-row__value ${!label ? 'np-sheet-row__value--placeholder' : ''}`}>
            {label || field.placeholder}
          </span>
        )}
      </div>

      {active && <ClearButton visible={value.length > 0} onMouseDown={(e) => { e.stopPropagation(); onClear(); }} />}
    </div>
  );
}

/* ── NavPill (main export) ───────────────────────────────────────────────── */
export default function NavPill({ onSelect }) {
  const [fieldState, setFieldState] = useState({
    origin: { input: '', label: '' },
    dest:   { input: '', label: '' },
  });
  const [suggestions, setSuggestions]   = useState([]);
  const [activeField, setActiveField]   = useState(null);

  const pillRef    = useRef(null);
  const inputRefs  = useRef({ origin: null, dest: null });
  const timer      = useRef(null);
  const requestSeq = useRef(0);

  const isMobile         = useIsMobile();
  const shouldRenderMobile = isMobile === true;

  /* Access the bottom sheet's snap state + setter (no-ops on desktop) */
  const { snap: sheetSnap, setSnap: setSheetSnap } = useSheet();

  /* ── When the user drags the sheet down to collapsed, deactivate the field ── */
  useEffect(() => {
    if (sheetSnap === 'collapsed') {
      setActiveField(null);
      invalidateSuggestions();
    }
  }, [sheetSnap]);

  /* ── Click-outside handler (desktop only) ── */
  useEffect(() => {
    if (shouldRenderMobile) return;
    const handler = (e) => {
      if (!pillRef.current?.contains(e.target)) {
        setActiveField(null);
        invalidateSuggestions();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [shouldRenderMobile]);

  /* ── Suggestion helpers ─────────────────────────────────────────────── */

  function invalidateSuggestions() {
    clearTimeout(timer.current);
    requestSeq.current += 1;
    setSuggestions([]);
  }

  async function fetchSuggestions(value) {
    if (value.length < INPUT_CHAR_MIN) { invalidateSuggestions(); return; }
    const requestId = ++requestSeq.current;
    try {
      const results = await places.autocomplete(value);
      if (requestId !== requestSeq.current) return; // stale — discard
      const sliced = results.slice(0, 5);
      setSuggestions(sliced);
      /* Expand to full height to reveal the suggestion list */
      if (sliced.length > 0 && shouldRenderMobile) setSheetSnap('full');
    } catch {
      if (requestId === requestSeq.current) setSuggestions([]);
    }
  }

  function handleChange(fieldId, value) {
    setFieldState(prev => ({ ...prev, [fieldId]: { ...prev[fieldId], input: value } }));
    clearTimeout(timer.current);
    if (value.length < INPUT_CHAR_MIN) { invalidateSuggestions(); return; }
    timer.current = setTimeout(() => fetchSuggestions(value), DELAY);
  }

  /* ── Desktop field interaction ───────────────────────────────────────── */

  function handleActivate(fieldId, value) {
    setActiveField(fieldId);
    value.length >= INPUT_CHAR_MIN ? fetchSuggestions(value) : invalidateSuggestions();
  }

  /* ── Mobile sheet field interaction ─────────────────────────────────────
     Tapping a row in the sheet:
       1. Sets that row as active (shows the <input>).
       2. Asks the sheet to expand to half height.
       3. Focuses the input after React renders it.
     If the field already had text, pre-fetch suggestions.
  ─────────────────────────────────────────────────────────────────────── */
  function handleSheetTap(fieldId) {
    setActiveField(fieldId);
    setSheetSnap('half');
    const val = fieldState[fieldId].input;
    if (val.length >= INPUT_CHAR_MIN) fetchSuggestions(val);
    else invalidateSuggestions();

    /* Focus after the input renders */
    setTimeout(() => inputRefs.current[fieldId]?.focus(), 50);
  }

  /* ── Selection handler (shared desktop + mobile) ─────────────────────── */
  function handleSelect(suggestion) {
    const { placeId, text } = suggestion.placePrediction;
    const label   = text.text;
    const fieldId = activeField;

    setFieldState(prev => ({ ...prev, [fieldId]: { input: label, label } }));
    invalidateSuggestions();
    setActiveField(null);

    /* Collapse the sheet after a selection so the user sees the result */
    if (shouldRenderMobile) setSheetSnap('collapsed');

    places.getGeocodeV3(placeId).then(({ location }) => {
      const place = { field: fieldId, label, placeId, lat: location.latitude, lng: location.longitude };
      console.log(place);
      onSelect?.(place);
    }).catch((err) => {
      console.error('Geocode failed:', err);
    });
  }

  /* ── Clear handler ───────────────────────────────────────────────────── */
  function handleClear(fieldId) {
    setFieldState(prev => ({ ...prev, [fieldId]: { input: '', label: '' } }));
    invalidateSuggestions();
    setTimeout(() => inputRefs.current[fieldId]?.focus(), 0);
  }

  /* ── Render guard: wait for media query to resolve ───────────────────── */
  if (isMobile === null) return null;

  /* ════════════════════════════════════════════════════════════════════════
     DESKTOP RENDER — unchanged pill layout from v1
  ════════════════════════════════════════════════════════════════════════ */
  if (!shouldRenderMobile) {
    return (
      <div ref={pillRef} className="np-pill-wrapper">
        <div className={`np-pill ${activeField ? 'np-pill--focused' : ''}`}>
          {FIELDS.map((f, i) => (
            <Fragment key={f.id}>
              {i > 0 && <div className="np-pill__divider" />}
              <PillField
                inputRef={el => (inputRefs.current[f.id] = el)}
                icon={f.icon}
                label={f.label}
                value={fieldState[f.id].input}
                placeholder={f.placeholder}
                active={activeField === f.id}
                onChange={e => handleChange(f.id, e.target.value)}
                onFocus={() => handleActivate(f.id, fieldState[f.id].input)}
                onClear={e => { e.stopPropagation(); handleClear(f.id); }}
              />
            </Fragment>
          ))}
        </div>
        {activeField && <SuggestionList suggestions={suggestions} onSelect={handleSelect} />}
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════════
     MOBILE RENDER — sheet-native layout (no full-screen overlay)
     Both fields are always present. The active field shows an <input>;
     the other shows its selected label or placeholder as static text.
     Suggestions appear below the field rows and are scrollable when the
     sheet is at the FULL snap point.
  ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="np-sheet-content">

      {/* ── Field rows (always visible — appear in the collapsed handle area) ── */}
      <div className="np-sheet-fields">
        {FIELDS.map((f, i) => (
          <Fragment key={f.id}>
            {i > 0 && <div className="np-sheet-fields__divider" />}
            <SheetFieldRow
              field={f}
              inputRef={el => (inputRefs.current[f.id] = el)}
              value={fieldState[f.id].input}
              label={fieldState[f.id].label}
              active={activeField === f.id}
              onTap={() => handleSheetTap(f.id)}
              onChange={e => handleChange(f.id, e.target.value)}
              onClear={() => handleClear(f.id)}
            />
          </Fragment>
        ))}
      </div>

      {/* ── Suggestions list (only appears after user types) ── */}
      {activeField && suggestions.length > 0 && (
        <div className="np-sheet-suggestions">
          <SuggestionList suggestions={suggestions} onSelect={handleSelect} inOverlay />
        </div>
      )}

    </div>
  );
}
