'use client';

import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';

interface SearchFilterProps {
  onSearch: (query: string, selectedSkills: string[], sortBy: string) => void;
  placeholder?: string;
  showSkillFilter?: boolean;
  showSortOptions?: boolean;
  sortOptions?: { value: string; label: string }[];
  initialQuery?: string;
  initialSkills?: string[];
  initialSort?: string;
  className?: string;
}

const defaultSortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'rating', label: 'Highest Rating' },
  { value: 'score', label: 'Highest Score' }
];

export default function SearchFilter({
  onSearch,
  placeholder = 'Search...',
  showSkillFilter = true,
  showSortOptions = true,
  sortOptions = defaultSortOptions,
  initialQuery = '',
  initialSkills = [],
  initialSort = 'newest',
  className = ''
}: SearchFilterProps) {
  const { skills: allSkills } = useData();
  const [query, setQuery] = useState(initialQuery);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(initialSkills);
  const [sortBy, setSortBy] = useState(initialSort);
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);

  // Trigger search when any filter changes
  useEffect(() => {
    onSearch(query, selectedSkills, sortBy);
  }, [query, selectedSkills, sortBy, onSearch]);

  const handleSkillToggle = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(prev => prev.filter(s => s !== skill));
    } else {
      setSelectedSkills(prev => [...prev, skill]);
    }
  };

  const clearFilters = () => {
    setQuery('');
    setSelectedSkills([]);
    setSortBy('newest');
  };

  const hasActiveFilters = query || selectedSkills.length > 0 || sortBy !== 'newest';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Sort Row */}
      <div className="flex gap-4 flex-wrap">
        {/* Search Input */}
        <div className="flex-1 min-w-[300px]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Sort Dropdown */}
        {showSortOptions && (
          <div className="min-w-[180px]">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-slate-800">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Skills Filter */}
      {showSkillFilter && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowSkillDropdown(!showSkillDropdown)}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <span>Skills Filter</span>
              <svg
                className={`w-4 h-4 transition-transform ${showSkillDropdown ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Selected Skills */}
          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedSkills.map(skill => (
                <span
                  key={skill}
                  className="inline-flex items-center px-3 py-1 bg-purple-600/20 text-purple-300 text-sm rounded-full border border-purple-500/30"
                >
                  {skill}
                  <button
                    onClick={() => handleSkillToggle(skill)}
                    className="ml-2 hover:text-purple-100 transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Skills Dropdown */}
          {showSkillDropdown && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-4 bg-slate-800/50 border border-slate-700 rounded-lg max-h-60 overflow-y-auto">
              {allSkills.map(skill => (
                <label
                  key={skill}
                  className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/30 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedSkills.includes(skill)}
                    onChange={() => handleSkillToggle(skill)}
                    className="w-4 h-4 text-purple-600 bg-slate-800 border-slate-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-300">{skill}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active Filter Summary */}
      {hasActiveFilters && (
        <div className="text-sm text-gray-400">
          {query && <span>Search: "{query}" </span>}
          {selectedSkills.length > 0 && (
            <span>• {selectedSkills.length} skill{selectedSkills.length !== 1 ? 's' : ''} selected </span>
          )}
          {sortBy !== 'newest' && <span>• Sorted by {sortOptions.find(o => o.value === sortBy)?.label}</span>}
        </div>
      )}
    </div>
  );
}