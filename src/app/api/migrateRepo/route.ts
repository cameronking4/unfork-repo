import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

async function cloneAndPush(owner: string, repoName: string, accessToken: string, newRepoUrl: string) {
  const sourceRepoUrl = `https://github.com/${owner}/${repoName}.git`;
  const tempDir = `./${repoName}`;

  try {
    await execPromise(`git clone ${sourceRepoUrl} ${tempDir}`);
    await execPromise(`cd ${tempDir} && git remote set-url origin ${newRepoUrl} && git push --all && git push --tags`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error during clone and push:', error);
    return NextResponse.json({ success: false, message: JSON.stringify(error) });
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
