class ProblemsDatabase {
    constructor(problems) {
        this.problems = problems;
        this.searchCache = new Map();
        this.cacheLimit = 100;
        this.createSearchIndex();
    }

    // Вспомогательные методы
    extractWords(text) {
        return text.toLowerCase()
            .replace(/[^а-яё\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2);
    }

    getWordPositions(word, text) {
        const positions = [];
        const lowerText = text.toLowerCase();
        const lowerWord = word.toLowerCase();
        let pos = 0;
        
        while ((pos = lowerText.indexOf(lowerWord, pos)) !== -1) {
            positions.push(pos);
            pos += 1;
        }
        
        return positions;
    }

    // Методы для работы с категориями
    getCategories() {
        if (!this.problems || !Array.isArray(this.problems)) {
            console.error('Problems array is not initialized properly');
            return [];
        }
        const categories = new Set();
        this.problems.forEach(problem => {
            if (problem && problem.category) {
                categories.add(problem.category);
            }
        });
        return Array.from(categories).sort();
    }

    filterByCategory(problems, category) {
        if (!category) return problems;
        return problems.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    // Методы индексации
    createSearchIndex() {
        this.searchIndex = new Map();
        
        this.problems.forEach((problem, index) => {
            // Индексируем все важные поля
            const textToIndex = [
                problem.title,
                problem.content,
                problem.category,
                problem.requirements
            ].join(' ');

            // Разбиваем на слова и создаем индекс
            const words = this.extractWords(textToIndex);
            words.forEach(word => {
                if (!this.searchIndex.has(word)) {
                    this.searchIndex.set(word, new Map());
                }
                
                // Сохраняем позиции слова в каждом поле
                const wordPositions = {
                    title: this.getWordPositions(word, problem.title),
                    content: this.getWordPositions(word, problem.content),
                    category: this.getWordPositions(word, problem.category),
                    requirements: this.getWordPositions(word, problem.requirements)
                };

                this.searchIndex.get(word).set(index, wordPositions);
            });
        });
    }

    // Методы поиска
    search(query) {
        if (!query) return this.problems;

        const cacheKey = query.toLowerCase().trim();
        if (this.searchCache.has(cacheKey)) {
            return this.searchCache.get(cacheKey);
        }

        const searchWords = this.extractWords(query);
        if (searchWords.length === 0) return this.problems;

        const scores = new Map();
        
        searchWords.forEach(word => {
            const wordIndex = this.searchIndex.get(word);
            if (wordIndex) {
                wordIndex.forEach((positions, problemIndex) => {
                    let score = scores.get(problemIndex) || 0;
                    
                    if (positions.title.length > 0) {
                        score += 25 * positions.title.length;
                        if (positions.title[0] === 0) score += 10;
                    }
                    if (positions.content.length > 0) {
                        score += 15 * positions.content.length;
                    }
                    if (positions.category.length > 0) {
                        score += 10 * positions.category.length;
                    }
                    if (positions.requirements.length > 0) {
                        score += 5 * positions.requirements.length;
                    }

                    scores.set(problemIndex, score);
                });
            }

            if (word.length >= 3) {
                this.problems.forEach((problem, problemIndex) => {
                    let score = scores.get(problemIndex) || 0;
                    const problemText = [
                        problem.title,
                        problem.content,
                        problem.category,
                        problem.requirements
                    ].join(' ').toLowerCase();

                    const problemWords = problemText.split(/\s+/);
                    for (const problemWord of problemWords) {
                        if (problemWord.includes(word)) {
                            score += 10;
                            if (problemWord.startsWith(word)) {
                                score += 5;
                            }
                            break;
                        }
                    }

                    if (score > 0) {
                        scores.set(problemIndex, score);
                    }
                });
            }
        });

        const fullQuery = query.toLowerCase();
        scores.forEach((score, index) => {
            const problem = this.problems[index];
            if (problem.title.toLowerCase().includes(fullQuery)) {
                scores.set(index, score + 30);
            }
            if (problem.content.toLowerCase().includes(fullQuery)) {
                scores.set(index, score + 15);
            }
        });

        const results = Array.from(scores.entries())
            .map(([index, score]) => ({
                ...this.problems[index],
                score,
                id: index,
                highlightedTitle: this.highlightMatches(this.problems[index].title, searchWords),
                highlightedContent: this.highlightMatches(this.problems[index].content, searchWords)
            }))
            .filter(problem => problem.score > 0)
            .sort((a, b) => b.score - a.score);

        if (this.searchCache.size >= this.cacheLimit) {
            const firstKey = this.searchCache.keys().next().value;
            this.searchCache.delete(firstKey);
        }
        this.searchCache.set(cacheKey, results);

        return results;
    }

    highlightMatches(text, searchWords) {
        let result = text;
        searchWords.forEach(word => {
            const regex = new RegExp(word, 'gi');
            result = result.replace(regex, match => `<span class="highlight">${match}</span>`);
        });
        return result;
    }
}

// Экспортируем класс
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProblemsDatabase;
} else if (typeof window !== 'undefined') {
    window.ProblemsDatabase = ProblemsDatabase;
} 