'use client';
import { useState, useRef, useEffect } from 'react';
import { PlacesAPI } from '@/lib/AutoCompleteAPI';
import './NavPill.css';

const places = new PlacesAPI(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

const DELAY = 275;

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

// Shared suggestion dropdown — positioned absolutely relative to pill
function SuggestionList({ suggestions, onSelect, anchorRef, inOverlay = false }) {
  const [style, setStyle] = useState({});

  // On desktop, center the dropdown under the divider
  useEffect(() => {
    if (inOverlay || !anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setStyle({
      top: rect.bottom + 8,                    // ← add this
      left: rect.left + rect.width / 2,
      width: rect.width,
      transform: 'translateX(-50%)',
    });
  }, [anchorRef, inOverlay]);

  if (!suggestions.length) return null;

  return (
    <ul
      className={`np-dropdown ${inOverlay ? 'np-dropdown--overlay' : 'np-dropdown--floating'}`}
      style={inOverlay ? undefined : style}
    >
      {suggestions.map((s, i) => {
        const text = s.placePrediction.text.text;
        return (
          <li key={i} className="np-dropdown__item" onMouseDown={() => onSelect(s)}>
            <span className="np-dropdown__pin">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5C5.51 1.5 3.5 3.51 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6c0-2.49-2.01-4.5-4.5-4.5zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="currentColor" />
              </svg>
            </span>
            <span className="np-dropdown__text">{text}</span>
          </li>
        );
      })}
      <li className="np-dropdown__attribution">Powered by Google</li>
    </ul>
  );
}

// Home icon
function HomeIcon() {
  return (
    <svg className="np-field__icon" width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M2 6.5L8 2l6 4.5V14a1 1 0 01-1 1H3a1 1 0 01-1-1V6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6 15v-5h4v5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

// Destination flag icon
function DestIcon() {
  return (
    <svg className="np-field__icon" width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M3 2v12M3 3l9 2.5L3 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// A single field within the pill
function PillField({
  fieldRef,
  inputRef,
  icon,
  label,
  value,
  placeholder,
  loading,
  onChange,
  onFocus,
  onClear,
  active,
}) {
  return (
    <div ref={fieldRef} className={`np-field ${active ? 'np-field--active' : ''}`}>
      {icon}
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
      {loading && <span className="np-field__loading" />}
      {value.length > 0 && !loading && (
        <button className="np-field__clear" onMouseDown={onClear} aria-label="Clear">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Mobile overlay ───────────────────────────────────────────────────────────
function MobileOverlay({
  which,
  input,
  placeholder,
  loading,
  suggestions,
  onClose,
  onChange,
  onSelect,
  onClear,
  inputRef,
}) {
  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  return (
    <div className="np-mobile-overlay np-mobile-overlay--open">
      <div className="np-mobile-overlay__header">
        <button className="np-mobile-overlay__back" onClick={onClose} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="np-mobile-overlay__label">
          {which === 'origin' ? 'Set origin' : 'Set destination'}
        </div>
      </div>

      <div className="np-mobile-overlay__input-row">
        {which === 'origin' ? <HomeIcon /> : <DestIcon />}
        <input
          ref={inputRef}
          className="np-mobile-overlay__input"
          value={input}
          onChange={onChange}
          placeholder={placeholder}
        />
        {loading && <span className="np-field__loading" />}
        {input.length > 0 && !loading && (
          <button className="np-field__clear" onMouseDown={onClear} aria-label="Clear">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <div className="np-mobile-overlay__body">
        {suggestions.length > 0 && (
          <SuggestionList suggestions={suggestions} onSelect={onSelect} inOverlay />
        )}
        {suggestions.length === 0 && input.length === 0 && (
          <p className="np-mobile-overlay__hint">Start typing to search…</p>
        )}
        {suggestions.length === 0 && input.length >= 3 && !loading && (
          <p className="np-mobile-overlay__hint">No results found.</p>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function NavPill({ onSelect }) {
  const [originInput, setOriginInput]       = useState('');
  const [destInput, setDestInput]           = useState('');
  const [originLabel, setOriginLabel]       = useState('');
  const [destLabel, setDestLabel]           = useState('');
  const [suggestions, setSuggestions]       = useState([]);
  const [activeField, setActiveField]       = useState(null); // 'origin' | 'dest' | null
  const [loading, setLoading]               = useState(false);
  const [mobileOverlay, setMobileOverlay]   = useState(null); // 'origin' | 'dest' | null

  const pillRef        = useRef(null);
  const originFieldRef = useRef(null);
  const destFieldRef   = useRef(null);
  const originInputRef = useRef(null);
  const destInputRef   = useRef(null);
  const mobileInputRef = useRef(null);
  const timer          = useRef(null);

  const isMobile = useIsMobile();

  // Lock scroll when mobile overlay is open
  useEffect(() => {
    document.body.style.overflow = mobileOverlay ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOverlay]);

  // Close dropdown on outside click (desktop)
  useEffect(() => {
    const handler = (e) => {
      if (!pillRef.current?.contains(e.target)) {
        setActiveField(null);
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function getSuggestions(value) {
    if (value.length < 3) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const results = await places.autocomplete(value);
      setSuggestions(results);
    } catch (err) {
      console.error(err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(setter, e) {
    setter(e.target.value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => getSuggestions(e.target.value), DELAY);
  }

  function handleSelect(suggestion) {
    const { placeId, text } = suggestion.placePrediction;
    const label = text.text;

    if (activeField === 'origin' || mobileOverlay === 'origin') {
      setOriginInput(label);
      setOriginLabel(label);
    } else {
      setDestInput(label);
      setDestLabel(label);
    }

    setSuggestions([]);
    setActiveField(null);
    setMobileOverlay(null);

    onSelect?.({
      field: activeField ?? mobileOverlay,
      label,
      placeId,
    });
  }

  function handleClear(field) {
    if (field === 'origin') {
      setOriginInput('');
      setOriginLabel('');
      originInputRef.current?.focus();
    } else {
      setDestInput('');
      setDestLabel('');
      destInputRef.current?.focus();
    }
    setSuggestions([]);
  }

  const anchorRef = pillRef;

  // ── Desktop ──────────────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <div ref={pillRef} className="np-pill-wrapper">
        <div className={`np-pill ${activeField ? 'np-pill--focused' : ''}`}>
          <PillField
            fieldRef={originFieldRef}
            inputRef={originInputRef}
            icon={<HomeIcon />}
            label="Origin"
            value={originInput}
            placeholder="Where from?"
            loading={loading && activeField === 'origin'}
            active={activeField === 'origin'}
            onChange={(e) => handleChange(setOriginInput, e)}
            onFocus={() => {
              setActiveField('origin');
              if (originInput.length >= 3) getSuggestions(originInput);
            }}
            onClear={(e) => { e.stopPropagation(); handleClear('origin'); }}
          />
          <div className="np-pill__divider" />
          <PillField
            fieldRef={destFieldRef}
            inputRef={destInputRef}
            icon={<DestIcon />}
            label="Destination"
            value={destInput}
            placeholder="Where to?"
            loading={loading && activeField === 'dest'}
            active={activeField === 'dest'}
            onChange={(e) => handleChange(setDestInput, e)}
            onFocus={() => {
              setActiveField('dest');
              if (destInput.length >= 3) getSuggestions(destInput);
            }}
            onClear={(e) => { e.stopPropagation(); handleClear('dest'); }}
          />
        </div>

        {activeField && suggestions.length > 0 && (
          <SuggestionList
            suggestions={suggestions}
            onSelect={handleSelect}
            anchorRef={anchorRef}
          />
        )}
      </div>
    );
  }

  // ── Mobile ───────────────────────────────────────────────────────────────
  const mobileInput  = mobileOverlay === 'origin' ? originInput : destInput;
  const mobileSetter = mobileOverlay === 'origin' ? setOriginInput : setDestInput;

  return (
    <>
      <div className="np-pill np-pill--mobile">
        {/* Origin row */}
        <div
          className="np-mobile-row"
          onClick={() => setMobileOverlay('origin')}
        >
          <HomeIcon />
          <div className="np-mobile-row__body">
            <span className="np-field__label">Origin</span>
            <span className={`np-mobile-row__value ${!originLabel ? 'np-mobile-row__value--placeholder' : ''}`}>
              {originLabel || 'Where from?'}
            </span>
          </div>
        </div>

        <div className="np-pill__divider np-pill__divider--horizontal" />

        {/* Destination row */}
        <div
          className="np-mobile-row"
          onClick={() => setMobileOverlay('dest')}
        >
          <DestIcon />
          <div className="np-mobile-row__body">
            <span className="np-field__label">Destination</span>
            <span className={`np-mobile-row__value ${!destLabel ? 'np-mobile-row__value--placeholder' : ''}`}>
              {destLabel || 'Where to?'}
            </span>
          </div>
        </div>
      </div>

      {mobileOverlay && (
        <MobileOverlay
          which={mobileOverlay}
          input={mobileInput}
          placeholder={mobileOverlay === 'origin' ? 'Where from?' : 'Where to?'}
          loading={loading}
          suggestions={suggestions}
          inputRef={mobileInputRef}
          onClose={() => { setMobileOverlay(null); setSuggestions([]); }}
          onChange={(e) => handleChange(mobileSetter, e)}
          onSelect={handleSelect}
          onClear={() => { mobileSetter(''); setSuggestions([]); }}
        />
      )}
    </>
  );
}