import { NextResponse } from 'next/server';
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
