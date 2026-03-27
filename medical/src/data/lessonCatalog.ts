import { cppLessonCatalogEntries } from './cppLessons.generated';
import { pythonLessonCatalogEntries } from './pythonLessons.generated';

export type LessonLanguage = 'python' | 'javascript' | 'cpp' | 'java';

export interface LessonCatalogEntry {
  id: string;
  title: string;
  language: LessonLanguage;
  index: number;
  languageIndex: number;
}

export const LESSON_COUNTS_BY_LANGUAGE: Record<LessonLanguage, number> = {
  python: 50,
  javascript: 50,
  cpp: 50,
  java: 50,
};

export const TOTAL_LESSON_COUNT = 200;

export const LESSON_CATALOG: LessonCatalogEntry[] = [
  ...pythonLessonCatalogEntries,
  { id: "javascript-introduction-1", title: "JavaScript Introduction", language: "javascript", index: 50, languageIndex: 0 },
  { id: "javascript-where-to-1", title: "JavaScript Where To", language: "javascript", index: 51, languageIndex: 1 },
  { id: "javascript-output-1", title: "JavaScript Output", language: "javascript", index: 52, languageIndex: 2 },
  { id: "javascript-syntax-1", title: "JavaScript Syntax", language: "javascript", index: 53, languageIndex: 3 },
  { id: "javascript-comments-1", title: "JavaScript Comments", language: "javascript", index: 54, languageIndex: 4 },
  { id: "javascript-let-1", title: "JavaScript Let", language: "javascript", index: 55, languageIndex: 5 },
  { id: "javascript-const-1", title: "JavaScript Const", language: "javascript", index: 56, languageIndex: 6 },
  { id: "javascript-variables-1", title: "JavaScript Variables", language: "javascript", index: 57, languageIndex: 7 },
  { id: "javascript-datatypes-1", title: "JavaScript Data Types", language: "javascript", index: 58, languageIndex: 8 },
  { id: "javascript-operators-1", title: "JavaScript Operators", language: "javascript", index: 59, languageIndex: 9 },
  { id: "javascript-arithmetic-1", title: "JavaScript Arithmetic", language: "javascript", index: 60, languageIndex: 10 },
  { id: "javascript-assignment-1", title: "JavaScript Assignment Operators", language: "javascript", index: 61, languageIndex: 11 },
  { id: "javascript-comparisons-1", title: "JavaScript Comparisons", language: "javascript", index: 62, languageIndex: 12 },
  { id: "javascript-if-else-1", title: "JavaScript If...Else", language: "javascript", index: 63, languageIndex: 13 },
  { id: "javascript-switch-1", title: "JavaScript Switch", language: "javascript", index: 64, languageIndex: 14 },
  { id: "javascript-loop-for-1", title: "JavaScript For Loop", language: "javascript", index: 65, languageIndex: 15 },
  { id: "javascript-loop-while-1", title: "JavaScript While Loop", language: "javascript", index: 66, languageIndex: 16 },
  { id: "javascript-loop-for-of-1", title: "JavaScript For...Of Loop", language: "javascript", index: 67, languageIndex: 17 },
  { id: "javascript-break-1", title: "JavaScript Break", language: "javascript", index: 68, languageIndex: 18 },
  { id: "javascript-functions-1", title: "JavaScript Functions", language: "javascript", index: 69, languageIndex: 19 },
  { id: "javascript-function-definitions-1", title: "JavaScript Function Definitions", language: "javascript", index: 70, languageIndex: 20 },
  { id: "javascript-function-arrows-1", title: "JavaScript Arrow Functions", language: "javascript", index: 71, languageIndex: 21 },
  { id: "javascript-function-parameters-1", title: "JavaScript Function Parameters", language: "javascript", index: 72, languageIndex: 22 },
  { id: "javascript-function-invocation-1", title: "JavaScript Function Invocation", language: "javascript", index: 73, languageIndex: 23 },
  { id: "javascript-function-closures-1", title: "JavaScript Function Closures", language: "javascript", index: 74, languageIndex: 24 },
  { id: "javascript-objects-1", title: "JavaScript Objects", language: "javascript", index: 75, languageIndex: 25 },
  { id: "javascript-object-properties-1", title: "Object Properties", language: "javascript", index: 76, languageIndex: 26 },
  { id: "javascript-object-methods-1", title: "Object Methods", language: "javascript", index: 77, languageIndex: 27 },
  { id: "javascript-arrays-1", title: "JavaScript Arrays", language: "javascript", index: 78, languageIndex: 28 },
  { id: "javascript-array-methods-1", title: "Array Methods", language: "javascript", index: 79, languageIndex: 29 },
  { id: "javascript-array-iterations-1", title: "Array Iterations", language: "javascript", index: 80, languageIndex: 30 },
  { id: "javascript-array-sort-1", title: "Array Sort", language: "javascript", index: 81, languageIndex: 31 },
  { id: "javascript-strings-1", title: "JavaScript Strings", language: "javascript", index: 82, languageIndex: 32 },
  { id: "javascript-string-methods-1", title: "String Methods", language: "javascript", index: 83, languageIndex: 33 },
  { id: "javascript-numbers-1", title: "JavaScript Numbers", language: "javascript", index: 84, languageIndex: 34 },
  { id: "javascript-number-methods-1", title: "Number Methods", language: "javascript", index: 85, languageIndex: 35 },
  { id: "javascript-math-1", title: "JavaScript Math", language: "javascript", index: 86, languageIndex: 36 },
  { id: "dom-intro-1", title: "DOM Introduction", language: "javascript", index: 87, languageIndex: 37 },
  { id: "dom-methods-1", title: "DOM Methods", language: "javascript", index: 88, languageIndex: 38 },
  { id: "dom-elements-1", title: "DOM Elements", language: "javascript", index: 89, languageIndex: 39 },
  { id: "dom-events-1", title: "DOM Events", language: "javascript", index: 90, languageIndex: 40 },
  { id: "dom-event-listener-1", title: "DOM Event Listener", language: "javascript", index: 91, languageIndex: 41 },
  { id: "js-classes-1", title: "JS Classes", language: "javascript", index: 92, languageIndex: 42 },
  { id: "js-class-inheritance-1", title: "JS Class Inheritance", language: "javascript", index: 93, languageIndex: 43 },
  { id: "js-modules-1", title: "JS Modules", language: "javascript", index: 94, languageIndex: 44 },
  { id: "js-promises-1", title: "JS Promises", language: "javascript", index: 95, languageIndex: 45 },
  { id: "js-async-await-1", title: "JS Async/Await", language: "javascript", index: 96, languageIndex: 46 },
  { id: "js-debugging-1", title: "JS Debugging", language: "javascript", index: 97, languageIndex: 47 },
  { id: "js-best-practices-1", title: "JS Best Practices", language: "javascript", index: 98, languageIndex: 48 },
  { id: "js-json-course-1", title: "JavaScript JSON Basics", language: "javascript", index: 99, languageIndex: 49 },
  ...cppLessonCatalogEntries,
  { id: "java-intro", title: "Java Intro", language: "java", index: 150, languageIndex: 0 },
  { id: "java-get-started", title: "Java Get Started", language: "java", index: 151, languageIndex: 1 },
  { id: "java-syntax", title: "Java Syntax", language: "java", index: 152, languageIndex: 2 },
  { id: "java-output", title: "Java Output", language: "java", index: 153, languageIndex: 3 },
  { id: "java-comments", title: "Java Comments", language: "java", index: 154, languageIndex: 4 },
  { id: "java-variables", title: "Java Variables", language: "java", index: 155, languageIndex: 5 },
  { id: "java-data-types", title: "Java Data Types", language: "java", index: 156, languageIndex: 6 },
  { id: "java-type-casting", title: "Java Type Casting", language: "java", index: 157, languageIndex: 7 },
  { id: "java-operators", title: "Java Operators", language: "java", index: 158, languageIndex: 8 },
  { id: "java-strings", title: "Java Strings", language: "java", index: 159, languageIndex: 9 },
  { id: "java-math", title: "Java Math", language: "java", index: 160, languageIndex: 10 },
  { id: "java-booleans", title: "Java Booleans", language: "java", index: 161, languageIndex: 11 },
  { id: "java-if-else", title: "Java If...Else", language: "java", index: 162, languageIndex: 12 },
  { id: "java-switch", title: "Java Switch", language: "java", index: 163, languageIndex: 13 },
  { id: "java-while-loop", title: "Java While Loop", language: "java", index: 164, languageIndex: 14 },
  { id: "java-for-loop", title: "Java For Loop", language: "java", index: 165, languageIndex: 15 },
  { id: "java-break-continue", title: "Java Break/Continue", language: "java", index: 166, languageIndex: 16 },
  { id: "java-arrays", title: "Java Arrays", language: "java", index: 167, languageIndex: 17 },
  { id: "java-arraylist", title: "Java ArrayList", language: "java", index: 168, languageIndex: 18 },
  { id: "java-linkedlist", title: "Java LinkedList", language: "java", index: 169, languageIndex: 19 },
  { id: "java-set", title: "Java Set", language: "java", index: 170, languageIndex: 20 },
  { id: "java-hashset", title: "Java HashSet", language: "java", index: 171, languageIndex: 21 },
  { id: "java-treeset", title: "Java TreeSet", language: "java", index: 172, languageIndex: 22 },
  { id: "java-map", title: "Java Map", language: "java", index: 173, languageIndex: 23 },
  { id: "java-hashmap", title: "Java HashMap", language: "java", index: 174, languageIndex: 24 },
  { id: "java-treemap", title: "Java TreeMap", language: "java", index: 175, languageIndex: 25 },
  { id: "java-methods", title: "Java Methods", language: "java", index: 176, languageIndex: 26 },
  { id: "java-method-parameters", title: "Java Method Parameters", language: "java", index: 177, languageIndex: 27 },
  { id: "java-method-overloading", title: "Java Method Overloading", language: "java", index: 178, languageIndex: 28 },
  { id: "java-scope", title: "Java Scope", language: "java", index: 179, languageIndex: 29 },
  { id: "java-recursion", title: "Java Recursion", language: "java", index: 180, languageIndex: 30 },
  { id: "java-oop", title: "Java OOP", language: "java", index: 181, languageIndex: 31 },
  { id: "java-classes-objects", title: "Java Classes/Objects", language: "java", index: 182, languageIndex: 32 },
  { id: "java-class-attributes", title: "Java Class Attributes", language: "java", index: 183, languageIndex: 33 },
  { id: "java-class-methods", title: "Java Class Methods", language: "java", index: 184, languageIndex: 34 },
  { id: "java-constructors", title: "Java Constructors", language: "java", index: 185, languageIndex: 35 },
  { id: "java-this-keyword", title: "Java this Keyword", language: "java", index: 186, languageIndex: 36 },
  { id: "java-modifiers", title: "Java Modifiers", language: "java", index: 187, languageIndex: 37 },
  { id: "java-encapsulation", title: "Java Encapsulation", language: "java", index: 188, languageIndex: 38 },
  { id: "java-inheritance", title: "Java Inheritance", language: "java", index: 189, languageIndex: 39 },
  { id: "java-polymorphism", title: "Java Polymorphism", language: "java", index: 190, languageIndex: 40 },
  { id: "java-super-keyword", title: "Java super Keyword", language: "java", index: 191, languageIndex: 41 },
  { id: "java-abstract-classes", title: "Java Abstract Classes", language: "java", index: 192, languageIndex: 42 },
  { id: "java-interfaces", title: "Java Interfaces", language: "java", index: 193, languageIndex: 43 },
  { id: "java-enums", title: "Java Enums", language: "java", index: 194, languageIndex: 44 },
  { id: "java-inner-classes", title: "Java Inner Classes", language: "java", index: 195, languageIndex: 45 },
  { id: "java-user-input", title: "Java User Input", language: "java", index: 196, languageIndex: 46 },
  { id: "java-date", title: "Java Date", language: "java", index: 197, languageIndex: 47 },
  { id: "java-errors-exceptions", title: "Java Errors & Exceptions", language: "java", index: 198, languageIndex: 48 },
  { id: "java-debugging", title: "Java Debugging", language: "java", index: 199, languageIndex: 49 },
];

