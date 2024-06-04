import { NextResponse } from 'next/server';
import axios from 'axios';

async function createGitHubActionWorkflow(owner: string, repoName: string, accessToken: string) {
  const workflowContent = `
name: Unfork Repository

on:
  workflow_dispatch:
    inputs:
      owner:
        description: 'Owner of the original repository'
        required: true
      repoName:
        description: 'Name of the original repository'
        required: true
      newRepoName:
        description: 'Name of the new repository'
        required: true
      accessToken:
        description: 'GitHub Personal Access Token'
        required: true
        type: string

jobs:
  unfork:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout source repository
      uses: actions/checkout@v2
      with:
        repository: \${{ github.event.inputs.owner }}/\${{ github.event.inputs.repoName }}
        token: \${{ github.event.inputs.accessToken }}

    - name: Mirror-push to new repository
      run: |
        git remote add new-origin https://x-access-token:\${{ github.event.inputs.accessToken }}@github.com/\${{ github.event.inputs.owner }}/\${{ github.event.inputs.newRepoName }}.git
        git push new-origin --mirror
  `;

  const filePath = '.github/workflows/unfork-repo.yml';
  const fileContent = Buffer.from(workflowContent).toString('base64');

  try {
    await axios.put(
      `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}`,
      {
        message: 'Add unfork-repo workflow',
        content: fileContent,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    console.log('GitHub Action workflow file created successfully');
  } catch (error) {
    console.error('Error creating GitHub Action workflow file:', error);
    throw error;
  }
}

async function triggerUnforkAction(owner: string, repoName: string, accessToken: string, newRepoName: string) {
  try {
    const response = await axios.post(
      `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/unfork-repo.yml/dispatches`,
      {
        ref: 'main', // or the default branch
        inputs: {
          owner,
          repoName,
          newRepoName,
          accessToken,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Error triggering GitHub Action:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
        return { success: false, message: error.response.data.message || error.message };
      }
      return { success: false, message: error.message };
    } else {
      return { success: false, message: 'An unknown error occurred' };
    }
  }
}

async function deleteRepo(accessToken: string, owner: string, repoName: string) {
  try {
    await axios.delete(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return { success: true };
  } catch (error) {
    console.error('Error during repository deletion:', error);
    return { success: false, message: JSON.stringify(error) };
  }
}

async function renameRepo(accessToken: string, owner: string, oldRepoName: string, newRepoName: string) {
  try {
    await axios.patch(
      `https://api.github.com/repos/${owner}/${oldRepoName}`,
      { name: newRepoName },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return { success: true };
  } catch (error) {
    console.error('Error during repository rename:', error);
    return { success: false, message: JSON.stringify(error) };
  }
}

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

    return { success: true };
  } catch (error) {
    console.error('Error during copying repository settings:', error);
    return { success: false, message: JSON.stringify(error) };
  }
}

export async function POST(req: Request) {
  try {
    const { owner, repoName, accessToken, newRepoName } = await req.json();
    console.log('Received request for repository migration:', { owner, repoName, newRepoName });

    await createGitHubActionWorkflow(owner, repoName, accessToken);

    const triggerResponse = await triggerUnforkAction(owner, repoName, accessToken, newRepoName);
    if (!triggerResponse.success) {
      return NextResponse.json(triggerResponse);
    }

    await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait for the GitHub Action to complete

    const deleteResponse = await deleteRepo(accessToken, owner, repoName);
    if (!deleteResponse.success) {
      return NextResponse.json(deleteResponse);
    }

    const renameResponse = await renameRepo(accessToken, owner, newRepoName, repoName);
    if (!renameResponse.success) {
      return NextResponse.json(renameResponse);
    }

    const copySettingsResponse = await copyRepoSettings(accessToken, owner, repoName, repoName);
    if (!copySettingsResponse.success) {
      return NextResponse.json(copySettingsResponse);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log('[REPO_MIGRATION_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
