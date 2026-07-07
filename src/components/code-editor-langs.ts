/** Languages offered in the code-submission editor. Server-safe (no CM imports). */
export const CODE_LANGUAGES = [
  { id: "java", label: "Java" },
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript / TypeScript" },
  { id: "cpp", label: "C / C++" },
  { id: "sql", label: "SQL" },
  { id: "plain", label: "Plain text" },
] as const;

export type CodeLanguageId = (typeof CODE_LANGUAGES)[number]["id"];

export function isCodeLanguage(v: string): v is CodeLanguageId {
  return CODE_LANGUAGES.some((l) => l.id === v);
}
