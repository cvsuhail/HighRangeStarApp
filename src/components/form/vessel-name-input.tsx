"use client";

import React, { useState, useEffect, useRef } from 'react';
import { VesselService } from '@/lib/vesselService';
import type { Vessel } from '@/types/vessel';

interface VesselNameInputProps {
  value: string;
  onChange: (value: string) => void;
  onVesselParsed?: (parsed: {
    name: string;
    number: string;
    slnoFormat: string;
    code: string;
  }) => void;
  onVesselSaved?: (vessel: Vessel) => void;
  autoSave?: boolean;
  placeholder?: string;
  className?: string;
}

interface ParsedVessel {
  name: string;
  number: string;
  slnoFormat: string;
  code: string;
}

export function VesselNameInput({ 
  value, 
  onChange, 
  onVesselParsed,
  onVesselSaved,
  autoSave = false,
  placeholder = "Enter vessel name (e.g., sayuk-60)",
  className = ""
}: VesselNameInputProps) {
  const [suggestions, setSuggestions] = useState<Vessel[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Parse vessel name from input
  const parseVesselName = (input: string): ParsedVessel => {
    if (!input.trim()) {
      return { name: "", number: "", slnoFormat: "S##", code: "" };
    }

    // Remove extra spaces and convert to lowercase for parsing
    const cleanInput = input.trim().toLowerCase();
    
    // Extract vessel number (digits at the end)
    const numberMatch = cleanInput.match(/(\d+)$/);
    const number = numberMatch ? numberMatch[1] : "";
    
    // Extract vessel name (everything before the number, remove hyphens/dashes)
    const namePart = cleanInput.replace(/\d+$/, '').replace(/[-_\s]+/g, '').trim();
    const name = namePart.toUpperCase();
    
    // Generate code: first letter of name + number
    const code = name && number ? `${name.charAt(0)}${number}` : "";
    
    // Generate SLNO format: first letter + ##
    const slnoFormat = name ? `${name.charAt(0)}##` : "S##";
    
    return { name, number, slnoFormat, code };
  };

  // Load vessel suggestions from Firebase
  const loadSuggestions = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      setIsLoading(true);
      console.log('Loading suggestions for:', searchTerm);
      const vessels = await VesselService.searchVesselsByName(searchTerm, 10);
      console.log('Found vessels:', vessels);
      setSuggestions(vessels);
    } catch (error) {
      console.error('Error loading vessel suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save vessel after debounce
  const autoSaveVessel = async (parsed: ParsedVessel) => {
    if (!autoSave || !parsed.name || !parsed.number) return;
    
    try {
      const savedVessel = await VesselService.autoSaveVessel(parsed);
      if (savedVessel) {
        onVesselSaved?.(savedVessel);
      }
    } catch (error) {
      console.error('Error auto-saving vessel:', error);
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Convert to uppercase for vessel names
    newValue = newValue.toUpperCase();
    
    onChange(newValue);
    
    // Parse vessel data and notify parent
    const parsed = parseVesselName(newValue);
    onVesselParsed?.(parsed);
    
    // Load suggestions
    loadSuggestions(newValue);
    setShowSuggestions(true);
    setSelectedIndex(-1);

    // Auto-save with debounce
    if (autoSave) {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
      
      const timeout = setTimeout(() => {
        autoSaveVessel(parsed);
      }, 2000); // 2 second debounce
      
      setAutoSaveTimeout(timeout);
    }
  };

  // Handle suggestion selection
  const selectSuggestion = (vessel: Vessel) => {
    console.log('selectSuggestion called with vessel:', vessel);
    // Display full vessel name with number format (e.g., HALUL-45)
    const displayValue = `${vessel.name.toUpperCase()}-${vessel.number}`;
    console.log('Setting display value:', displayValue);
    onChange(displayValue);
    onVesselParsed?.({
      name: vessel.name.toUpperCase(),
      number: vessel.number,
      slnoFormat: vessel.slnoFormat,
      code: vessel.code
    });
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Use setTimeout to ensure suggestion clicks are processed first
      setTimeout(() => {
        const target = event.target as Node;
        // Check if click is outside both input and suggestions dropdown
        if (inputRef.current && 
            !inputRef.current.contains(target) && 
            !inputRef.current.parentElement?.contains(target)) {
          setShowSuggestions(false);
          setSelectedIndex(-1);
        }
      }, 0);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [autoSaveTimeout]);

  // Update suggestion refs array
  useEffect(() => {
    suggestionRefs.current = suggestionRefs.current.slice(0, suggestions.length);
  }, [suggestions.length]);

  // Scroll selected suggestion into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        placeholder={placeholder}
        className={`${className || 'w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 focus:border-brand-500'}`}
        autoComplete="off"
      />
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((vessel, index) => (
            <div
              key={vessel.id}
              ref={el => suggestionRefs.current[index] = el}
              className={`px-3 py-2 cursor-pointer text-sm ${
                index === selectedIndex
                  ? 'bg-brand-100 dark:bg-brand-900 text-brand-900 dark:text-brand-100'
                  : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Suggestion clicked:', vessel);
                selectSuggestion(vessel);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="font-medium">{vessel.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                #{vessel.number} • {vessel.code} • {vessel.slnoFormat}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
