import { database } from '../database/db.js';

class KnowledgeParser {
    constructor() {
        this.isProcessing = false;
    }

    async parseKnowledgeBase() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            const problems = await this.extractProblemsFromPage();
            await this.saveToDatabase(problems);
        } catch (error) {
            console.error('Ошибка при парсинге базы знаний:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    async extractProblemsFromPage() {
        const problems = [];
        const rows = document.querySelectorAll('tr');

        for (const row of rows) {
            const problem = this.extractProblemFromRow(row);
            if (problem) {
                problems.push(problem);
            }
        }

        return problems;
    }

    extractProblemFromRow(row) {
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) return null;

        return {
            category: cells[0]?.textContent?.trim() || '',
            title: cells[1]?.textContent?.trim() || '',
            content: cells[2]?.textContent?.trim() || '',
            requirements: cells[3]?.textContent?.trim() || '',
            notes: cells[4]?.textContent?.trim() || ''
        };
    }

    async saveToDatabase(problems) {
        for (const problem of problems) {
            try {
                await database.addKnowledgeItem(problem);
            } catch (error) {
                console.error('Ошибка при сохранении проблемы:', error);
            }
        }
    }
}

export const knowledgeParser = new KnowledgeParser(); 