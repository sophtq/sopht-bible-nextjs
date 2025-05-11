export class StorageService {
  private static instance: StorageService;

  constructor() { }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  save<T>(key: string, value: T) {
    let valueString = String(value);
    if (typeof value === 'object' && value !== null) {
      valueString = JSON.stringify(value)
    }
    
    if (localStorage) {
      localStorage.setItem(key, valueString);
    } else {
      this.setCookie(key, valueString)
    }
  }

  setCookie(key: string, value: string) {
    const date = new Date();

    // Set it expire in 7 days
    date.setTime(date.getTime() + (7 * 24 * 60 * 60 * 1000));

    // Set it
    document.cookie = key+"="+value+"; expires="+date.toUTCString()+"; path=/";
  }

  getCookie(key: string): string | undefined {
    const value = "; " + document.cookie;
    const parts = value.split("; " + key + "=");

    if (parts.length == 2) {
        return parts.pop()?.split(";").shift();
    }
    return undefined
  }

  deleteCookie(name: string) {
    const date = new Date();

    // Set it expire in -1 days
    date.setTime(date.getTime() + (-1 * 24 * 60 * 60 * 1000));

    // Set it
    document.cookie = name+"=; expires="+date.toUTCString()+"; path=/";
  }

  getStoredValue(key: string) {
    if (localStorage) {
      return localStorage.getItem(key);
    } else {
      return this.getCookie(key);
    }
  }

  getBoolean(key: string) : boolean {
    return (this.getStoredValue(key) == "true" ? true : false);
  }

  getNumber(key: string): number {
    return Number(this.getStoredValue(key));
  }

  getStoredObject<T>(key: string): T | null {
    const jsonString = this.getStoredValue(key)
    let object: T | null = null
    try {
      if (jsonString) {
        object = JSON.parse(jsonString);
      }
    } catch(e) {
      console.warn(e, jsonString, key);
    }
    return object
  }

  clearItem(key: string) {
    if (localStorage) {
      localStorage.removeItem(key);
    } else {
      this.deleteCookie(key)
    }
  }

  clearAll() {
    if (localStorage) {
      localStorage.clear();
    } else {
      this.clearAllCookies()
    }
  }

  clearAllCookies() {
    const cookies = document.cookie.split("; ");
    for (let c = 0; c < cookies.length; c++) {
      const d = window.location.hostname.split(".");
      while (d.length > 0) {
        const cookieBase = encodeURIComponent(cookies[c].split(";")[0].split("=")[0]) + '=; expires=Thu, 01-Jan-1970 00:00:01 GMT; domain=' + d.join('.') + ' ;path=';
        const p = location.pathname.split('/');
        document.cookie = cookieBase + '/';
        while (p.length > 0) {
          document.cookie = cookieBase + p.join('/');
          p.pop();
        };
        d.shift();
      }
    }
  }

}
