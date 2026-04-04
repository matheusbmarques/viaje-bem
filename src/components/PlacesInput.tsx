import { useState, useEffect, useRef, useCallback } from 'react';
import { AutoComplete } from 'primereact/autocomplete';
import type { AutoCompleteCompleteEvent, AutoCompleteSelectEvent, AutoCompleteChangeEvent } from 'primereact/autocomplete';
import styles from './PlacesInput.module.scss';

interface Suggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface PlacesInputProps {
  value: string;
  onChange: (value: string, placeId?: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  mapsLoaded: boolean;
}

export function PlacesInput({
  value,
  onChange,
  placeholder,
  label,
  disabled,
  mapsLoaded,
}: PlacesInputProps) {
  const [autoValue, setAutoValue] = useState<string | Suggestion>(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAutoValue(value);
  }, [value]);

  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (!mapsLoaded || input.length < 3) {
        setSuggestions([]);
        return;
      }

      try {
        const { suggestions: results } =
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input,
            language: 'pt-BR',
          });

        setSuggestions(
          results
            .filter((s) => s.placePrediction !== null)
            .map((s) => ({
              placeId: s.placePrediction!.placeId,
              description: s.placePrediction!.text.text,
              mainText: s.placePrediction!.mainText?.text ?? s.placePrediction!.text.text,
              secondaryText: s.placePrediction!.secondaryText?.text ?? '',
            }))
        );
      } catch {
        setSuggestions([]);
      }
    },
    [mapsLoaded]
  );

  const handleComplete = (e: AutoCompleteCompleteEvent) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(e.query), 500);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (e: AutoCompleteChangeEvent) => {
    setAutoValue(e.value);
    if (typeof e.value === 'string') {
      onChange(e.value);
    }
  };

  const handleSelect = (e: AutoCompleteSelectEvent) => {
    const suggestion = e.value as Suggestion;
    onChange(suggestion.description, suggestion.placeId);
  };

  const itemTemplate = (suggestion: Suggestion) => (
    <div className={styles.option}>
      <span className={styles.mainText}>{suggestion.mainText}</span>
      {suggestion.secondaryText && (
        <span className={styles.secondaryText}>{suggestion.secondaryText}</span>
      )}
    </div>
  );

  return (
    <div className={styles.container}>
      {label && <label className={styles.label}>{label}</label>}
      <AutoComplete
        value={autoValue}
        field="description"
        suggestions={suggestions}
        completeMethod={handleComplete}
        onChange={handleChange}
        onSelect={handleSelect}
        itemTemplate={itemTemplate}
        placeholder={placeholder}
        disabled={disabled}
        className={styles.autocompleteRoot}
      />
    </div>
  );
}
