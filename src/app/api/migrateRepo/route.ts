import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

async function createRepoWithUniqueName(owner: string, accessToken: string, baseRepoName: string) {
  let attempt = 0;
  let repoName = baseRepoName;

  while (true) {
    try {
      const createRepoResponse = await axios.post(
        'https://api.github.com/user/repos',
        {
          name: repoName,
          private: false,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Repository creation response:', createRepoResponse.data);
      return createRepoResponse.data.clone_url;

    } catch (error) {
      if (axios.isAxiosError(error) && error.response && error.response.status === 422) {
        console.log(`Repository name "${repoName}" already exists. Trying a different name...`);
        attempt += 1;
        repoName = `${baseRepoName}-${attempt}`;
      } else {
        throw error;
      }
    }
  }
}

async function createAndMigrateRepo(owner: string, repoName: string, accessToken: string, newRepoName: string) {
  try {
    console.log('Starting repository creation...');
    const newRepoUrl = await createRepoWithUniqueName(owner, accessToken, newRepoName);

    const tempRepoPath = path.join('/tmp', `temp-repo-${Date.now()}`);

    // Step 2: Clone the original repository
    const git = simpleGit();
    await git.clone(`https://github.com/${owner}/${repoName}.git`, tempRepoPath, ['--bare']);

    // Step 3: Set the remote to the new repository
    await git.cwd(tempRepoPath).removeRemote('origin');
    await git.cwd(tempRepoPath).addRemote('origin', newRepoUrl);

    // Step 4: Push all branches and tags to the new repository
    await git.cwd(tempRepoPath).push(['--mirror']);

    // Clean up
    fs.rmSync(tempRepoPath, { recursive: true, force: true });

    return NextResponse.json({ success: true, newRepoUrl });
  } catch (error) {
    console.error('Error during repository migration:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);

        // Return specific error details
        return NextResponse.json({ success: false, message: error.response.data.message || error.message });
      }
      return NextResponse.json({ success: false, message: error.message });
    } else {
      return NextResponse.json({ success: false, message: 'An unknown error occurred' });
    }
  }
}

export async function POST(req: Request) {
  try {
    const { owner, repoName, accessToken, newRepoName } = await req.json();
    console.log('Received request for repository migration:', { owner, repoName, newRepoName });
    return createAndMigrateRepo(owner, repoName, accessToken, newRepoName);
  } catch (error) {
    console.log('[CREATE_AND_MIGRATE_REPO_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
