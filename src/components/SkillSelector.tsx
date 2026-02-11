'use client';

import { useState, useRef, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';

interface SkillSelectorProps {
  selectedSkills: string[];
  onSkillsChange: (skills: string[]) => void;
  placeholder?: string;
  maxSkills?: number;
  className?: string;
}

export default function SkillSelector({
  selectedSkills,
  onSkillsChange,
  placeholder = 'Add skills...',
  maxSkills,
  className = ''
}: SkillSelectorProps) {
  const { skills: allSkills } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter available skills
  const filteredSkills = allSkills.filter(skill => 
    skill.toLowerCase().includes(inputValue.toLowerCase()) &&
    !selectedSkills.includes(skill)
  );

  // Handle clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setInputValue('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const addSkill = (skill: string) => {
    if (!selectedSkills.includes(skill) && (!maxSkills || selectedSkills.length < maxSkills)) {
      onSkillsChange([...selectedSkills, skill]);
      setInputValue('');
      setIsOpen(false);
    }
  };

  const removeSkill = (skillToRemove: string) => {
    onSkillsChange(selectedSkills.filter(skill => skill !== skillToRemove));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const trimmedInput = inputValue.trim();
      
      // Add the exact match if it exists in filtered skills
      const exactMatch = filteredSkills.find(skill => 
        skill.toLowerCase() === trimmedInput.toLowerCase()
      );
      
      if (exactMatch) {
        addSkill(exactMatch);
      } else if (!selectedSkills.includes(trimmedInput) && (!maxSkills || selectedSkills.length < maxSkills)) {
        // Add as new skill if it doesn't exist
        onSkillsChange([...selectedSkills, trimmedInput]);
        setInputValue('');
        setIsOpen(false);
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedSkills.length > 0) {
      // Remove last skill if backspace on empty input
      removeSkill(selectedSkills[selectedSkills.length - 1]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setInputValue('');
    }
  };

  const canAddMore = !maxSkills || selectedSkills.length < maxSkills;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <div className="relative">
        <div className="flex flex-wrap gap-2 p-3 bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-lg min-h-[52px] focus-within:border-purple-500 transition-colors">
          {/* Selected Skills */}
          {selectedSkills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center px-3 py-1 bg-purple-600/20 text-purple-300 text-sm rounded-full border border-purple-500/30"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="ml-2 hover:text-purple-100 transition-colors"
              >
                ×
              </button>
            </span>
          ))}
          
          {/* Input */}
          {canAddMore && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setIsOpen(e.target.value.length > 0);
              }}
              onKeyDown={handleInputKeyDown}
              onFocus={() => setIsOpen(inputValue.length > 0)}
              placeholder={selectedSkills.length === 0 ? placeholder : ''}
              className="flex-1 min-w-0 bg-transparent text-white placeholder-gray-400 outline-none"
            />
          )}
        </div>
        
        {/* Max skills reached message */}
        {maxSkills && selectedSkills.length >= maxSkills && (
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Maximum {maxSkills} skills allowed
          </p>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && filteredSkills.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {filteredSkills.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => addSkill(skill)}
              className="w-full px-4 py-2 text-left text-white hover:bg-[var(--bg-card-hover)] transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              {skill}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}