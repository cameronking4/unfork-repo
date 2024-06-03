import { NextResponse } from 'next/server';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

async function cloneAndPush(owner: string, repoName: string, accessToken: string, newRepoUrl: string) {
  const sourceRepoUrl = `https://github.com/${owner}/${repoName}.git`;
  const cloneCmd = `git clone https://${accessToken}@github.com/${owner}/${repoName}.git repo`;
  const changeDirCmd = `cd repo && `;
  const removeRemoteCmd = `${changeDirCmd}git remote remove origin`;
  const addRemoteCmd = `${changeDirCmd}git remote add origin ${newRepoUrl}`;
  const pushCmd = `${changeDirCmd}git push origin master`;

  try {
    await execPromise(cloneCmd);
    await execPromise(removeRemoteCmd);
    await execPromise(addRemoteCmd);
    await execPromise(pushCmd);

    // Optional: Delete the original repo on GitHub
    await axios.delete(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return NextResponse.json({ success: false, message: error.message });
    } else {
      return NextResponse.json({ success: false, message: 'An unknown error occurred' });
    }
  }
}

export async function POST(req: Request) {
  try {
    const { owner, repoName, accessToken, newRepoUrl } = await req.json();
    return cloneAndPush(owner, repoName, accessToken, newRepoUrl);
  } catch (error) {
    console.log('[CLONE_AND_PUSH_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
