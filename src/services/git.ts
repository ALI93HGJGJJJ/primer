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

export async function pushBranch(repoPath: string, branch: string, token?: string): Promise<void> {
  const git = simpleGit(repoPath);
  
  if (token) {
    // Set up credentials for this push
    const remoteUrl = (await git.remote(["get-url", "origin"])) ?? "";
    const trimmedUrl = remoteUrl.trim();
    if (trimmedUrl.startsWith("https://")) {
      const authedUrl = trimmedUrl.replace("https://", `https://x-access-token:${token}@`);
      await git.remote(["set-url", "origin", authedUrl]);
      try {
        await git.push(["-u", "origin", branch]);
      } finally {
        // Restore original URL to avoid leaking token
        await git.remote(["set-url", "origin", trimmedUrl]);
      }
      return;
    }
  }
  
  await git.push(["-u", "origin", branch]);
}
