import { NextResponse } from 'next/server';
import axios from 'axios';

async function renameRepo(owner: string, oldRepoName: string, newRepoName: string, accessToken: string) {
  try {
    const response = await axios.patch(
      `https://api.github.com/repos/${owner}/${oldRepoName}`,
      { name: newRepoName },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

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
    const { owner, oldRepoName, newRepoName, accessToken } = await req.json();
    return renameRepo(owner, oldRepoName, newRepoName, accessToken);
  } catch (error) {
    console.log('[RENAME_REPO_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
