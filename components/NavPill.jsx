'use client';
import { useState, useRef, useEffect } from 'react';
import { PlacesAPI } from '@/lib/AutoCompleteAPI';
import './NavPill.css';

const places = new PlacesAPI(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
const DELAY = 275;

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(null);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);

    const updateIsMobile = (event) => {
      setIsMobile(event?.matches ?? mq.matches);
    };

    updateIsMobile();

    if (mq.addEventListener) {
      mq.addEventListener('change', updateIsMobile);
      return () => mq.removeEventListener('change', updateIsMobile);
    }

    mq.addListener(updateIsMobile);
    return () => mq.removeListener(updateIsMobile);
  }, [breakpoint]);

  return isMobile;
}

function SuggestionList({ suggestions, onSelect, inOverlay = false }) {
  if (!suggestions.length) return null;
  return (
    <ul className={`np-dropdown ${inOverlay ? 'np-dropdown--overlay' : 'np-dropdown--floating'}`}>
      {suggestions.map((s, i) => (
        <li key={i} className="np-dropdown__item" onMouseDown={() => onSelect(s)}>
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

function PillField({ fieldRef, inputRef, icon, label, value, placeholder, onChange, onFocus, onClear, active }) {
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
      <button 
        className={`np-field__clear ${value.length > 0 ? 'np-field__clear--visible' : 'np-field__clear--hidden'}`} 
        onMouseDown={onClear} 
        aria-label="Clear"
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function MobileOverlay({ which, input, placeholder, suggestions, onClose, onChange, onSelect, onClear, inputRef }) {
  useEffect(() => { inputRef.current?.focus(); }, [inputRef]);

  return (
    <div className="np-mobile-overlay np-mobile-overlay--open">
      <div className="np-mobile-overlay__header">
        <button className="np-mobile-overlay__back" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="np-mobile-overlay__label">{which === 'origin' ? 'Set origin' : 'Set destination'}</div>
      </div>
      <div className="np-mobile-overlay__input-row">
        {which === 'origin' ? <HomeIcon /> : <DestIcon />}
        <input ref={inputRef} className="np-mobile-overlay__input" value={input} onChange={onChange} placeholder={placeholder} />
        <button 
          className={`np-field__clear ${input.length > 0 ? 'np-field__clear--visible' : 'np-field__clear--hidden'}`}
          onMouseDown={onClear}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      </div>
      <div className="np-mobile-overlay__body">
        <SuggestionList suggestions={suggestions} onSelect={onSelect} inOverlay />
      </div>
    </div>
  );
}

export default function NavPill({ onSelect }) {
  const [originInput, setOriginInput] = useState('');
  const [destInput, setDestInput] = useState('');
  const [originLabel, setOriginLabel] = useState('');
  const [destLabel, setDestLabel] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeField, setActiveField] = useState(null);
  const [mobileOverlay, setMobileOverlay] = useState(null);

  const pillRef = useRef(null);
  const originInputRef = useRef(null);
  const destInputRef = useRef(null);
  const mobileInputRef = useRef(null);
  const timer = useRef(null);
  const requestSeq = useRef(0);
  const isMobile = useIsMobile();
  const shouldRenderMobile = isMobile === true;

  useEffect(() => {
    document.body.style.overflow = mobileOverlay ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOverlay]);

  useEffect(() => {
    const handler = (e) => {
      if (!pillRef.current?.contains(e.target)) {
        setActiveField(null);
        clearTimeout(timer.current);
        requestSeq.current += 1;
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function invalidateSuggestions() {
    clearTimeout(timer.current);
    requestSeq.current += 1;
    setSuggestions([]);
  }

  async function getSuggestions(value) {
    if (value.length < 3) {
      invalidateSuggestions();
      return;
    }

    const requestId = ++requestSeq.current;

    try {
      const results = await places.autocomplete(value);
      if (requestId !== requestSeq.current) return;
      setSuggestions(results.slice(0, 5));
    } catch (err) {
      if (requestId === requestSeq.current) {
        setSuggestions([]);
      }
    }
  }

  function handleChange(setter, e) {
    const value = e.target.value;
    setter(value);
    clearTimeout(timer.current);

    if (value.length < 3) {
      invalidateSuggestions();
      return;
    }

    timer.current = setTimeout(() => getSuggestions(value), DELAY);
  }

  function handleSelect(suggestion) {
    const { placeId, text } = suggestion.placePrediction;
    const label = text.text;
    if (activeField === 'origin' || mobileOverlay === 'origin') {
      setOriginInput(label); setOriginLabel(label);
    } else {
      setDestInput(label); setDestLabel(label);
    }
    invalidateSuggestions();
    setActiveField(null); setMobileOverlay(null);
    onSelect?.({ field: activeField ?? mobileOverlay, label, placeId });
  }

  function handleClear(field) {
    if (field === 'origin') {
      setOriginInput(''); setOriginLabel(''); 
      if (shouldRenderMobile) mobileInputRef.current?.focus();
      else originInputRef.current?.focus(); 
    } else {
      setDestInput(''); setDestLabel(''); 
      if (shouldRenderMobile) mobileInputRef.current?.focus();
      else destInputRef.current?.focus(); 
    }
    invalidateSuggestions();
  }

  function handleFieldActivate(field, value) {
    setActiveField(field);
    if (value.length >= 3) {
      getSuggestions(value);
    } else {
      invalidateSuggestions();
    }
  }

  function handleMobileOverlayOpen(field, value) {
    setMobileOverlay(field);
    if (value.length >= 3) {
      getSuggestions(value);
    } else {
      invalidateSuggestions();
    }
  }

  if (isMobile === null) {
    return null;
  }

  if (!shouldRenderMobile) {
    return (
      <div ref={pillRef} className="np-pill-wrapper">
        <div className={`np-pill ${activeField ? 'np-pill--focused' : ''}`}>
          <PillField
            inputRef={originInputRef}
            icon={<HomeIcon />}
            label="Origin"
            value={originInput}
            placeholder="Where from?"
            active={activeField === 'origin'}
            onChange={(e) => handleChange(setOriginInput, e)}
            onFocus={() => handleFieldActivate('origin', originInput)}
            onClear={(e) => { e.stopPropagation(); handleClear('origin'); }}
          />
          <div className="np-pill__divider" />
          <PillField
            inputRef={destInputRef}
            icon={<DestIcon />}
            label="Destination"
            value={destInput}
            placeholder="Where to?"
            active={activeField === 'dest'}
            onChange={(e) => handleChange(setDestInput, e)}
            onFocus={() => handleFieldActivate('dest', destInput)}
            onClear={(e) => { e.stopPropagation(); handleClear('dest'); }}
          />
        </div>
        {activeField && <SuggestionList suggestions={suggestions} onSelect={handleSelect} />}
      </div>
    );
  }

  const mobileInput = mobileOverlay === 'origin' ? originInput : destInput;
  const mobileSetter = mobileOverlay === 'origin' ? setOriginInput : setDestInput;

  return (
    <>
      <div className="np-pill np-pill--mobile">
        <div className="np-mobile-row" onClick={() => handleMobileOverlayOpen('origin', originInput)}>
          <HomeIcon />
          <div className="np-mobile-row__body">
            <span className="np-field__label">Origin</span>
            <span className={`np-mobile-row__value ${!originLabel ? 'np-mobile-row__value--placeholder' : ''}`}>
              {originLabel || 'Where from?'}
            </span>
          </div>
        </div>
        <div className="np-pill__divider np-pill__divider--horizontal" />
        <div className="np-mobile-row" onClick={() => handleMobileOverlayOpen('dest', destInput)}>
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
          suggestions={suggestions}
          inputRef={mobileInputRef}
          onClose={() => { setMobileOverlay(null); invalidateSuggestions(); }}
          onChange={(e) => handleChange(mobileSetter, e)}
          onSelect={handleSelect}
          onClear={() => handleClear(mobileOverlay)}
        />
      )}
    </>
  );
}
