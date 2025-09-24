"use client";

import React, { useRef, useEffect, useState } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Enter description...",
  className = ""
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({
    bold: false,
    italic: false,
    underline: false,
  });

  // Update editor content when value changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  // Reset format states when selection changes (user clicks elsewhere)
  useEffect(() => {
    const resetFormatStates = () => {
      setActiveFormats({
        bold: false,
        italic: false,
        underline: false,
      });
    };

    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener('selectionchange', resetFormatStates);
    }

    return () => {
      if (editor) {
        editor.removeEventListener('selectionchange', resetFormatStates);
      }
    };
  }, []);

  // Handle content changes
  const handleInput = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  };

  // Format text
  const formatText = (command: string, value?: string) => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    
    // Toggle the format state immediately
    setActiveFormats(prev => ({
      ...prev,
      [command]: !prev[command]
    }));
    
    // Execute the command
    document.execCommand(command, false, value);
    
    handleInput();
  };

  // Check if format is active
  const isFormatActive = (command: string) => {
    return activeFormats[command] || false;
  };

  // Toolbar button component
  const ToolbarButton = ({ 
    command, 
    icon, 
    title, 
    value 
  }: { 
    command: string; 
    icon: React.ReactNode; 
    title: string; 
    value?: string;
  }) => (
    <button
      type="button"
      onClick={() => formatText(command, value)}
      className={`
        p-2 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700
        ${isFormatActive(command) ? 'bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400' : 'text-gray-600 dark:text-gray-400'}
      `}
      title={title}
    >
      {icon}
    </button>
  );

  return (
    <div className={`border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
        {/* Text Formatting */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            command="bold"
            title="Bold"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
              </svg>
            }
          />
          <ToolbarButton
            command="italic"
            title="Italic"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h3M9 12h3m-1-8L8 20" />
              </svg>
            }
          />
          <ToolbarButton
            command="underline"
            title="Underline"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18h12M6 6h12M6 10h12" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsActive(true)}
        onBlur={() => setIsActive(false)}
        className={`
          min-h-[120px] max-h-[300px] overflow-y-auto p-4 text-sm
          focus:outline-none focus:ring-2 focus:ring-brand-500
          dark:bg-gray-700 dark:text-white
          ${isActive ? 'ring-2 ring-brand-500' : ''}
        `}
        style={{ 
          minHeight: '120px',
          maxHeight: '300px'
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />

      {/* Placeholder */}
      {!value && (
        <div className="absolute top-[60px] left-4 text-gray-400 dark:text-gray-500 pointer-events-none text-sm">
          {placeholder}
        </div>
      )}

      {/* Character Count */}
      <div className="flex justify-between items-center px-4 py-2 bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600">
        <span>Rich text formatting available</span>
        <span>{value.replace(/<[^>]*>/g, '').length} characters</span>
      </div>
    </div>
  );
}
