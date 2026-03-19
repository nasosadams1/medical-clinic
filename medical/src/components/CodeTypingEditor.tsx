import React from 'react';
import Editor from '@monaco-editor/react';
import type { LanguageSlug } from '../data/siteContent';

interface CodeTypingEditorProps {
  language: LanguageSlug;
  value: string;
  onChange: (value: string) => void;
  height?: string;
}

const toMonacoLanguage = (language: LanguageSlug) => {
  if (language === 'cpp') return 'cpp';
  return language;
};

export default function CodeTypingEditor({
  language,
  value,
  onChange,
  height = '280px',
}: CodeTypingEditorProps) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/90">
      <Editor
        height={height}
        language={toMonacoLanguage(language)}
        value={value}
        onChange={(nextValue) => onChange(nextValue || '')}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'JetBrains Mono, Fira Code, monospace',
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'off',
          bracketPairColorization: { enabled: true },
          guides: { indentation: true },
          smoothScrolling: true,
          renderWhitespace: 'selection',
          fixedOverflowWidgets: true,
          tabSize: language === 'python' ? 4 : 2,
          padding: { top: 14, bottom: 14 },
        }}
      />
    </div>
  );
}
