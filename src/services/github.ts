import { Octokit } from "@octokit/rest";

export type GitHubRepo = {
  name: string;
  owner: string;
  fullName: string;
  cloneUrl: string;
  isPrivate: boolean;
  defaultBranch: string;
};

export function createGitHubClient(token: string): Octokit {
  return new Octokit({ auth: token });
}

export async function listAccessibleRepos(token: string): Promise<GitHubRepo[]> {
  const client = createGitHubClient(token);
  const repos = await client.paginate(client.rest.repos.listForAuthenticatedUser, {
    visibility: "all",
    affiliation: "owner,collaborator,organization_member",
    sort: "pushed",
    per_page: 100
  });

  return repos.map((repo) => ({
    name: repo.name,
    owner: repo.owner?.login ?? "unknown",
    fullName: repo.full_name,
    cloneUrl: repo.clone_url,
    isPrivate: repo.private,
    defaultBranch: repo.default_branch
  }));
}

export async function getRepo(token: string, owner: string, repo: string): Promise<GitHubRepo> {
  const client = createGitHubClient(token);
  const response = await client.rest.repos.get({ owner, repo });

  return {
    name: response.data.name,
    owner: response.data.owner?.login ?? owner,
    fullName: response.data.full_name,
    cloneUrl: response.data.clone_url,
    isPrivate: response.data.private,
    defaultBranch: response.data.default_branch
  };
}

export async function createPullRequest(params: {
  token: string;
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
}): Promise<string> {
  const client = createGitHubClient(params.token);
  const response = await client.rest.pulls.create({
    owner: params.owner,
    repo: params.repo,
    title: params.title,
    body: params.body,
    head: params.head,
    base: params.base
  });

  return response.data.html_url;
}
