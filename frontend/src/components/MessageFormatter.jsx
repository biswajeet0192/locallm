// frontend/src/components/MessageFormatter.jsx
import React from 'react';

const MessageFormatter = ({ content }) => {
  // Remove <think> tags and their content
  const removeThinkTags = (text) => {
    return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  };

  // Parse and format the content
  const formatContent = (text) => {
    text = removeThinkTags(text);
    
    // Split by code blocks first
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }
      
      // Add code block
      parts.push({
        type: 'code',
        language: match[1] || 'text',
        content: match[2].trim()
      });
      
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }

    return parts;
  };

  // Format text with inline code, bold, tables, etc.
  const formatTextContent = (text) => {
    // Handle tables
    const lines = text.split('\n');
    const elements = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      
      // Check if this is a table
      if (line.includes('|') && i < lines.length - 1 && lines[i + 1].includes('|')) {
        const tableLines = [];
        let j = i;
        
        // Collect all table lines
        while (j < lines.length && lines[j].includes('|')) {
          tableLines.push(lines[j]);
          j++;
        }
        
        // Check if it's a valid table (has at least header and separator)
        if (tableLines.length >= 2) {
          elements.push(
            <div key={i} className="my-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600 border border-gray-300 dark:border-gray-600">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {tableLines[0].split('|').filter(cell => cell.trim()).map((header, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600 last:border-r-0"
                      >
                        {header.trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {tableLines.slice(2).map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      {row.split('|').filter(cell => cell.trim()).map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                        >
                          {formatInlineText(cell.trim())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          i = j;
          continue;
        }
      }
      
      // Regular line
      if (line.trim()) {
        elements.push(
          <p key={i} className="mb-2 last:mb-0">
            {formatInlineText(line)}
          </p>
        );
      }
      i++;
    }

    return elements.length > 0 ? elements : <p>{formatInlineText(text)}</p>;
  };

  // Format inline elements (bold, code, etc.)
  const formatInlineText = (text) => {
    const parts = [];
    let remaining = text;
    let key = 0;

    const patterns = [
      { regex: /`([^`]+)`/g, type: 'code' },
      { regex: /\*\*([^*]+)\*\*/g, type: 'bold' },
      { regex: /\*([^*]+)\*/g, type: 'italic' }
    ];

    for (const pattern of patterns) {
      const newParts = [];
      
      for (const part of (parts.length ? parts : [{ type: 'text', content: remaining }])) {
        if (part.type === 'text') {
          const matches = [];
          let match;
          let lastIndex = 0;
          
          while ((match = pattern.regex.exec(part.content)) !== null) {
            if (match.index > lastIndex) {
              newParts.push({
                type: 'text',
                content: part.content.slice(lastIndex, match.index)
              });
            }
            newParts.push({
              type: pattern.type,
              content: match[1]
            });
            lastIndex = match.index + match[0].length;
          }
          
          if (lastIndex < part.content.length) {
            newParts.push({
              type: 'text',
              content: part.content.slice(lastIndex)
            });
          }
        } else {
          newParts.push(part);
        }
      }
      
      parts.splice(0, parts.length, ...newParts);
    }

    return (parts.length ? parts : [{ type: 'text', content: remaining }]).map((part, idx) => {
      switch (part.type) {
        case 'code':
          return (
            <code
              key={idx}
              className="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded text-sm font-mono"
            >
              {part.content}
            </code>
          );
        case 'bold':
          return <strong key={idx}>{part.content}</strong>;
        case 'italic':
          return <em key={idx}>{part.content}</em>;
        default:
          return part.content;
      }
    });
  };

  const parts = formatContent(content);

  return (
    <div className="message-content">
      {parts.map((part, idx) => {
        if (part.type === 'code') {
          return (
            <div key={idx} className="my-3">
              <div className="bg-gray-800 dark:bg-gray-900 rounded-t-lg px-4 py-2 flex items-center justify-between">
                <span className="text-gray-300 text-xs font-medium">{part.language}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(part.content)}
                  className="text-gray-400 hover:text-gray-200 text-xs"
                >
                  Copy
                </button>
              </div>
              <pre className="bg-gray-900 dark:bg-black rounded-b-lg p-4 overflow-x-auto">
                <code className="text-gray-100 text-sm font-mono block whitespace-pre">
                  {part.content}
                </code>
              </pre>
            </div>
          );
        } else {
          return (
            <div key={idx}>
              {formatTextContent(part.content)}
            </div>
          );
        }
      })}
    </div>
  );
};

export default MessageFormatter;