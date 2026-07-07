"use client";

import CodeMirror, { type Extension } from "@uiw/react-codemirror";
import { java } from "@codemirror/lang-java";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { cpp } from "@codemirror/lang-cpp";
import { sql } from "@codemirror/lang-sql";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CODE_LANGUAGES, type CodeLanguageId } from "./code-editor-langs";

/**
 * Real code-editor experience (CodeMirror 6) for CODE-mode assignment
 * submissions: syntax highlighting, line numbers, bracket matching, and a
 * language selector. Deliberately NOT a <textarea>.
 */

function langExtension(id: CodeLanguageId): Extension[] {
  switch (id) {
    case "java":
      return [java()];
    case "python":
      return [python()];
    case "javascript":
      return [javascript({ typescript: true })];
    case "cpp":
      return [cpp()];
    case "sql":
      return [sql()];
    default:
      return [];
  }
}

export function CodeEditor({
  value,
  onChange,
  language,
  onLanguageChange,
  readOnly = false,
  minHeight = "260px",
}: {
  value: string;
  onChange?: (v: string) => void;
  language: CodeLanguageId;
  onLanguageChange?: (l: CodeLanguageId) => void;
  readOnly?: boolean;
  minHeight?: string;
}) {
  return (
    <div className="space-y-2">
      {onLanguageChange && (
        <div className="flex items-center gap-2">
          <Label className="text-xs">Language</Label>
          <Select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as CodeLanguageId)}
            className="h-8 w-52 text-xs"
          >
            {CODE_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div className="overflow-hidden rounded-lg border font-mono text-sm [&_.cm-editor]:outline-none">
        <CodeMirror
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          editable={!readOnly}
          extensions={langExtension(language)}
          minHeight={minHeight}
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            highlightActiveLine: !readOnly,
            autocompletion: false,
          }}
        />
      </div>
    </div>
  );
}
