'use client'

import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { Version } from '../../models/version';
import { dataService } from 'app/data/data.service';
import Tooltip from 'app/components/Tooltip';

export default function Download() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchVersions() {
      dataService.getVersions().then((versions) => {
        setVersions(versions || []);  
      })
    }
    fetchVersions();
  }, []);

  const downloadVersion = async (version: Version) => {
    setDownloadingId(version.id);
    dataService.downloadVersion(
      version,
      (message: string, progress: number) => {
        console.log(`Progress: ${message} (${progress * 100}%)`);
      },
      () => {
        console.log('Download complete');
        versions[versions.indexOf(version)].isDownloaded = true;
        setVersions([...versions]);
        setDownloadingId(null);
      }
    ).then(() => {
      console.log(`${version.acronym} Version downloaded successfully`);
    }).catch((error) => {
      console.error('Error during download:', error);
      setDownloadingId(null);
    });
  };

  return (
    <Layout>
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Download</h2>
        <ul className="space-y-4">
          {versions.map((version) => (
            <li key={version.id} className="p-4 border rounded-lg shadow flex justify-between items-center">
              <Tooltip text={version.description}>
                <div>
                  <h3 className="text-lg font-bold">{version.acronym}</h3>
                  <p className="text-sm text-gray-600">{version.name}</p>
                </div>
              </Tooltip>
              {version.isDownloaded ? (
                <span className="text-green-600 font-bold">Downloaded</span>
              ) : (
                <button
                  onClick={() => downloadVersion(version)}
                  className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700"
                  disabled={downloadingId === version.id}
                >
                  {downloadingId === version.id ? 'Downloading...' : 'Download'}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}