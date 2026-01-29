import path from "path";
import React from "react";
import { render } from "ink";
import { PrimerTui } from "../ui/tui";

type TuiOptions = {
  repo?: string;
};

export async function tuiCommand(options: TuiOptions): Promise<void> {
  const repoPath = path.resolve(options.repo ?? process.cwd());
  const { waitUntilExit } = render(<PrimerTui repoPath={repoPath} />);
  await waitUntilExit();
}
