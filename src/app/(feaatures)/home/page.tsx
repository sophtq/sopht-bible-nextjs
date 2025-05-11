'use client'

import { useCallback, useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { dataService } from 'app/data/data.service';
import Link from 'next/link';
import { Verse } from 'app/models/verse';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>("Checking last refresh...");
  const [lastMeal, setLastMeal] = useState<Verse | null>(null);
  const [lastBookmark, setLastBookmark] = useState<Verse | null>(null);
  const [randomVerse, setRandomVerse] = useState<Verse | null>(null);

  // setIsLoading(true);
  // setMessage('Checking last refresh...');

  
const fetchData = useCallback(() => {
  setIsLoading(true);
  setMessage('Fetching data...');
  Promise.all([
    dataService.getLastMeal(),
    dataService.getLastBookmark(),
    dataService.getRandomVerse()
  ]).then(([meal, bookmark, random]) => {
    setLastMeal(meal || null);
    setLastBookmark(bookmark || null);
    setRandomVerse(random || null);
    setIsLoading(false);
    console.log(meal, bookmark, random);
    
    setMessage("Data fetched successfully.");
  }
  ).catch(error => {
    console.error(error);
    setMessage('Error fetching data.');
    setIsLoading(false);
  });
}, []);


  const refreshDB = useCallback(
    (force: boolean = false) => {
      dataService.refreshDB(
        force,
        (msg: string) => {
          console.log(msg);
          setMessage(msg);
          fetchData();
        },
        (errorMsg: string) => {
          console.log(errorMsg);
          setMessage(errorMsg);
          setIsLoading(false);
        }
      );
    },
    [fetchData]
  );

  
  useEffect(() => {
    refreshDB()
  }, [refreshDB]);
  

  return (
    <Layout>      
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Home</h2>

        {/* Last Meal */}
        <div className="mb-4 p-4 border rounded-lg shadow">
          <h3 className="text-lg font-bold">Last Meal</h3>
          {lastMeal ? (
            <>
              <p className="text-sm text-gray-600">
                {lastMeal.bookName} {lastMeal.chapterNumber}:{lastMeal.verseNumber} ({lastMeal.versionAcronym})
              </p>
              <p className="mt-2">{lastMeal.text}</p>
              <Link href={`/read?verseId=${lastMeal.id}`} className="text-cyan-600 mt-2 block">
                Read
              </Link>
            </>
          ) : (
            <p className="text-gray-600">No last meal available.</p>
          )}
        </div>

        {/* Last Bookmark */}
        <div className="mb-4 p-4 border rounded-lg shadow">
          <h3 className="text-lg font-bold">Last Bookmark</h3>
          {lastBookmark ? (
            <>
              <p className="text-sm text-gray-600">
                {lastBookmark.bookName} {lastBookmark.chapterNumber}:{lastBookmark.verseNumber} ({lastBookmark.versionAcronym})
              </p>
              <p className="mt-2">{lastBookmark.text}</p>
              <Link href={`/read?verseId=${lastBookmark.id}`} className="text-cyan-600 mt-2 block">
                Read
              </Link>
            </>
          ) : (
            <p className="text-gray-600">No bookmarks available.</p>
          )}
        </div>

        {/* Random Verse */}
        <div className="mb-4 p-4 border rounded-lg shadow">
          <h3 className="text-lg font-bold">Random Verse</h3>
          {randomVerse ? (
            <>
              <p className="text-sm text-gray-600">
                {randomVerse.bookName} {randomVerse.chapterNumber}:{randomVerse.verseNumber} ({randomVerse.versionAcronym})
              </p>
              <p className="mt-2">{randomVerse.text}</p>
              <Link href={`/read?verseId=${randomVerse.id}`} className="text-cyan-600 mt-2 block">
                Read
              </Link>
            </>
          ) : (
            <p className="text-gray-600">No random verse available.</p>
          )}
        </div>

                {/* Refresh Buttons */}
                <div className="flex gap-4">
          <button
            onClick={() => refreshDB(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Force Refresh
          </button>
        </div>

        {/* Loading Indicator */}
        {isLoading && <LoadingSpinner />}

        {/* Message */}
        {message && <p className="mt-4 text-gray-600">{message}</p>}

      </div>
    </Layout>
  );
}