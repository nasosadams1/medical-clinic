import Editor from "@monaco-editor/react";

type PythonEditorProps = {
  code: string;
  setCode: (value: string) => void;
};

export default function PythonEditor({ code, setCode }: PythonEditorProps) {
  return (
    <Editor
      height="400px"
      defaultLanguage="python"
      theme="vs-dark"
      value={code}
      onChange={(value) => setCode(value || "")}
    />
  );
}