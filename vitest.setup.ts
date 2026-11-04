class MemoryStorage {
  private items = new Map<string, string>();

  get length(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.items.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }

  setItem(key: string, value: string): void {
    this.items.set(key, String(value));
  }
}

if (typeof window !== "undefined" && typeof window.localStorage === "undefined") {
  for (const name of ["localStorage", "sessionStorage"]) {
    const storage = new MemoryStorage() as unknown as Storage;
    for (const target of new Set<object>([globalThis, window])) {
      Object.defineProperty(target, name, { configurable: true, value: storage });
    }
  }
}
