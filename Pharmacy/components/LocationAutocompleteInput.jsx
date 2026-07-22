import React, { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import {
  geocodeAddress,
  getPlaceDetails,
  getPlaceSuggestions,
} from "../utils/locationUtils";

export const LocationAutocompleteInput = ({
  label = "Address",
  value,
  onChange,
  onLocationSelect,
  placeholder = "Search pharmacy address",
  required = false,
  disabled = false,
  icon,
  helperText,
  className = "",
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [focused, setFocused] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const debounceRef = useRef(null);
  const skipNextSearchRef = useRef(false);

  useEffect(() => {
    if (disabled) return undefined;

    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return undefined;
    }

    const text = String(value || "").trim();
    if (!focused || text.length < 2) {
      setSuggestions([]);
      return undefined;
    }

    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        setSearching(true);
        const results = await getPlaceSuggestions(text);
        setSuggestions(results);
      } catch (error) {
        console.log("Location suggestion error:", error.message);
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => window.clearTimeout(debounceRef.current);
  }, [value, focused, disabled]);

  const handleSelectSuggestion = async (suggestion) => {
    try {
      setSelecting(true);
      setSuggestions([]);
      skipNextSearchRef.current = true;

      const result = await getPlaceDetails(suggestion.placeId);
      onChange?.(result.address);
      onLocationSelect?.(result);
    } catch (error) {
      console.log("Place details error:", error.message);
      try {
        const fallback = await geocodeAddress(suggestion.description);
        onChange?.(fallback.address);
        onLocationSelect?.(fallback);
      } catch (fallbackError) {
        console.log("Address fallback geocode error:", fallbackError.message);
      }
    } finally {
      setSelecting(false);
      setFocused(false);
    }
  };

  const handleBlur = () => {
    window.setTimeout(() => setFocused(false), 180);
  };

  return (
    <div className={`mb-4 relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          {icon || <MapPin size={18} />}
        </div>

        <input
          value={value || ""}
          disabled={disabled || selecting}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 pl-10 pr-10 placeholder-gray-400 transition-colors disabled:opacity-60"
        />

        {(searching || selecting) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
            <Loader2 size={16} className="animate-spin" />
          </div>
        )}
      </div>

      {helperText && <p className="text-[11px] text-gray-500 mt-1">{helperText}</p>}

      {focused && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((item) => (
            <button
              type="button"
              key={item.placeId}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelectSuggestion(item)}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="text-sm font-semibold text-gray-900">{item.mainText}</div>
              {item.secondaryText && (
                <div className="text-xs text-gray-500 mt-0.5">{item.secondaryText}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
