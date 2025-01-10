import { knowledgeBase } from './knowledge_base.js';

const dbName = 'knowledgeDB';
const dbVersion = 1;

class Database {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                this.initializeKnowledgeBase().then(resolve);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Хранилище для базы знаний
                if (!db.objectStoreNames.contains('knowledge')) {
                    const store = db.createObjectStore('knowledge', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('title', 'title', { unique: false });
                    store.createIndex('content', 'content', { unique: false });
                    store.createIndex('category', 'category', { unique: false });
                }
            };
        });
    }

    async initializeKnowledgeBase() {
        // Проверяем, есть ли уже данные в базе
        const count = await this.getKnowledgeCount();
        if (count === 0) {
            // Если база пустая, загружаем предварительно собранные данные
            for (const item of knowledgeBase) {
                await this.addKnowledgeItem(item);
            }
        }
    }

    async getKnowledgeCount() {
        return this.performTransaction('knowledge', 'readonly', store => {
            return new Promise((resolve) => {
                const countRequest = store.count();
                countRequest.onsuccess = () => resolve(countRequest.result);
                countRequest.onerror = () => resolve(0);
            });
        });
    }

    async addKnowledgeItem(item) {
        return this.performTransaction('knowledge', 'readwrite', store => {
            return store.add(item);
        });
    }

    async searchKnowledge(query) {
        return this.performTransaction('knowledge', 'readonly', store => {
            return new Promise((resolve) => {
                const results = [];
                store.openCursor().onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        const item = cursor.value;
                        if (this.matchesSearch(item, query)) {
                            results.push(item);
                        }
                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                };
            });
        });
    }

    matchesSearch(item, query) {
        const searchText = query.toLowerCase();
        return (
            item.title.toLowerCase().includes(searchText) ||
            item.content.toLowerCase().includes(searchText) ||
            item.category.toLowerCase().includes(searchText)
        );
    }

    async performTransaction(storeName, mode, callback) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);

            resolve(callback(store));
        });
    }
}

export const database = new Database(); 