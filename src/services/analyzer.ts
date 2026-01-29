import fs from "fs/promises";
import path from "path";
import { isGitRepo } from "./git";

export type RepoAnalysis = {
  path: string;
  isGitRepo: boolean;
  languages: string[];
  frameworks: string[];
  packageManager?: string;
};

const PACKAGE_MANAGERS: Array<{ file: string; name: string }> = [
  { file: "pnpm-lock.yaml", name: "pnpm" },
  { file: "yarn.lock", name: "yarn" },
  { file: "package-lock.json", name: "npm" },
  { file: "bun.lockb", name: "bun" }
];

export async function analyzeRepo(repoPath: string): Promise<RepoAnalysis> {
  const files = await safeReadDir(repoPath);
  const analysis: RepoAnalysis = {
    path: repoPath,
    isGitRepo: await isGitRepo(repoPath),
    languages: [],
    frameworks: []
  };

  const hasPackageJson = files.includes("package.json");
  const hasTsConfig = files.includes("tsconfig.json");
  const hasPyProject = files.includes("pyproject.toml");
  const hasRequirements = files.includes("requirements.txt");
  const hasGoMod = files.includes("go.mod");
  const hasCargo = files.includes("Cargo.toml");

  if (hasPackageJson) analysis.languages.push("JavaScript");
  if (hasTsConfig) analysis.languages.push("TypeScript");
  if (hasPyProject || hasRequirements) analysis.languages.push("Python");
  if (hasGoMod) analysis.languages.push("Go");
  if (hasCargo) analysis.languages.push("Rust");

  analysis.packageManager = await detectPackageManager(repoPath, files);

  if (hasPackageJson) {
    const packageJson = await readJson(path.join(repoPath, "package.json"));
    const deps = Object.keys({
      ...(packageJson?.dependencies ?? {}),
      ...(packageJson?.devDependencies ?? {})
    });
    analysis.frameworks.push(...detectFrameworks(deps, files));
  }

  analysis.languages = unique(analysis.languages);
  analysis.frameworks = unique(analysis.frameworks);

  return analysis;
}

async function detectPackageManager(repoPath: string, files: string[]): Promise<string | undefined> {
  for (const manager of PACKAGE_MANAGERS) {
    if (files.includes(manager.file)) return manager.name;
  }

  if (files.includes("package.json")) return "npm";
  if (files.includes("pyproject.toml")) return "pip";
  return undefined;
}

function detectFrameworks(deps: string[], files: string[]): string[] {
  const frameworks: string[] = [];
  const hasFile = (file: string): boolean => files.includes(file);

  if (deps.includes("next") || hasFile("next.config.js") || hasFile("next.config.mjs")) frameworks.push("Next.js");
  if (deps.includes("react") || deps.includes("react-dom")) frameworks.push("React");
  if (deps.includes("vue") || hasFile("vue.config.js")) frameworks.push("Vue");
  if (deps.includes("@angular/core") || hasFile("angular.json")) frameworks.push("Angular");
  if (deps.includes("svelte") || hasFile("svelte.config.js")) frameworks.push("Svelte");
  if (deps.includes("express")) frameworks.push("Express");
  if (deps.includes("@nestjs/core")) frameworks.push("NestJS");
  if (deps.includes("fastify")) frameworks.push("Fastify");

  return frameworks;
}

async function safeReadDir(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath);
  } catch {
    return [];
  }
}

async function readJson(filePath: string): Promise<Record<string, unknown> | undefined> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
