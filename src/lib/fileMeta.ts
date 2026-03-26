export type FileKind =
  | "package"
  | "typescript"
  | "javascript"
  | "json"
  | "markdown"
  | "styles"
  | "markup"
  | "python"
  | "rust"
  | "go"
  | "yaml"
  | "shell"
  | "config"
  | "image"
  | "database"
  | "text"
  | "git"
  | "file";

export interface FileMeta {
  kind: FileKind;
  language: string;
  accentClass: string;
}

type FileRule = {
  match: (fileName: string) => boolean;
  kind: FileKind;
  language?: string;
};

const LANGUAGE_BY_KIND: Record<FileKind, string> = {
  package: "json",
  typescript: "typescript",
  javascript: "javascript",
  json: "json",
  markdown: "markdown",
  styles: "css",
  markup: "html",
  python: "python",
  rust: "rust",
  go: "go",
  yaml: "yaml",
  shell: "shell",
  config: "plaintext",
  image: "plaintext",
  database: "sql",
  text: "plaintext",
  git: "plaintext",
  file: "plaintext",
};

const ACCENT_BY_KIND: Record<FileKind, string> = {
  package: "text-primary/80",
  typescript: "text-ide-info",
  javascript: "text-ide-warning",
  json: "text-primary/70",
  markdown: "text-foreground/60",
  styles: "text-accent/70",
  markup: "text-accent/60",
  python: "text-ide-success/90",
  rust: "text-ide-warning/90",
  go: "text-ide-info/90",
  yaml: "text-ide-success/80",
  shell: "text-ide-success",
  config: "text-ide-success/75",
  image: "text-primary/75",
  database: "text-ide-warning/80",
  text: "text-foreground/55",
  git: "text-accent/70",
  file: "text-muted-foreground",
};

const SPECIAL_RULES: FileRule[] = [
  {
    match: (fileName) =>
      fileName === "package.json" ||
      fileName === "package-lock.json",
    kind: "package",
  },
  {
    match: (fileName) => fileName === "pnpm-lock.yaml",
    kind: "package",
    language: "yaml",
  },
  {
    match: (fileName) =>
      fileName === "yarn.lock" ||
      fileName === "bun.lockb",
    kind: "package",
    language: "plaintext",
  },
  {
    match: (fileName) => fileName === "readme" || fileName === "readme.md",
    kind: "markdown",
  },
  {
    match: (fileName) => fileName.startsWith(".env"),
    kind: "config",
    language: "shell",
  },
  {
    match: (fileName) =>
      fileName === ".gitignore" ||
      fileName === ".gitattributes" ||
      fileName === ".gitmodules",
    kind: "git",
  },
  {
    match: (fileName) =>
      fileName === "dockerfile",
    kind: "config",
    language: "dockerfile",
  },
  {
    match: (fileName) =>
      fileName === "docker-compose.yml" ||
      fileName === "docker-compose.yaml" ||
      fileName === "compose.yml" ||
      fileName === "compose.yaml",
    kind: "config",
    language: "yaml",
  },
  {
    match: (fileName) =>
      fileName === "tsconfig.json" ||
      fileName === "jsconfig.json",
    kind: "config",
    language: "json",
  },
  {
    match: (fileName) =>
      /\.config\.(ts|tsx)$/.test(fileName) ||
      /\.conf\.(ts|tsx)$/.test(fileName),
    kind: "config",
    language: "typescript",
  },
  {
    match: (fileName) =>
      /\.config\.(js|jsx|mjs|cjs)$/.test(fileName) ||
      /\.conf\.(js|jsx|mjs|cjs)$/.test(fileName),
    kind: "config",
    language: "javascript",
  },
];

const EXTENSION_RULES: Record<string, { kind: FileKind; language?: string }> = {
  ts: { kind: "typescript" },
  tsx: { kind: "typescript" },
  mts: { kind: "typescript" },
  cts: { kind: "typescript" },
  js: { kind: "javascript" },
  jsx: { kind: "javascript" },
  mjs: { kind: "javascript" },
  cjs: { kind: "javascript" },
  json: { kind: "json" },
  jsonc: { kind: "json" },
  md: { kind: "markdown" },
  mdx: { kind: "markdown" },
  txt: { kind: "text" },
  log: { kind: "text" },
  css: { kind: "styles" },
  scss: { kind: "styles" },
  sass: { kind: "styles" },
  less: { kind: "styles" },
  pcss: { kind: "styles" },
  html: { kind: "markup" },
  htm: { kind: "markup" },
  xml: { kind: "markup", language: "xml" },
  py: { kind: "python" },
  rs: { kind: "rust" },
  go: { kind: "go" },
  yml: { kind: "yaml" },
  yaml: { kind: "yaml" },
  sh: { kind: "shell" },
  bash: { kind: "shell" },
  zsh: { kind: "shell" },
  fish: { kind: "shell" },
  sql: { kind: "database" },
  toml: { kind: "config" },
  ini: { kind: "config" },
  conf: { kind: "config" },
  env: { kind: "config", language: "shell" },
  png: { kind: "image" },
  jpg: { kind: "image" },
  jpeg: { kind: "image" },
  gif: { kind: "image" },
  webp: { kind: "image" },
  avif: { kind: "image" },
  ico: { kind: "image" },
  svg: { kind: "image", language: "xml" },
};

function getFileName(pathOrName: string): string {
  return pathOrName.replace(/\\/g, "/").split("/").pop()?.toLowerCase() ?? pathOrName.toLowerCase();
}

function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
    return "";
  }

  return fileName.slice(dotIndex + 1);
}

function inferKindFromLanguage(language?: string): FileKind | null {
  switch (language) {
    case "typescript":
      return "typescript";
    case "javascript":
      return "javascript";
    case "json":
      return "json";
    case "markdown":
      return "markdown";
    case "css":
      return "styles";
    case "html":
    case "xml":
      return "markup";
    case "python":
      return "python";
    case "rust":
      return "rust";
    case "go":
      return "go";
    case "yaml":
      return "yaml";
    case "shell":
      return "shell";
    case "dockerfile":
      return "config";
    case "sql":
      return "database";
    case "plaintext":
      return "text";
    default:
      return null;
  }
}

export function getFileMeta(pathOrName: string, explicitLanguage?: string): FileMeta {
  const fileName = getFileName(pathOrName);
  const normalizedLanguage = explicitLanguage?.toLowerCase();

  for (const rule of SPECIAL_RULES) {
    if (rule.match(fileName)) {
      const language = normalizedLanguage ?? rule.language ?? LANGUAGE_BY_KIND[rule.kind];
      return {
        kind: rule.kind,
        language,
        accentClass: ACCENT_BY_KIND[rule.kind],
      };
    }
  }

  const extension = getFileExtension(fileName);
  const extensionRule = extension ? EXTENSION_RULES[extension] : undefined;
  const kind = extensionRule?.kind ?? inferKindFromLanguage(normalizedLanguage) ?? "file";
  const language = normalizedLanguage ?? extensionRule?.language ?? LANGUAGE_BY_KIND[kind];

  return {
    kind,
    language,
    accentClass: ACCENT_BY_KIND[kind],
  };
}

export function getFileKind(pathOrName: string, explicitLanguage?: string): FileKind {
  return getFileMeta(pathOrName, explicitLanguage).kind;
}

export function detectFileLanguage(pathOrName: string, explicitLanguage?: string): string {
  return getFileMeta(pathOrName, explicitLanguage).language;
}

export function getFileAccentClass(pathOrName: string, explicitLanguage?: string): string {
  return getFileMeta(pathOrName, explicitLanguage).accentClass;
}
