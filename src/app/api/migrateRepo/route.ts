import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs';

async function createRepoWithUniqueName(owner: string, accessToken: string, baseRepoName: string) {
  let attempt = 0;
  let repoName = baseRepoName;

  const octokit = new Octokit({ auth: accessToken });

  while (true) {
    try {
      const createRepoResponse = await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        private: false,
      });

      console.log('Repository creation response:', createRepoResponse.data);
      return createRepoResponse.data.clone_url;
    } catch (error) {
      if (error.status === 422) {
        console.log(`Repository name "${repoName}" already exists. Trying a different name...`);
        attempt += 1;
        repoName = `${baseRepoName}-${attempt}`;
      } else {
        throw error;
      }
    }
  }
}

async function createAndPushReadme(owner: string, accessToken: string, newRepoName: string) {
  const octokit = new Octokit({ auth: accessToken });
  const tempRepoPath = path.join('/tmp', `temp-repo-${Date.now()}`);

  try {
    console.log('Starting repository creation...');
    const newRepoUrl = await createRepoWithUniqueName(owner, accessToken, newRepoName);

    // Initialize a new Git repository and create a README file
    console.log('Initializing new repository and creating README...');
    const git = simpleGit();
    fs.mkdirSync(tempRepoPath);
    fs.writeFileSync(path.join(tempRepoPath, 'README.md'), '# New Repository\n\nThis is a newly created repository.');

    await git.cwd(tempRepoPath).init();
    await git.cwd(tempRepoPath).add('./*');
    await git.cwd(tempRepoPath).commit('Initial commit with README');
    await git.cwd(tempRepoPath).addRemote('origin', newRepoUrl);
    await git.cwd(tempRepoPath).push('origin', 'main', ['--set-upstream']);

    // Clean up
    fs.rmSync(tempRepoPath, { recursive: true, force: true });

    return NextResponse.json({ success: true, newRepoUrl });
  } catch (error) {
    console.error('Error during repository creation and push:', error);

    // Clean up in case of error
    if (fs.existsSync(tempRepoPath)) {
      fs.rmSync(tempRepoPath, { recursive: true, force: true });
    }

    return NextResponse.json({ success: false, message: error.message });
  }
}

export async function POST(req: Request) {
  try {
    const { owner, accessToken, newRepoName } = await req.json();
    console.log('Received request for repository creation:', { owner, newRepoName });
    return await createAndPushReadme(owner, accessToken, newRepoName);
  } catch (error) {
    console.log('[CREATE_AND_PUSH_README_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
