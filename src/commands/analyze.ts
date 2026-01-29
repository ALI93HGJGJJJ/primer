import path from "path";
import { analyzeRepo } from "../services/analyzer";

type AnalyzeOptions = {
  json?: boolean;
};

export async function analyzeCommand(repoPathArg: string | undefined, options: AnalyzeOptions): Promise<void> {
  const repoPath = path.resolve(repoPathArg ?? process.cwd());
  const analysis = await analyzeRepo(repoPath);

  if (options.json) {
    console.log(JSON.stringify(analysis, null, 2));
    return;
  }

  console.log("Repository analysis:");
  console.log(`- Path: ${analysis.path}`);
  console.log(`- Git: ${analysis.isGitRepo ? "yes" : "no"}`);
  console.log(`- Languages: ${analysis.languages.join(", ") || "unknown"}`);
  console.log(`- Frameworks: ${analysis.frameworks.join(", ") || "none"}`);
  console.log(`- Package manager: ${analysis.packageManager ?? "unknown"}`);
}
