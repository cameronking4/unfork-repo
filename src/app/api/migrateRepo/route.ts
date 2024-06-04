import { NextResponse } from 'next/server';
import { GithubProvider } from 'github-repository-provider';
import { getSession } from 'next-auth/react';

async function createRepo(provider: { createRepository: (arg0: any, arg1: { owner: any; private: boolean; }) => any; }, owner: any, repoName: any) {
  try {
    const repo = await provider.createRepository(repoName, {
      owner,
      private: true, // Change to false if you want the new repo to be public
    });
    return { success: true, data: repo };
  } catch (error) {
    console.error('Error creating new repository:', error);
    return { success: false, message: error };
  }
}

async function copyRepoContents(provider: any, oldRepo: any[], newRepo: { writeEntry: (arg0: any) => any; }) {
  try {
    for await (const entry of oldRepo.entries('*')) {
      await newRepo.writeEntry(entry);
    }
    return { success: true };
  } catch (error) {
    console.error('Error copying repository contents:', error);
    return { success: false, message: error };
  }
}

async function copyRepoSettings(provider: any, oldRepo: { attributes: { description: any; homepage: any; private: any; topics: any; }; }, newRepo: { update: (arg0: { description: any; homepage: any; private: any; topics: any; }) => any; }) {
  try {
    const { description, homepage, private: isPrivate, topics } = oldRepo.attributes;
    await newRepo.update({ description, homepage, private: isPrivate, topics });
    return { success: true };
  } catch (error) {
    console.error('Error copying repository settings:', error);
    return { success: false, message: error };
  }
}

async function deleteRepo(provider: { deleteRepository: (arg0: any) => any; }, owner: any, repoName: any) {
  try {
    await provider.deleteRepository(repoName);
    return { success: true };
  } catch (error) {
    console.error('Error deleting repository:', error);
    return { success: false, message: error };
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession({ req });
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { owner, repoName } = await req.json();
    const accessToken = session.accessToken;

    const config = {
      token: accessToken,
    };
    const provider = new GithubProvider(config);
    const oldRepo = await provider.repository(`${owner}/${repoName}`);

    const createResponse = await createRepo(provider, owner, repoName);
    if (!createResponse.success) {
      return NextResponse.json(createResponse);
    }

    const newRepo = createResponse.data;

    const copyContentsResponse = await copyRepoContents(provider, oldRepo, newRepo);
    if (!copyContentsResponse.success) {
      return NextResponse.json(copyContentsResponse);
    }

    const copySettingsResponse = await copyRepoSettings(provider, oldRepo, newRepo);
    if (!copySettingsResponse.success) {
      return NextResponse.json(copySettingsResponse);
    }

    const deleteResponse = await deleteRepo(provider, owner, repoName);
    if (!deleteResponse.success) {
      return NextResponse.json(deleteResponse);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DE_LINK_REPO_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
