import Papa from 'papaparse';
import { Question, QuestionOptionKey } from '@/types';

export interface CSVQuestionRow {
  Question: string;
  'Option A': string;
  'Option B': string;
  'Option C': string;
  'Option D': string;
  'Correct Answer': string;
  Marks?: string | number;
  Explanation?: string;
  'Image URL'?: string;
}

export function parseCSVQuestions(file: File): Promise<Omit<Question, 'id'>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<CSVQuestionRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const questions: Omit<Question, 'id'>[] = results.data.map(
            (row, index) => {
              const rawAns = (row['Correct Answer'] || 'A').toUpperCase().trim();
              const validAns: QuestionOptionKey = ['A', 'B', 'C', 'D'].includes(
                rawAns
              )
                ? (rawAns as QuestionOptionKey)
                : 'A';

              const marks = parseFloat(String(row.Marks || '1')) || 1;

              return {
                question: row.Question || `Question ${index + 1}`,
                optionA: row['Option A'] || '',
                optionB: row['Option B'] || '',
                optionC: row['Option C'] || '',
                optionD: row['Option D'] || '',
                correctAnswer: validAns,
                marks: marks,
                explanation: row.Explanation || '',
                imageUrl: row['Image URL'] || '',
                orderIndex: index,
              };
            }
          );
          resolve(questions);
        } catch (err) {
          reject(err);
        }
      },
      error: (error) => reject(error),
    });
  });
}

export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || !rows.length) return;
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
