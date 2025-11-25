'use client';

import { useEffect, useState } from 'react';

type PreviousVisualization = {
  topic: string;
  communities: string[];
  totalNodes: number;
};

type GenerationInputProps = {
  onGenerate: (topic: string, mode: 'hybrid' | 'ancestry' | 'custom') => Promise<void>;
  onSelectPrevious: (topic: string) => void;
  isGenerating: boolean;
  currentTopic: string | null;
};

const EXAMPLE_TOPICS = [
  'Ancient Rome',
  'Byzantine Empire',
  'Jazz Evolution',
  'Coffee Culture',
  'Quantum Computing',
  'Renaissance Art',
  'Silk Road Trade',
  'Modern Architecture',
];

export function GenerationInput({ onGenerate, onSelectPrevious, isGenerating, currentTopic }: GenerationInputProps) {
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState<'hybrid' | 'ancestry' | 'custom'>('hybrid');
  const [error, setError] = useState<string | null>(null);
  const [previousVisualizations, setPreviousVisualizations] = useState<PreviousVisualization[]>([]);
  const [showPrevious, setShowPrevious] = useState(false);

  // Fetch previously generated visualizations
  useEffect(() => {
    const fetchPrevious = async () => {
      try {
        const response = await fetch('/api/generate?generated=true');
        if (response.ok) {
          const data = await response.json();
          setPreviousVisualizations(data.visualizations || []);
        }
      } catch (err) {
        console.error('Failed to fetch previous visualizations:', err);
      }
    };
    
    fetchPrevious();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    if (topic.trim().length < 3) {
      setError('Topic must be at least 3 characters');
      return;
    }

    try {
      await onGenerate(topic.trim(), mode);
      setTopic(''); // Clear input on success
      
      // Refresh previous visualizations list
      const response = await fetch('/api/generate?generated=true');
      if (response.ok) {
        const data = await response.json();
        setPreviousVisualizations(data.visualizations || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate visualization');
    }
  };

  const handleSelectPrevious = (selectedTopic: string) => {
    onSelectPrevious(selectedTopic);
    setShowPrevious(false);
  };

  const handleExampleClick = (example: string) => {
    setTopic(example);
    setError(null);
  };

  return (
    <div className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-6 shadow-2xl backdrop-blur">
      {/* Previously Generated Section */}
      {previousVisualizations.length > 0 && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowPrevious(!showPrevious)}
            className="flex w-full items-center justify-between rounded-lg bg-slate-800/60 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
          >
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Previously Generated ({previousVisualizations.length})
            </span>
            <svg 
              className={`h-4 w-4 transition-transform ${showPrevious ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showPrevious && (
            <div className="mt-2 max-h-60 space-y-2 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800/40 p-3">
              {previousVisualizations.map((viz) => (
                <button
                  key={viz.topic}
                  type="button"
                  onClick={() => handleSelectPrevious(viz.topic)}
                  disabled={isGenerating}
                  className={`w-full rounded-md px-3 py-2.5 text-left text-sm transition-all ${
                    currentTopic === viz.topic
                      ? 'bg-purple-500/20 border border-purple-500/50 text-purple-200'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <div className="font-medium">{viz.topic}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {viz.totalNodes} concepts • {viz.communities.length} communities
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Topic Input */}
        <div>
          <label htmlFor="topic" className="mb-2 block text-sm font-medium text-slate-200">
            Topic
          </label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Ancient Greece, Jazz History, Programming Paradigms..."
            disabled={isGenerating}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Mode Selection */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Generation Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setMode('hybrid')}
              disabled={isGenerating}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                mode === 'hybrid'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Hybrid
            </button>
            <button
              type="button"
              onClick={() => setMode('ancestry')}
              disabled={isGenerating}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                mode === 'ancestry'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Ancestry
            </button>
            <button
              type="button"
              onClick={() => setMode('custom')}
              disabled={isGenerating}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                mode === 'custom'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Custom
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {mode === 'hybrid' && 'Automatically choose between ancestry model and custom categories'}
            {mode === 'ancestry' && 'Force use of ancestry model (WHG, EEF, Steppe, CHG, EHG)'}
            {mode === 'custom' && 'Create custom categories specific to the topic'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isGenerating || !topic.trim()}
          className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-5 w-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating visualization...
            </span>
          ) : (
            'Generate Visualization'
          )}
        </button>

        {/* Example Topics */}
        <div>
          <p className="mb-2 text-xs font-medium text-slate-400">Try these examples:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_TOPICS.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => handleExampleClick(example)}
                disabled={isGenerating}
                className="rounded-md bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Generation Progress Info */}
        {isGenerating && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3">
            <p className="mb-2 text-sm font-medium text-blue-400">Generating your visualization...</p>
            <div className="space-y-1 text-xs text-blue-300/80">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                <span>Analyzing topic with GPT-4</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400 animation-delay-200" />
                <span>Generating communities and traits</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400 animation-delay-400" />
                <span>Creating semantic embeddings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400 animation-delay-600" />
                <span>Saving to database</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-blue-400/60">This usually takes 10-15 seconds</p>
          </div>
        )}
      </form>
    </div>
  );
}

