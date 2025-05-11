import Dexie, { Table, UpdateSpec } from 'dexie';
import { Language } from '../models/language';
import { Book } from '../models/book';
import { Chapter } from '../models/chapter';
import { Verse } from '../models/verse';
import { Version } from '../models/version';
import { Bookmark } from '../models/bookmark';

export class DBService extends Dexie {

  dbVersion: number = 1;
  private dbName: string = 'sb';

  schemaDefinition = {

  }
  language!: Table<Language, number>
  verzion!: Table<Version, number>
  book!: Table<Book, number>
  chapter!: Table<Chapter, number>
  bookmark!: Table<Bookmark, number>
  verse!: Table<Verse, number>

  constructor() {
    super('sb');
    this.version(this.dbVersion).stores({
      language: 'id',
      verzion: 'id',
      book: 'id, languageId',
      chapter: 'id, bookId',
      bookmark: '++id, bookmarkDate',
      verse: 'id, lastRead, versionId'
    });
    // this.on('populate', () => this.populate());
  }

  insert<T>(table: Table<T, number>, item: T): Promise<number> {
    return table.put(item)
  }

  insertBulk<T>(table: Table<T, number>, items: T[]): Promise<number[]> {
    return table.bulkPut(items, {allKeys: true})
  }

  getAll<T>(table: Table<T, number>): Promise<T[]> {
    return table.toArray()
  }

  getOne<T>(table: Table<T, number>, id: number): Promise<T | undefined> {
    return table.get(id)
  }

  update<T extends { id: number }>(table: Table<T, number>, item: T): Promise<number> {
    const { id, ...changes } = item;
    return table.update(id, changes as unknown as UpdateSpec<T>);
  }

  getLastMeal(): Promise<Verse | undefined> {
    return this.verse.orderBy('lastRead').reverse().first()
  }

  getRandomVerse(): Promise<Verse | undefined> {
    return this.verse.toArray().then(verses => {
      if (verses.length === 0) {
        return undefined;
      }
      const randomIndex = Math.floor(Math.random() * verses.length);
      return verses[randomIndex];
    })
  }

  getLastBookmark(): Promise<Verse | undefined> {
    return this.bookmark.orderBy('bookmarkDate').reverse().first(bookmark => {
      if (!bookmark) {
        return undefined;
      }
      return this.verse.get(bookmark.verseStartId).then(verse => {
        return verse;
      });
    });
  }

  getChaptersForBook(bookId: number): Promise<Chapter[]> {
    return this.chapter.where('bookId').equals(bookId).toArray()
  }

  getBooksByLanguage(languageId: number) {
    return this.book.where('languageId').equals(languageId).toArray()
  }

  getVersion(id: number): Promise<Version | undefined> {
    return this.verzion.get(id)
  }

  getVersionByAcronym(acronym: string): Promise<Version | undefined> {
    return this.verzion.where('acronym').equalsIgnoreCase(acronym).first()
  }

  updateDownloadStatus(isDownloaded: boolean, id: number) {
    return this.verzion.update(id, { isDownloaded: isDownloaded })
  }

  getVerses(
    versionId: number,
    lastVerseId: number,
    limit: number
  ): Promise<Verse[]> {

    return this.verse
      .where('versionId')
      .equals(versionId)
      .and((verse) => verse.id >= lastVerseId)
      .limit(limit)
      .toArray();
  }

  getNextVerses(
    versionId: number,
    lastVerseId: number,
    limit: number
  ): Promise<Verse[]> {

    return this.verse
      .where('versionId')
      .equals(versionId)
      .and((verse) => verse.id > lastVerseId)
      .limit(limit)
      .toArray();
  }

  getEarlierVerses(
    versionId: number,
    earliestVerseId: number,
    limit: number
  ): Promise<Verse[]> {

    return this.verse
      .where('versionId')
      .equals(versionId)
      .and((verse) => verse.id < earliestVerseId)
      .limit(limit)
      .reverse()
      .toArray();
  }

  async clearDB() {
    console.log('deleting DB...');
    this.close();
    await this.delete();
    await this.open();
    console.log('DB deleted.');
  }
}

export const dbService = new DBService();