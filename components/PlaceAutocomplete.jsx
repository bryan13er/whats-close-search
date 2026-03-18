'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { PlacesAPI } from '@/lib/AutoCompleteAPI';
import './PlaceAutocomplete.css';

const places = new PlacesAPI(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

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

function SuggestionList({ suggestions, onSelect, inOverlay = false }) {
  return (
    <ul className={`autocomplete-dropdown ${inOverlay ? 'overlay-dropdown' : ''}`}>
      {suggestions.map((suggestion, index) => {
        const { text } = suggestion.placePrediction.text;
        return (
          <li
            key={index}
            onMouseDown={() => onSelect(suggestion)}
            className="autocomplete-item"
          >
            <svg className="autocomplete-item-pin" width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5C5.51 1.5 3.5 3.51 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6c0-2.49-2.01-4.5-4.5-4.5zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="currentColor" />
            </svg>
            <span className="autocomplete-item-main">{text}</span>
          </li>
        );
      })}
      <li className="autocomplete-attribution">Powered by Google</li>
    </ul>
  );
}

function DesktopPlaceAutocomplete({
  containerRef,
  input,
  placeholder,
  loading,
  open,
  suggestions,
  onChange,
  onFocus,
  onSelect,
  onClear,
}) {
  return (
    <div ref={containerRef} className="autocomplete-container">
      <div className={`autocomplete-box ${open ? 'focused' : ''}`}>
        <svg className="autocomplete-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M10 10L13.5 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          className="autocomplete-input"
          value={input}
          onChange={onChange}
          onFocus={onFocus}
          placeholder={placeholder}
        />
        <button className="autocomplete-clear-btn" onClick={onClear} 
            aria-label="Clear input" style={{ visibility: input.length > 0 ? 'visible' : 'hidden' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        {loading && <span className="autocomplete-loading">...</span>}
      </div>

      {open && suggestions.length > 0 && (
        <SuggestionList suggestions={suggestions} onSelect={onSelect} />
      )}
    </div>
  );
}

function MobilePlaceAutocomplete({
  containerRef,
  mobileInputRef,
  input,
  placeholder,
  loading,
  open,
  suggestions,
  mobileOverlayOpen,
  onChange,
  onOpenOverlay,
  onCloseOverlay,
  onFocus,
  onSelect,
  onClear,
}) {
  // Focus the overlay input when the overlay opens — derived from the prop
  // rather than a brittle setTimeout in the parent.
  useEffect(() => {
    if (mobileOverlayOpen) {
      mobileInputRef.current?.focus();
    }
  }, [mobileOverlayOpen, mobileInputRef]);

  return (
    <>
      <div ref={containerRef} className="autocomplete-container">
        <div className="autocomplete-box">
          <svg className="autocomplete-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10 10L13.5 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            className="autocomplete-input"
            value={input}
            onFocus={onOpenOverlay}
            placeholder={placeholder}
            readOnly
          />
        </div>
      </div>

      <div className={`mobile-overlay ${mobileOverlayOpen ? 'mobile-overlay--open' : ''}`}>
        <div className="mobile-overlay-header">
          <button className="mobile-overlay-back" onClick={onCloseOverlay} aria-label="Close search">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className={`autocomplete-box mobile-overlay-input-box ${open ? 'focused' : ''}`}>
            <svg className="autocomplete-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M10 10L13.5 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              ref={mobileInputRef}
              className="autocomplete-input"
              value={input}
              onChange={onChange}
              onFocus={onFocus}
              placeholder={placeholder}
            />
            {loading && <span className="autocomplete-loading">...</span>}
            <button className="mobile-clear-btn" onClick={onClear} 
              aria-label="Clear input" style={{ visibility: input.length > 0 ? 'visible' : 'hidden' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mobile-overlay-body">
          {suggestions.length > 0 && (
            <SuggestionList suggestions={suggestions} onSelect={onSelect} inOverlay />
          )}
          {suggestions.length === 0 && input.length === 0 && (
            <p className="mobile-overlay-hint">Start typing to search for a place…</p>
          )}
          {suggestions.length === 0 && input.length >= 3 && !loading && (
            <p className="mobile-overlay-hint">No results found.</p>
          )}
        </div>
      </div>
    </>
  );
}

export default function PlaceAutocomplete({ placeholder = 'Search a place...', onSelect }) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mobileOverlayOpen, setMobileOverlayOpen] = useState(false);

  const containerRef = useRef(null);
  const mobileInputRef = useRef(null);
  const isMobile = useIsMobile();
  const timer = useRef(null);
  // ms value passes to timeout function
  const delay = 275;

  // Lock body scroll when mobile overlay is open
  useEffect(() => {
    document.body.style.overflow = mobileOverlayOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOverlayOpen]);


  // get the suggestions based on input value by user
  // a call to this function gets set up through the timeout
  // i.e. when a user stops typing the call will execute after
  // 300ms 
  async function getSuggestions (value) {
    if (value.length < 3) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const results = await places.autocomplete(value);
      setSuggestions(results);
      setOpen(true);
    } catch (err) {
      console.error(err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }
  
  const handleChange = (e) => {
    setInput(e.target.value);
    // put the logic in here 
    clearTimeout(timer.current);
    // has to be done with an arrow function because it takes an arg 
    // otherwise it won't work 
    timer.current = setTimeout(() => getSuggestions(e.target.value), delay);

  };

  const handleSelect = (suggestion) => {
    const { placeId, text } = suggestion.placePrediction;
    const label = text.text;
    console.log(suggestion);
    setInput(label);
    setOpen(false);
    setSuggestions([]);
    setMobileOverlayOpen(false);
    onSelect?.({ label, placeId });
  };

  // Shared between desktop and mobile — shows existing suggestions on re-focus
  const handleInputFocus = () => {
    if (suggestions.length > 0) setOpen(true);
  };

  // Shared between desktop and mobile — ref.current is null on desktop so focus() is a no-op
  const handleClear = () => {
    setInput('');
    setSuggestions([]);
    setOpen(false);
    mobileInputRef.current?.focus();
  };

  const closeMobileOverlay = () => {
    setMobileOverlayOpen(false);
    setOpen(false);
  };

  // Close desktop dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (isMobile) {
    return (
      <MobilePlaceAutocomplete
        containerRef={containerRef}
        mobileInputRef={mobileInputRef}
        input={input}
        placeholder={placeholder}
        loading={loading}
        open={open}
        suggestions={suggestions}
        mobileOverlayOpen={mobileOverlayOpen}
        onChange={handleChange}
        onOpenOverlay={() => setMobileOverlayOpen(true)}
        onCloseOverlay={closeMobileOverlay}
        onFocus={handleInputFocus}
        onSelect={handleSelect}
        onClear={handleClear}
      />
    );
  }

  return (
    <DesktopPlaceAutocomplete
      containerRef={containerRef}
      input={input}
      placeholder={placeholder}
      loading={loading}
      open={open}
      suggestions={suggestions}
      onChange={handleChange}
      onFocus={handleInputFocus}
      onSelect={handleSelect}
      onClear={handleClear}
    />
  );
}