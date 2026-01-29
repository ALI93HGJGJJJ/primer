import path from "path";
import { runEval } from "../services/evaluator";

type EvalOptions = {
  repo?: string;
  model?: string;
  judgeModel?: string;
  output?: string;
};

export async function evalCommand(configPathArg: string | undefined, options: EvalOptions): Promise<void> {
  const configPath = path.resolve(configPathArg ?? "primer.eval.json");
  const repoPath = path.resolve(options.repo ?? process.cwd());

  const results = await runEval({
    configPath,
    repoPath,
    model: options.model ?? "gpt-5",
    judgeModel: options.judgeModel ?? "gpt-5",
    outputPath: options.output
  });

  console.log(results.summary);
}
