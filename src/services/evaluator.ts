import fs from "fs/promises";
import path from "path";

type EvalCase = {
  prompt: string;
  expectation: string;
  id?: string;
};

type EvalConfig = {
  instructionFile?: string;
  cases: EvalCase[];
  systemMessage?: string;
};

type EvalRunOptions = {
  configPath: string;
  repoPath: string;
  model: string;
  judgeModel: string;
  outputPath?: string;
};

type EvalResult = {
  id: string;
  prompt: string;
  expectation: string;
  withInstructions?: string;
  withoutInstructions?: string;
  verdict?: "pass" | "fail" | "unknown";
  score?: number;
  rationale?: string;
};

export async function runEval(options: EvalRunOptions): Promise<{ summary: string }> {
  const config = await loadConfig(options.configPath);
  const instructionFile = config.instructionFile ?? ".github/copilot-instructions.md";
  const instructionPath = path.resolve(options.repoPath, instructionFile);
  const instructionText = await readOptionalFile(instructionPath);

  const sdk = await import("@github/copilot-sdk");
  const client = new sdk.CopilotClient();
  await client.start();

  try {
    const results: EvalResult[] = [];

    for (const [index, testCase] of config.cases.entries()) {
      const id = testCase.id ?? `case-${index + 1}`;
      const prompt = buildPrompt(options.repoPath, testCase.prompt);

      const withoutInstructions = await askOnce(client, {
        prompt,
        model: options.model,
        systemMessage: config.systemMessage
      });

      const withInstructions = await askOnce(client, {
        prompt,
        model: options.model,
        systemMessage: [config.systemMessage, instructionText].filter(Boolean).join("\n\n")
      });

      const judgment = await judge(client, {
        model: options.judgeModel,
        prompt: testCase.prompt,
        expectation: testCase.expectation,
        withoutInstructions,
        withInstructions
      });

      results.push({
        id,
        prompt: testCase.prompt,
        expectation: testCase.expectation,
        withInstructions,
        withoutInstructions,
        verdict: judgment.verdict,
        score: judgment.score,
        rationale: judgment.rationale
      });
    }

    if (options.outputPath) {
      const output = {
        repoPath: options.repoPath,
        model: options.model,
        judgeModel: options.judgeModel,
        results
      };
      await fs.writeFile(options.outputPath, JSON.stringify(output, null, 2), "utf8");
    }

    const summary = formatSummary(results);
    return { summary };
  } finally {
    await client.stop();
  }
}

type AskOptions = {
  prompt: string;
  model: string;
  systemMessage?: string;
};

async function askOnce(
  client: { createSession: (config?: Record<string, unknown>) => Promise<any> },
  options: AskOptions
): Promise<string> {
  const session = await client.createSession({
    model: options.model,
    systemMessage: options.systemMessage
      ? { content: options.systemMessage }
      : undefined
  });

  const response = await session.sendAndWait({ prompt: options.prompt });
  await session.destroy();
  return response?.data?.content?.trim() ?? "";
}

type JudgeOptions = {
  model: string;
  prompt: string;
  expectation: string;
  withoutInstructions: string;
  withInstructions: string;
};

type JudgeResult = {
  verdict: "pass" | "fail" | "unknown";
  score: number;
  rationale: string;
};

async function judge(
  client: { createSession: (config?: Record<string, unknown>) => Promise<any> },
  options: JudgeOptions
): Promise<JudgeResult> {
  const session = await client.createSession({
    model: options.model,
    systemMessage: {
      content: "You are a strict evaluator. Return JSON with keys: verdict (pass|fail|unknown), score (0-100), rationale. Do not include any other text."
    }
  });

  const prompt = [
    "Evaluate which response best matches the expectation.",
    "",
    `Expectation: ${options.expectation}`,
    "",
    "Response A (without custom instructions):",
    options.withoutInstructions,
    "",
    "Response B (with custom instructions):",
    options.withInstructions,
    "",
    "Return JSON only."
  ].join("\n");

  const response = await session.sendAndWait({ prompt });
  await session.destroy();

  const content = response?.data?.content ?? "";
  return parseJudge(content);
}

function parseJudge(content: string): JudgeResult {
  try {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON detected");
    const parsed = JSON.parse(match[0]) as JudgeResult;
    if (!parsed.verdict) throw new Error("Missing verdict");
    return {
      verdict: parsed.verdict,
      score: Number(parsed.score ?? 0),
      rationale: String(parsed.rationale ?? "")
    };
  } catch {
    return {
      verdict: "unknown",
      score: 0,
      rationale: content.trim()
    };
  }
}

async function loadConfig(configPath: string): Promise<EvalConfig> {
  const raw = await fs.readFile(configPath, "utf8");
  return JSON.parse(raw) as EvalConfig;
}

async function readOptionalFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function buildPrompt(repoPath: string, userPrompt: string): string {
  return [
    "You are working in this repository:",
    repoPath,
    "Use the file system tools when needed to inspect the codebase.",
    "",
    userPrompt
  ].join("\n");
}

function formatSummary(results: EvalResult[]): string {
  const total = results.length;
  const passed = results.filter((r) => r.verdict === "pass").length;
  const failed = results.filter((r) => r.verdict === "fail").length;
  const unknown = results.filter((r) => r.verdict === "unknown").length;

  const lines = [
    `Eval results: ${passed}/${total} pass, ${failed} fail, ${unknown} unknown.`
  ];

  for (const result of results) {
    lines.push(
      `- ${result.id}: ${result.verdict ?? "unknown"} (score: ${result.score ?? 0})`
    );
  }

  return `\n${lines.join("\n")}`;
}
