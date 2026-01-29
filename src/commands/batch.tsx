import React from "react";
import { render } from "ink";
import { BatchTui } from "../ui/BatchTui";
import { getGitHubToken } from "../services/github";

type BatchOptions = {
  output?: string;
};

export async function batchCommand(options: BatchOptions): Promise<void> {
  const token = await getGitHubToken();
  
  if (!token) {
    console.error("Error: GitHub authentication required.");
    console.error("");
    console.error("Option 1 (recommended): Install and authenticate GitHub CLI");
    console.error("  brew install gh && gh auth login");
    console.error("");
    console.error("Option 2: Set a token environment variable");
    console.error("  export GITHUB_TOKEN=<your-token>");
    process.exitCode = 1;
    return;
  }

  const { waitUntilExit } = render(
    <BatchTui token={token} outputPath={options.output} />
  );


  await waitUntilExit();
}
