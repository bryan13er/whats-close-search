'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { PlacesAPI } from '@/lib/AutoCompleteAPI';
import './PlaceAutocomplete.css';

const places = new PlacesAPI(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

/*
This prevents an API call firing on every single keystroke.
Without it, typing "coffee" would fire 6 requests 
— one for each character. With debounce it waits until the user stops typing for 300ms before firing anything.
*/
function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export default function PlaceAutocomplete({ placeholder = 'Search a place...', onSelect }) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  const fetchSuggestions = useCallback(async (value) => {
    if (value.length < 3) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const suggestions = await places.autocomplete(value);
      setSuggestions(suggestions);
      setOpen(true);
    } catch (err) {
      console.error(err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedFetch = useDebounce(fetchSuggestions, 300);

  const handleChange = (e) => {
    setInput(e.target.value);
    debouncedFetch(e.target.value);
  };

  const handleSelect = (suggestion) => {
    const { placeId, structuredFormat } = suggestion.placePrediction;
    const label = `${structuredFormat.mainText.text}, ${structuredFormat.secondaryText.text}`;
    setInput(label);
    setOpen(false);
    setSuggestions([]);
    console.log("picked something", placeId, structuredFormat);
    // TODO: get lat and long using another api call
    // onSelect?.({ label, placeId });
  };

  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
        />
        {loading && <span className="autocomplete-loading">...</span>}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="autocomplete-dropdown">
          {suggestions.map((s, i) => {
            const { text } = s.placePrediction.text;
            return (
              <li key={i} onMouseDown={() => handleSelect(s)} className="autocomplete-item">
                <span className="autocomplete-item-main">{text}</span>
              </li>
            );
          })}
          <li className="autocomplete-attribution">Powered by Google</li>
        </ul>
      )}
    </div>
  );
}