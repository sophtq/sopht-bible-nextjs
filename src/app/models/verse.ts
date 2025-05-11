export class Verse {
  id: number
  bookNumber: number
  bookName: string
  chapterNumber: number
  verseNumber: number
  versionAcronym: string
  versionId: number
  text: string
  title: string = ""
  references: Map<[number, number], string> = new Map<[number, number], string>()
  bookmarkId: number = -1
  highlights: Map<[number, number], string> = new Map<[number, number], string>()
  lastRead: number = Date.now()
  createdAt: number = Date.now()
  updatedAt: number = Date.now()


  constructor(id: number, bookNumber: number, bookName: string, chapterNumber: number, verseNumber: number, versionAcronym: string, versionId: number, text: string) {
    this.id = id
    this.bookNumber = bookNumber
    this.bookName = bookName
    this.chapterNumber = chapterNumber
    this.verseNumber = verseNumber
    this.versionAcronym = versionAcronym
    this.versionId = versionId
    this.text = text
  }

  // ToString method
  toString(): string {
      return `${this.bookName} ${this.chapterNumber}:${this.verseNumber} (${this.versionAcronym}) - ${this.text}`;
  }
}
