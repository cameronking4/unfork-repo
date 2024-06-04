import { NextResponse } from 'next/server';
import axios from 'axios';

async function createAndMigrateRepo(owner: string, repoName: string, accessToken: string, newRepoName: string) {
  try {
    console.log('Starting repository creation...');
    // Step 1: Create new repository
    const createRepoResponse = await axios.post(
      'https://api.github.com/user/repos',
      {
        name: newRepoName,
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

    const newRepoUrl = createRepoResponse.data.clone_url;

    // Step 2: Use GitHub's Import API to migrate the repository
    console.log('Starting repository import...');
    const importRepoResponse = await axios.put(
      `https://api.github.com/repos/${owner}/${newRepoName}/import`,
      {
        vcs: 'git',
        vcs_url: `https://github.com/${owner}/${repoName}`,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('Repository import response:', importRepoResponse.data);

    // Check the import status
    const statusCheckUrl = `https://api.github.com/repos/${owner}/${newRepoName}/import`;
    let importStatus;
    do {
      const statusResponse = await axios.get(statusCheckUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      importStatus = statusResponse.data.status;
      console.log('Import status:', importStatus);
      if (importStatus === 'complete') break;
      if (importStatus === 'error') {
        throw new Error('Repository import failed');
      }
      // Wait for a few seconds before checking the status again
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } while (importStatus !== 'complete');

    return NextResponse.json({ success: true, newRepoUrl });
  } catch (error) {
    console.error('Error during repository migration:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
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