export const LESSON_CATALOG_BY_ID = new Map(LESSON_CATALOG.map((lesson) => [lesson.id, lesson]));

export const getLessonCatalogEntry = (lessonId: string) => LESSON_CATALOG_BY_ID.get(lessonId);

export const getLessonLanguageFromId = (lessonId: string): LessonLanguage | undefined => {
  const directMatch = LESSON_CATALOG_BY_ID.get(lessonId);
  if (directMatch) return directMatch.language;

  const normalized = String(lessonId || '').replace(/_/g, '-').toLowerCase();
  const firstSegment = normalized.split('-').filter(Boolean)[0];
  if (firstSegment === 'python' || firstSegment === 'javascript' || firstSegment === 'cpp' || firstSegment === 'java') {
    return firstSegment;
  }

  return undefined;
};

export const getLessonCountByLanguage = (language: LessonLanguage) => LESSON_COUNTS_BY_LANGUAGE[language] || 0;

export const countCompletedLessonsByLanguage = (language: LessonLanguage, completedLessons: string[]) =>
  completedLessons.filter((lessonId) => getLessonLanguageFromId(lessonId) === language).length;

export const formatLessonIdAsDisplayName = (lessonId: string): string => {
  const lesson = LESSON_CATALOG_BY_ID.get(lessonId);
  if (lesson?.title && !/^[a-z0-9]+(?:[-_][a-z0-9]+)+$/i.test(lesson.title)) {
    return lesson.title;
  }

  const normalized = String(lessonId || '').replace(/_/g, '-').toLowerCase();
  const parts = normalized.split('-').filter(Boolean);
  if (parts.length === 0) return String(lessonId || 'Lesson');

  return parts
    .map((part) => {
      if (part === 'cpp') return 'C++';
      if (part === 'javascript') return 'JavaScript';
      if (part === 'java') return 'Java';
      if (part === 'python') return 'Python';
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
};
