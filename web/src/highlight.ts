import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-graphql';

export type HighlightLanguage = 'tsx' | 'typescript' | 'graphql' | 'json';

const LANGUAGE_MAP: Record<HighlightLanguage, keyof typeof Prism.languages> = {
  graphql: 'graphql',
  json: 'javascript',
  tsx: 'tsx',
  typescript: 'typescript',
};

export function highlightCode(code: string, language: HighlightLanguage): string {
  return Prism.highlight(code, Prism.languages[LANGUAGE_MAP[language]], language);
}
