'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Verse } from 'app/models/verse';
import { Version } from 'app/models/version';
import { dataService } from 'app/data/data.service';
import { useSearchParams } from 'next/navigation';
import Layout from 'app/components/Layout';

export default function Read() {
  const [bibleVersions, setBibleVersions] = useState<Version[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<number>(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const listRef = useRef<HTMLDivElement | null>(null);

  const BATCH_SIZE = 20; // Number of verses to load per batch
  const TRIGGER_THRESHOLD = 10; // Load when 10 verses are left
  const MAX_VERSES = 200; // Maximum number of verses to keep in the list
  
  // Fetch Bible versions from the database
  useEffect(() => {
    function fetchBibleVersions() {
      dataService.getVersions().then((bibleVersions) => {
        if (bibleVersions && bibleVersions.length > 0) {
          const storedVersionId = dataService.getStoredVersionId();
          setSelectedVersionId(storedVersionId ?? bibleVersions[0].id); // Default to the first version
        }
        setBibleVersions(bibleVersions || []);
      }).catch((error) => {
        console.error('Error fetching Bible versions:', error);   
      })
    }
    fetchBibleVersions();
  }, []);

  // Get currentVerseId from router or local storage, default to 1
  const searchParams = useSearchParams();

  // Fetch initial verses when the version or range changes
  useEffect(() => {
    const verseIdFromRouter = searchParams.get('verseId');
    let initialVerseId = 1;

    if (verseIdFromRouter) {
      initialVerseId = parseInt(verseIdFromRouter as string, 10);
    } else {
      initialVerseId = dataService.getStoredVerseId();
    }

    fetchVerses(selectedVersionId, initialVerseId);
  }, [selectedVersionId, searchParams]);

  const fetchVerses = (versionId: number, currentVerseId: number) => {
    setIsLoading(true);
    
    dataService.saveVerseId(currentVerseId);
    dataService.getVerses(versionId, currentVerseId, BATCH_SIZE).then((verses) => {
      
      if (verses && verses.length > 0) { 
        setVerses(verses);
      } else {
        setVerses([]);
      }
      setIsLoading(false);
    }).catch((error) => {
      console.error('Error fetching verses:', error);
      setIsLoading(false);
    });
  };

  // Trimming helpers
  const getFirstVisibleVerseId = useCallback((): number | null => {
    if (!listRef.current) return null;
    const containerTop = listRef.current.getBoundingClientRect().top;
    for (let i = 0; i < listRef.current.children.length; i++) {
      const child = listRef.current.children[i] as HTMLElement;
      if (child.getBoundingClientRect().bottom > containerTop) {
        return child.dataset.verseId ? parseInt(child.dataset.verseId, 10) : null;
      }
    }
    return null;
  }, []);

  const trimVersesOnAppend = useCallback((verses: Verse[], newVerses: Verse[]): Verse[] => {
    // If the combined length exceeds the maximum, trim from the start
    
    const combined = [...verses, ...newVerses];
    if (combined.length > MAX_VERSES) {
      const toRemove = 100;
      // Track the first visible verse ID before trimming
      const firstVisibleId = getFirstVisibleVerseId();
      // After trimming, scroll so that the same verse is at the top
      setTimeout(() => {
        if (listRef.current && firstVisibleId !== null) {
          const newIndex = combined
            .slice(toRemove)
            .findIndex((v) => v.id === firstVisibleId);
          if (newIndex !== -1) {
            const target = listRef.current.children[newIndex] as HTMLElement;
            if (target) {
              listRef.current.scrollTop = target.offsetTop;
            }
          }
        }
      }, 0);
      // Remove the excess verses
      return combined.slice(toRemove);
    }
    return combined;
  }, [MAX_VERSES, getFirstVisibleVerseId, listRef]);

  const trimVersesOnPrepend = useCallback((newVerses: Verse[], verses: Verse[]): Verse[] => {
    // Find the verse currently at the top before updating
    const firstVisibleId = getFirstVisibleVerseId();
  
    const combined = [...newVerses, ...verses];
    
    if (combined.length > MAX_VERSES) {
      // Trim from the end
      const trimmed = combined.slice(0, MAX_VERSES - 100);
  
      // After DOM update, scroll to keep the previous top verse in view
      setTimeout(() => {
        if (listRef.current && firstVisibleId !== null) {
          const newIndex = trimmed.findIndex((v) => v.id === firstVisibleId);
          if (newIndex !== -1) {
            const target = listRef.current.children[newIndex] as HTMLElement;
            if (target) {
              listRef.current.scrollTop = target.offsetTop;
            }
          }
        }
      }, 0);
  
      return trimmed;
    }
  
    // If not trimming, still try to keep the verse in view
    setTimeout(() => {
      if (listRef.current && firstVisibleId !== null) {
        const newIndex = combined.findIndex((v) => v.id === firstVisibleId);
        if (newIndex !== -1) {
          const target = listRef.current.children[newIndex] as HTMLElement;
          if (target) {
            listRef.current.scrollTop = target.offsetTop;
          }
        }
      }
    }, 0);
  
    return combined;
  }, [getFirstVisibleVerseId, MAX_VERSES, listRef]);
  
  
  
  const loadNextVerses = useCallback((lastVerseId: number, versionId: number) => {
    console.log('Loading next verses:', lastVerseId, versionId);
    
    setIsLoading(true);
    dataService.getNextVerses(versionId, lastVerseId, BATCH_SIZE).then((newVerses) => {
      if (newVerses.length > 0) {
        setVerses((prev) => trimVersesOnAppend(prev, newVerses));
      } else if (newVerses.length < BATCH_SIZE) {
        console.log('No more next verses to load.');
        // Stop fetching further previous verses
      }
      setIsLoading(false);
    }).catch((error) => {
      console.error('Error fetching next verses:', error);
      setIsLoading(false);
    });
  }, [trimVersesOnAppend]);

  const loadEarlierVerses = useCallback((earliestVerseId: number, versionId: number) => {
    if (isLoading) return;
    console.log('Loading earlier verses:', earliestVerseId, versionId);
    setIsLoading(true);
    
    dataService.getEarlierVerses(versionId, earliestVerseId, BATCH_SIZE).then((newVerses) => {
      newVerses.reverse(); // Reverse to maintain order
      if (newVerses.length > 0) {
        setVerses((prev) => trimVersesOnPrepend(newVerses, prev));
      } else if (newVerses.length < BATCH_SIZE) {
        console.log('No more previous verses to load.');
        
        // Stop fetching further previous verses
      }
      setIsLoading(false);
      // setTimeout(() => { fetchLockRef.current = false; }, 0);
    }).catch((error) => {
      console.error('Error fetching previous verses:', error);  
      setIsLoading(false);
    });
  }, [isLoading, trimVersesOnPrepend]);



// Helper: Find the last visible verse's index
function getLastVisibleIndex(): number {
  if (!listRef.current) return 0;
  const containerBottom = listRef.current.getBoundingClientRect().bottom;
  for (let i = listRef.current.children.length - 1; i >= 0; i--) {
    const child = listRef.current.children[i] as HTMLElement;
    if (child.getBoundingClientRect().top < containerBottom) {
      return i;
    }
  }
  return 0;
}

useEffect(() => {
  let debounceTimeout: NodeJS.Timeout | null = null;

  const onScroll = () => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      if (!listRef.current || verses.length === 0) return;
      // Get the first and last visible verse indices
      const firstVisibleIndex = (() => {
        const containerTop = listRef.current!.getBoundingClientRect().top;
        for (let i = 0; i < listRef.current!.children.length; i++) {
          const child = listRef.current!.children[i] as HTMLElement;
          if (child.getBoundingClientRect().bottom > containerTop) {
            return i;
          }
        }
        return 0;
      })();
      const lastVisibleIndex = getLastVisibleIndex();

      // Prevent multiple fetches while loading
      if (
        !isEndOfBible(verses[verses.length - 1]) &&
        !isLoading &&
        verses.length - 1 - lastVisibleIndex <= TRIGGER_THRESHOLD
      ) {
        loadNextVerses(verses[verses.length - 1].id, selectedVersionId);
      }
      if (
        !isBeginningOfBible(verses[0]) &&
        !isLoading &&
        firstVisibleIndex <= TRIGGER_THRESHOLD
      ) {        
        loadEarlierVerses(verses[0].id, selectedVersionId);
      }
    }, 100); // 100ms debounce
  };

  const container = listRef.current;
  if (container) {
    container.addEventListener('scroll', onScroll);
    onScroll(); // initial check
  }
  return () => {
    if (container) container.removeEventListener('scroll', onScroll);
    if (debounceTimeout) clearTimeout(debounceTimeout);
  };
}, [verses, selectedVersionId, isLoading, loadNextVerses, loadEarlierVerses]);

  const isBeginningOfBible = (verse: Verse) => {
  return verse.verseNumber === 1 && verse.chapterNumber === 1 && verse.bookNumber === 1;
}

  const isEndOfBible = (verse: Verse) => {
  return verse.verseNumber === 21 && verse.chapterNumber === 22 && verse.bookNumber === 66;
}
  

  return (
    <Layout>
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Read</h2>

        {/* Version Selector */}
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium">Bible Version</label>
          <select
            value={selectedVersionId}
            onChange={(e) => {
              setSelectedVersionId(parseInt(e.target.value, 10));
              dataService.saveVersionId(parseInt(e.target.value, 10));
              setVerses([]);
            }}
            className="p-2 border rounded w-full"
          >
            {bibleVersions.map((version) => (
              <option key={version.acronym} value={version.id}>
                {version.acronym}
              </option>
            ))}
          </select>
        </div>

        {/* Verses List */}
        <div
        className="space-y-4"
        ref={listRef}
        style={{ height: '800px', overflowY: 'auto' }}

        >
        {verses.map((verse) => (
          <div
            key={verse.id}
            data-verse-id={verse.id}
            className="p-4 border rounded-lg shadow"
          >
              {verse.verseNumber === 1 && (
                <div>
                  <h3 className="text-lg font-bold">{verse.bookName}</h3>
                  <h4 className="text-md text-gray-600">Chapter {verse.chapterNumber}</h4>
                </div>
              )}
              <p className="text-sm text-gray-600">
                {verse.verseNumber} - {verse.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}