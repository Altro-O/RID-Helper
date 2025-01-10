export default class ProblemsDatabase {
    constructor(problems) {
        this.problems = problems;
        this.createSearchIndex();
    }

    createSearchIndex() {
        // Создаем индекс для быстрого поиска
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

    extractWords(text) {
        return text.toLowerCase()
            .replace(/[^а-яё\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2);
    }

    search(query) {
        if (!query) return this.problems;

        const searchWords = this.extractWords(query);
        if (searchWords.length === 0) return this.problems;

        const scores = new Map();
        
        // Для каждого слова в запросе
        searchWords.forEach(word => {
            // Получаем все проблемы, содержащие это слово
            const wordIndex = this.searchIndex.get(word);
            if (!wordIndex) return;

            // Для каждой проблемы
            wordIndex.forEach((positions, problemIndex) => {
                const currentScore = scores.get(problemIndex) || 0;
                let score = currentScore;

                // Считаем релевантность на основе:
                // 1. Количества совпадений
                // 2. Позиции слова (в начале важнее)
                // 3. Поля, где найдено слово
                
                // Совпадения в заголовке
                if (positions.title.length > 0) {
                    score += 10 * positions.title.length;
                    // Бонус за совпадение в начале заголовка
                    if (positions.title[0] === 0) score += 5;
                }

                // Совпадения в контенте
                if (positions.content.length > 0) {
                    score += 5 * positions.content.length;
                    // Бонус за совпадение в начале контента
                    if (positions.content[0] === 0) score += 3;
                }

                // Совпадения в категории
                if (positions.category.length > 0) {
                    score += 3 * positions.category.length;
                }

                // Совпадения в требованиях
                if (positions.requirements.length > 0) {
                    score += 2 * positions.requirements.length;
                }

                // Бонус за точное совпадение фразы
                if (this.problems[problemIndex].title.toLowerCase().includes(query.toLowerCase())) {
                    score += 20;
                }

                scores.set(problemIndex, score);
            });
        });

        // Дополнительные баллы за последовательность слов
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

        return Array.from(scores.entries())
            .map(([index, score]) => ({
                ...this.problems[index],
                score,
                id: index,
                // Подсвечиваем найденные слова
                highlightedTitle: this.highlightMatches(this.problems[index].title, searchWords),
                highlightedContent: this.highlightMatches(this.problems[index].content, searchWords)
            }))
            .filter(problem => problem.score > 0)
            .sort((a, b) => b.score - a.score);
    }

    highlightMatches(text, searchWords) {
        let result = text;
        searchWords.forEach(word => {
            const regex = new RegExp(word, 'gi');
            result = result.replace(regex, match => `<span class="highlight">${match}</span>`);
        });
        return result;
    }

    getCategories() {
        const categories = new Set(this.problems.map(p => p.category));
        return Array.from(categories).sort();
    }

    filterByCategory(problems, category) {
        if (!category) return problems;
        return problems.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
} 