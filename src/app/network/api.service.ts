import axios from 'axios';
import { Book } from '../models/book';
import { Chapter } from '../models/chapter';
import { Language } from '../models/language';
import { Version } from '../models/version';

export class ApiService {

  private baseURL = "https://sopht-bible-api.sophtq.com"

  // Set config defaults when creating the instance
  private instance = axios.create({
    baseURL: this.baseURL,
    timeout: 120000
  });

  constructor() { 
    // Add a request interceptor
  this.instance.interceptors.request.use(function (config) {
    // Do something before request is sent
    console.log('Request URL:', config.url);
    
    return config;
  }, function (error) {
    // Do something with request error
    return Promise.reject(error);
  });
  
  // Add a response interceptor
  this.instance.interceptors.response.use(function (response) {
    // Any status code that lie within the range of 2xx cause this function to trigger
    // Do something with response data
    return response;
  }, function (error) {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Do something with response error
    return Promise.reject(error);
  });

  }

  getVersions(): Promise<Version[]> {
    return this.instance.get<Version[]>(`${this.baseURL}/versions`).then((response) => {
      return response.data.map((version: Version) => {
        return version;
      });
    });
  }

  getBooks(): Promise<Book[]> {
    return this.instance.get<Book[]>(`${this.baseURL}/books`).then((response) => {
      return response.data.map((book: Book) => {
        return book
      });
    })
  }

  getChapters(): Promise<Chapter[]> {
    return this.instance.get<Chapter[]>(`${this.baseURL}/chapters`).then((response) => {
      return response.data.map((chapter: Chapter) => {
        return chapter
      });
    })
  }

  getLanguages(): Promise<Language[]> {
    return this.instance.get<Language[]>(`${this.baseURL}/languages`).then((response) => {
      return response.data.map((language: Language) => {
        return language
      });
    })
  }

  downloadBible(
    versionAcronym: string = 'KJV',
    onDownloadProgress: (message: string, progress: number) => void
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.instance
        .get(`${this.baseURL}/versions/download/${versionAcronym.toLowerCase()}`, {
          responseType: 'text',
          onDownloadProgress: (event) => {
            if (event.total) {
              const progress = (event.loaded / event.total) * 100;
              onDownloadProgress(
                `Downloading ${versionAcronym}: ${Math.round(progress)}%`,
                progress
              );
            }
          },
        }).then((response) => {
          const responseBody = response.data as string;
          const versesStringArray = responseBody
            .split('\n\r')[0]
            .split('\r\n');
          resolve(versesStringArray); 
        }).catch((err) => {
          console.error('Error during download:', err);
          reject(err);
        })
    });
  }
}
