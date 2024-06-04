import { NextResponse } from 'next/server';
import axios from 'axios';

async function deleteRepo(accessToken: string, owner: string, repoName: string) {
  try {
    await axios.delete(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error during repository deletion:', error);
    return NextResponse.json({ success: false, message: JSON.stringify(error) });
  }
}

export async function POST(req: Request) {
  try {
    const { accessToken, owner, repoName } = await req.json();
    return deleteRepo(accessToken, owner, repoName);
  } catch (error) {
    console.log('[DELETE_REPO_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
