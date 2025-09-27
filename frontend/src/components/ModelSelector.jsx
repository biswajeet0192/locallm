// frontend/src/components/ModelSelector.jsx
import React, { useState } from 'react';
import { ChevronDown, RefreshCw, Cpu } from 'lucide-react';

const ModelSelector = ({ models, selectedModel, onModelSelect, onRefresh, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const handleSelect = (model) => {
    onModelSelect(model);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled || models.length === 0}
            className="relative w-64 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed text-gray-900 dark:text-gray-100"
          >
            <span className="flex items-center">
              <Cpu className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />
              <span className="block truncate">
                {selectedModel || (models.length === 0 ? 'No models available' : 'Select a model')}
              </span>
            </span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </span>
          </button>

          {/* Dropdown Menu */}
          {isOpen && !disabled && (
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 dark:ring-gray-600 overflow-auto focus:outline-none">
              {models.length === 0 ? (
                <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
                  No models found. Make sure Ollama is running and models are installed.
                </div>
              ) : (
                models.map((model) => (
                  <div
                    key={model}
                    onClick={() => handleSelect(model)}
                    className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 dark:hover:bg-gray-600 ${
                      model === selectedModel 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' 
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <span className="block truncate font-normal">{model}</span>
                    {model === selectedModel && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600 dark:text-blue-400">
                        ✓
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={disabled || refreshing}
          className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          title="Refresh models"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};

export default ModelSelector;