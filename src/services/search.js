import { database } from '../database/db.js';

class SearchService {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.debounceTimeout = null;
        this.initializeSearch();
    }

    initializeSearch() {
        database.init().then(() => {
            this.setupEventListeners();
        }).catch(error => {
            console.error('Ошибка инициализации базы данных:', error);
        });
    }

    setupEventListeners() {
        this.searchInput.addEventListener('input', () => {
            clearTimeout(this.debounceTimeout);
            this.debounceTimeout = setTimeout(() => {
                this.performSearch();
            }, 300);
        });
    }

    async performSearch() {
        const query = this.searchInput.value.trim();
        if (!query) {
            this.clearResults();
            return;
        }

        try {
            this.showLoading();
            const results = await database.searchKnowledge(query);
            this.displayResults(results);
        } catch (error) {
            console.error('Ошибка поиска:', error);
            this.showError();
        }
    }

    displayResults(results) {
        this.clearResults();

        if (results.length === 0) {
            this.showNoResults();
            return;
        }

        results.forEach(result => {
            const resultElement = this.createResultElement(result);
            this.resultsContainer.appendChild(resultElement);
        });
    }

    createResultElement(result) {
        const div = document.createElement('div');
        div.className = 'result-item';

        const title = document.createElement('div');
        title.className = 'result-title';
        title.textContent = result.title;
        div.appendChild(title);

        const category = document.createElement('div');
        category.className = 'result-category';
        category.textContent = result.category;
        div.appendChild(category);

        const content = document.createElement('div');
        content.className = 'result-content';
        content.textContent = result.content;
        div.appendChild(content);

        return div;
    }

    clearResults() {
        this.resultsContainer.innerHTML = '';
    }

    showLoading() {
        this.clearResults();
        const loading = document.createElement('div');
        loading.className = 'loading';
        loading.textContent = 'Поиск...';
        this.resultsContainer.appendChild(loading);
    }

    showError() {
        this.clearResults();
        const error = document.createElement('div');
        error.className = 'loading';
        error.textContent = 'Произошла ошибка при поиске';
        this.resultsContainer.appendChild(error);
    }

    showNoResults() {
        const noResults = document.createElement('div');
        noResults.className = 'loading';
        noResults.textContent = 'Ничего не найдено';
        this.resultsContainer.appendChild(noResults);
    }
}

new SearchService(); 