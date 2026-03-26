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

const configureLessonEditorTheme = (monaco: any) => {
  monaco.editor.defineTheme('lesson-code-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5f718c', fontStyle: 'italic' },
      { token: 'keyword', foreground: '7dd3fc' },
      { token: 'string', foreground: '86efac' },
      { token: 'number', foreground: 'f9a8d4' },
      { token: 'delimiter', foreground: 'cbd5e1' },
    ],
    colors: {
      'editor.background': '#081321',
      'editor.foreground': '#E2E8F0',
      'editorLineNumber.foreground': '#4B5C77',
      'editorLineNumber.activeForeground': '#9FB3D1',
      'editorCursor.foreground': '#7DD3FC',
      'editor.selectionBackground': '#16304E',
      'editor.inactiveSelectionBackground': '#12243A',
      'editor.lineHighlightBackground': '#0D1B2D',
      'editorIndentGuide.background1': '#14263C',
      'editorIndentGuide.activeBackground1': '#26496E',
      'editorWhitespace.foreground': '#20324A',
      'editorBracketMatch.background': '#11253E',
      'editorBracketMatch.border': '#4DA6D1',
      'editorGutter.background': '#081321',
    },
  });
};

export default function CodeTypingEditor({
  language,
  value,
  onChange,
  height = '280px',
}: CodeTypingEditorProps) {
  return (
    <div className="lesson-code-surface overflow-hidden">
      <Editor
        height={height}
        language={toMonacoLanguage(language)}
        value={value}
        onChange={(nextValue) => onChange(nextValue || '')}
        beforeMount={configureLessonEditorTheme}
        theme="lesson-code-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 15,
          fontFamily: 'JetBrains Mono, Fira Code, monospace',
          lineHeight: 24,
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
          padding: { top: 16, bottom: 18 },
        }}
      />
    </div>
  );
}
