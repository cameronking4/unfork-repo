// pages/api/route.ts

import { NextResponse } from 'next/server';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import url from 'url';
const execPromise = promisify(exec);

async function fetchDirectoryContents(owner: string, repoName: string, path: string, token: string) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${path}`;
  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `token ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${apiUrl}: ${response.statusText}`);
  }

  let contents = await response.json();

  // Sort contents: directories first, then files
  contents.sort((a: any, b: any) => {
    if (a.type === 'dir' && b.type !== 'dir') {
      return -1; // a is a directory, b is a file, a comes first
    } else if (a.type !== 'dir' && b.type === 'dir') {
      return 1; // a is a file, b is a directory, b comes first
    } else {
      return a.name.localeCompare(b.name); // Both are files or directories, sort alphabetically
    }
  });

  for (let i = 0; contents && i < contents.length; i++) {
    const item = contents[i];
    if (item.type === 'dir') {
      // Recursively fetch contents for directories
      const subContents = await fetchDirectoryContents(owner, repoName, item.path, token);
      item.contents = subContents; // Attach the contents to the directory item
    }
  }

  return contents;
}

async function createRepo(accessToken: string, owner: string, repoName: string, isPrivate: boolean) {
  try {
    const response = await axios.post(
      'https://api.github.com/user/repos',
      {
        name: repoName,
        private: isPrivate,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return NextResponse.json({ success: true, repoUrl: response.data.clone_url });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return NextResponse.json({ success: false, message: error.message });
    } else {
      return NextResponse.json({ success: false, message: 'An unknown error occurred' });
    }
  }
}

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
    const urlParts = new URL(req.url);
    const pathname = urlParts.pathname || '';

    if (pathname.endsWith('/createRepo')) {
      const { accessToken, owner, repoName, isPrivate } = await req.json();
      return createRepo(accessToken, owner, repoName, isPrivate);
    } else if (pathname.endsWith('/cloneAndPush')) {
      const { owner, repoName, accessToken, newRepoUrl } = await req.json();
      return cloneAndPush(owner, repoName, accessToken, newRepoUrl);
    } else if (pathname.endsWith('/fetchDirectoryContents')) {
      const { owner, repoName, token } = await req.json();
      const data = await fetchDirectoryContents(owner, repoName, '', token);
      return NextResponse.json(data || null);
    } else {
      return new NextResponse('Not Found', { status: 404 });
    }
  } catch (error) {
    console.log('[PROJECT_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
