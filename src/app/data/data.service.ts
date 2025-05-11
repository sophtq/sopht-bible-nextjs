import { ApiService } from '../network/api.service';
import { DBService } from '../cache/db.service';
import { Language } from '../models/language';
import { StorageService } from '../cache/storage.service';
import { Book } from '../models/book';
import { Chapter } from '../models/chapter';
import { Version } from '../models/version';
import { Verse } from '../models/verse';

export class DataService {

  storageService = StorageService.getInstance()

  constructor(private apiService: ApiService, private dbService: DBService) {

  }

  setLastDBRefresh() {
    this.storageService.save("lastDBRefresh", Number(Date.now()))
  }

  getLastDBRefresh(): number {
    return this.storageService.getNumber("lastDBRefresh")
  }

  clearLastDBRefrsh() {
    this.storageService.clearItem("lastDBRefresh")
  }

  saveVersion(version: Version) {
    this.storageService.save("version", version)
  }

  getStoredVersion(): Version | null {
    return  this.storageService.getStoredObject<Version>("version")
  }

  saveVersionId(versionId: number) {
    this.storageService.save("versionId", versionId)
  }

  getStoredVersionId(): number {
    return this.storageService.getNumber("versionId") ?? 1
  }

  saveVerseId(verseId: number) {
    this.storageService.save("verseId", verseId)
  }

  getStoredVerseId(): number {
    return this.storageService.getNumber("verseId")
  }
  

  refreshDB(force: boolean = false, onDBRefreshed: (msg: string) => void = () => { }, onError: (errorMsg: string) => void): void {
    // Check if the database needs to be refreshed
    if (!force && (Date.now() - this.getLastDBRefresh()) <= 2.592e9) {
      onDBRefreshed("Database was refreshed less than a month ago. Use 'Force Refresh' to refresh anyway.")
      return
    }
    Promise.all([
      this.apiService.getLanguages(),
      this.apiService.getVersions(),
      this.apiService.getBooks(),
      this.apiService.getChapters()
    ]).then(([languages, versions, books, chapters]) => Promise.all([
          this.dbService.insertBulk<Language>(this.dbService.language, languages),
          this.dbService.insertBulk<Version>(this.dbService.verzion, versions),
          this.dbService.insertBulk<Book>(this.dbService.book, books),
          this.dbService.insertBulk<Chapter>(this.dbService.chapter, chapters)
    ]).then(([lang, ver, bk, chpt]) => {
            // Check if the number of inserted items matches the number of fetched items
            // and if the data is consistent      
            if (languages.length == lang.length &&
              versions.length == ver.length &&
              books.length == bk.length &&
              chapters.length == chpt.length
            ) {
              this.setLastDBRefresh()
              onDBRefreshed("Database refreshed successfully!")
              console.log("Database refreshed successfully!")
            } else {
              onError("Error refreshing database: Data mismatch")
              this.clearLastDBRefrsh()
            }
          })
        ).catch((error) => {
          console.error("Error refreshing database:", error);   
          onError("Error refreshing database: " + error.message)
          this.clearLastDBRefrsh()
      })
     }

  getVersions(): Promise<Version[]> {
    return this.dbService.getAll<Version>(this.dbService.verzion)
  }

  constructVerseId(versionId: number, bookId: number, chapterId: number, verseNo: number): number {
    const verseIdStr = versionId.toString().padStart(3, '0') +
    bookId.toString().padStart(3, '0') +
        chapterId.toString().padStart(3, '0') +
        verseNo.toString().padStart(3, '0');
        return parseInt(verseIdStr, 10);
  }

