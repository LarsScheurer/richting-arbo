export interface Process {
  id: string;
  name: string; // of 'naam'
  description?: string;
  // ... andere velden
}

export interface Function {
  id: string;
  name: string;
  // ...
}

export interface Substance {
  id: string;
  name: string;
  // ...
}

export interface RiskAssessment {
  id: string;
  date: string;
  // ...
}
