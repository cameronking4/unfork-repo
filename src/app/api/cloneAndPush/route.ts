import { NextResponse } from 'next/server';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

async function cloneAndPush(owner: string, repoName: string, accessToken: string, newRepoUrl: string) {
  const sourceRepoUrl = `https://github.com/${owner}/${repoName}.git`;
  const cloneCmd = `git clone --mirror ${sourceRepoUrl}`;
  const changeDirCmd = `cd ${repoName}.git && `;
  const pushCmd = `${changeDirCmd}git push --mirror ${newRepoUrl}`;

  try {
    console.log(`Executing command: ${cloneCmd}`);
    await execPromise(cloneCmd);

    console.log(`Executing command: ${pushCmd}`);
    await execPromise(pushCmd);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error during clone and push:', error);
    if (axios.isAxiosError(error)) {
      return NextResponse.json({ success: false, message: JSON.stringify(error.message) });
    }
  }
}

export async function POST(req: Request) {
  try {
    const { owner, repoName, accessToken, newRepoUrl } = await req.json();
    console.log('Received request for clone and push:', { owner, repoName, newRepoUrl });
    return cloneAndPush(owner, repoName, accessToken, newRepoUrl);
  } catch (error) {
    console.log('[CLONE_AND_PUSH_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