  deserializeVerseText(oldVerse: Verse): Verse {
    // Handle verse text formatting
    // Replace <CL> with newline, <CM> with double newline, <FI> with [ and <Fi> with ]
    // Remove extra newlines
    // and replace <TS> with title
    // and <RF> with reference
    // and <FR> with red text
    // and <Fr> with red text end
    // and <Rf> with reference end
    // and <TS> with title end
    // and <Ts> with title end
    // and <CL> with newline
    // and <CM> with double newline
    // and <FI> with [ and <Fi> with ]
    let verseText = oldVerse.text.replace(/<CL>/g, "\n")
        .replace(/<CM>/g, "\n\n")
        .replace(/<FI>/g, "[")
        .replace(/<Fi>/g, "]")
        .replace(/\n\n \n\n/g, "\n\n")
        .replace(/\n\n\n\n/g, "\n\n");

    let verseTitle = "";
    while (verseText.includes("<TS>")) {
        if (verseTitle) {
            verseTitle += "\n";
        }
        verseTitle += verseText.substring(verseText.indexOf("<TS>") + "<TS>".length, verseText.indexOf("<Ts>"));
        const titleStartPos = verseText.indexOf("<TS>");
        const titleEndPos = verseText.indexOf("<Ts>") + "<Ts>".length;
        verseText = verseText.slice(0, titleStartPos) + verseText.slice(titleEndPos);
    }

    // Handle references extraction
    const verseReferences: Map<[number, number], string> = new Map();
    let refPlaceHolder = "*";
    while (verseText.includes("<RF>")) {
        const reference = verseText.substring(verseText.indexOf("<RF>") + "<RF>".length, verseText.indexOf("<Rf>"));
        const refStartPos = verseText.indexOf("<RF>");
        const refEndPos = verseText.indexOf("<Rf>") + "<Rf>".length;
        verseText = verseText.slice(0, refStartPos) + refPlaceHolder + verseText.slice(refEndPos);
        verseReferences.set([refStartPos, refEndPos], reference);
        refPlaceHolder += "*";
    }

    // Handle Jesus's Words in Red
    let redText = "";
    const highlights: Map<[number, number], string> = new Map();
    redText += verseText.substring(verseText.indexOf("<FR>") + "<FR>".length, verseText.lastIndexOf("<Fr>"));
    verseText = verseText.replace(`<FR>${redText}<Fr>`, redText.replace(/<Fr>/g, ""));
    redText = redText.replace(/<Fr>/g, "");
    const redStartPos = verseText.indexOf(redText);
    const redEndPos = verseText.length - 1;
    highlights.set([redStartPos, redEndPos], "ff0000");

    return {
        id: oldVerse.id,
        bookNumber: oldVerse.bookNumber,
        bookName: oldVerse.bookName,
        chapterNumber: oldVerse.chapterNumber,
        verseNumber: oldVerse.verseNumber,
        versionId: oldVerse.versionId,
        versionAcronym: oldVerse.versionAcronym,
        text: verseText,
        title: verseTitle,
        bookmarkId: oldVerse.bookmarkId,
        createdAt: oldVerse.createdAt,
        updatedAt: oldVerse.updatedAt,
        lastRead: oldVerse.lastRead, // Add lastRead property
        references: verseReferences,
        highlights: highlights
    };
  }

  async downloadVersion(
    version: Version,
    downloadProgress: (message: string, progress: number) => void,
    onComplete: () => void
  ): Promise<void> {
    try {
      // Simulate downloading Bible data
      const versesStringArray = await this.apiService.downloadBible(version.acronym, (message: string, progress: number) => {
        downloadProgress(message, progress);
      });

      downloadProgress("Download complete. Adding to database", 2);

      const books = await this.dbService.getBooksByLanguage(version.languageId);
      let verseStartIndex = 0;
      let verseEndIndex = 0;

      for (const book of books) {
        const chapters = await this.dbService.getChaptersForBook(book.id);

        for (const chapter of chapters) {
          verseEndIndex = verseStartIndex + chapter.versesCount;

          for (let i = verseStartIndex; i < verseEndIndex; i++) {
            const verseId = this.constructVerseId(
              version.id,
              book.bookNumber,
              chapter.chapterNumber,
              i - verseStartIndex + 1
            );

            let verse: Verse = new Verse(
              verseId,
              book.bookNumber,
              book.name,
              chapter.chapterNumber,
              i - verseStartIndex + 1,
              version.acronym,
              version.id,
              versesStringArray[i],
            );

            verse = this.deserializeVerseText(verse);
            await this.dbService.insert<Verse>(this.dbService.verse, verse);
          }

          verseStartIndex = verseEndIndex;
          downloadProgress(
            "Adding to database",
            verseStartIndex / versesStringArray.length
          );
        }
      }

      if (verseStartIndex === versesStringArray.length) {
        await this.dbService.updateDownloadStatus(true, version.id);
        onComplete();
      }
    } catch (error) {
      console.error("Error during version download:", error);
    }
  }

   getVerses(versionId: number, lastVerseId: number, limit: number = 20): Promise<Verse[]> {
      // Get the verses from the database
      return this.dbService.getVerses(versionId, lastVerseId, limit)
   }

   getNextVerses(versionId: number, lastVerseId: number, limit: number = 20): Promise<Verse[]> {
      // Get the next verses from the database
    return this.dbService.getNextVerses(versionId, lastVerseId, limit)
   }

   getEarlierVerses(versionId: number, lastVerseId: number, limit: number = 20): Promise<Verse[]> {
      // Get the earlier verses from the database
      return this.dbService.getEarlierVerses(versionId, lastVerseId, limit)
   }

   getLastMeal(): Promise<Verse | undefined> {
      // Get the last meal from the database
      return this.dbService.getLastMeal()
   }

   getRandomVerse(): Promise<Verse | undefined> {
      // Get a random verse from the database
      return this.dbService.getRandomVerse()
   }

   getLastBookmark(): Promise<Verse | undefined> {
      // Get the last bookmark from the database
      // and return the corresponding verse
      return this.dbService.getLastBookmark()
   }
}

export const dataService = new DataService(new ApiService(), new DBService());
