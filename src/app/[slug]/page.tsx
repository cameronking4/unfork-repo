'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import CodeSnippet from '@/components/code-snippet';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface RepoItem {
  type: string;
  name: string;
  contents?: RepoItem[];
}

const parseRepoData = (data: RepoItem[], prefix = ''): string => {
  let structure = '';

  data.forEach((item) => {
    if (item.type === 'dir') {
      structure += `${prefix}├── ${item.name}\n`;
      if (item.contents) {
        structure += parseRepoData(item.contents, prefix + '|   ');
      }
    } else {
      structure += `${prefix}|   ├── ${item.name}\n`;
    }
  });

  return structure;
};

export default function ProjectPage({ params }: { params: { slug: string } }) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const owner = searchParams.get('owner');
  const [repoStructure, setRepoStructure] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchGithubRepo() {
      try {
        setLoading(true);
        const response = await axios.post('/api/repo', {
          owner: owner,
          repoName: params.slug,
          token: session?.accessToken,
        });

        const respoData = response.data;
        const structure = parseRepoData(respoData);
        setRepoStructure(structure);
        setLoading(false);
      } catch (error) {
        setError('Failed to fetch repository data');
        setLoading(false);
      }
    }

    if (session && owner && params.slug) {
      fetchGithubRepo();
    }
  }, [session, owner, params]);

  const handleUnFork = async () => {
    if (!session) {
      setError('You must be logged in to perform this action.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');

      // Step 1: Create and migrate repository contents to the new repository
      const migrateRepoResponse = await axios.post('/api/migrateRepo', {
        owner,
        repoName: params.slug,
        accessToken: session.accessToken,
        newRepoName: `${params.slug}-unforked`,
      });

      if (!migrateRepoResponse.data.success) {
        setError(`Failed to migrate repository contents. ${migrateRepoResponse.data.message}`);
        setLoading(false);
        return;
      }

      // Step 2: Delete the original repository
      const deleteResponse = await axios.post('/api/deleteRepo', {
        owner,
        repoName: params.slug,
        accessToken: session.accessToken,
      });

      if (!deleteResponse.data.success) {
        setError(`Failed to delete the original repository. ${deleteResponse.data.message}`);
        setLoading(false);
        return;
      }

      // Step 3: Rename the new repository
      const renameRepoResponse = await axios.post('/api/renameRepo', {
        owner,
        oldRepoName: `${params.slug}-unforked`,
        newRepoName: params.slug,
        accessToken: session.accessToken,
      });

      if (!renameRepoResponse.data.success) {
        setError(`Failed to rename the new repository. ${renameRepoResponse.data.message}`);
        setLoading(false);
        return;
      }

      // Step 4: Copy repository settings
      const copyRepoSettingsResponse = await axios.post('/api/copyRepoSettings', {
        owner,
        oldRepoName: params.slug,
        newRepoName: params.slug,
        accessToken: session.accessToken,
      });

      if (!copyRepoSettingsResponse.data.success) {
        setError(`Failed to copy repository settings. ${copyRepoSettingsResponse.data.message}`);
        setLoading(false);
        return;
      }

      setMessage('Repository successfully unforked!');
      setLoading(false);
    } catch (error) {
      setError('An error occurred during the un-forking process.');
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="flex w-full flex-col py-8 space-y-6">
      <Link href="/" className="flex group flex-row space-x-1 items-center">
        <ArrowLeft
          size={16}
          className="group-hover:-translate-x-1 duration-200"
        />
        <span>Back</span>
      </Link>
      <span className="font-bold text-xl">{params.slug}</span>
      <div className="w-full flex flex-col items-center justify-center sm:items-start">
        <CodeSnippet code={repoStructure} width="w-full" />
        <button
          onClick={handleUnFork}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Un-Fork Repository
        </button>
        {message && <p className="mt-4 text-green-500">{message}</p>}
      </div>
    </div>
  );
}