import fs from "fs/promises";
import path from "path";
import simpleGit from "simple-git";

export async function isGitRepo(repoPath: string): Promise<boolean> {
  try {
    await fs.access(path.join(repoPath, ".git"));
    return true;
  } catch {
    return false;
  }
}

export async function getRepoRoot(repoPath: string): Promise<string> {
  const git = simpleGit(repoPath);
  const root = await git.revparse(["--show-toplevel"]);
  return root.trim();
}

export async function cloneRepo(repoUrl: string, destination: string): Promise<void> {
  const git = simpleGit();
  await git.clone(repoUrl, destination);
}

export async function checkoutBranch(repoPath: string, branch: string): Promise<void> {
  const git = simpleGit(repoPath);
  const branches = await git.branchLocal();
  if (!branches.all.includes(branch)) {
    await git.checkoutLocalBranch(branch);
    return;
  }
  await git.checkout(branch);
}

export async function commitAll(repoPath: string, message: string): Promise<void> {
  const git = simpleGit(repoPath);
  await git.add(["-A"]);
  const status = await git.status();
  if (status.files.length === 0) return;
  await git.commit(message);
}

export async function pushBranch(repoPath: string, branch: string): Promise<void> {
  const git = simpleGit(repoPath);
  await git.push(["-u", "origin", branch]);
}
