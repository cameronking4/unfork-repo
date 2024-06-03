import { NextResponse } from 'next/server';
import axios from 'axios';

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

export async function POST(req: Request) {
  try {
    const { accessToken, owner, repoName, isPrivate } = await req.json();
    return createRepo(accessToken, owner, repoName, isPrivate);
  } catch (error) {
    console.log('[CREATE_REPO_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
