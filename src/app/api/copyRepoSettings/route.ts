import { NextResponse } from 'next/server';
import axios from 'axios';

async function copyRepoSettings(accessToken: string, owner: string, oldRepoName: string, newRepoName: string) {
  try {
    // Get the settings of the original repository
    const repoSettingsResponse = await axios.get(`https://api.github.com/repos/${owner}/${oldRepoName}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const { description, homepage, private: isPrivate, topics } = repoSettingsResponse.data;

    // Update the new repository with the settings
    await axios.patch(
      `https://api.github.com/repos/${owner}/${newRepoName}`,
      { description, homepage, private: isPrivate, topics },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error during copying repository settings:', error);
    return NextResponse.json({ success: false, message: JSON.stringify(error) });
  }
}

export async function POST(req: Request) {
  try {
    const { accessToken, owner, oldRepoName, newRepoName } = await req.json();
    return copyRepoSettings(accessToken, owner, oldRepoName, newRepoName);
  } catch (error) {
    console.log('[COPY_REPO_SETTINGS_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
