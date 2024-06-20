export interface Player {
  name: string;
  score: number;
}

export enum GameModes {
  JOB_INTERVIEW = "Job Interview",
}

export interface Vote {
  from: string;
  anwer: string;
}

export enum JobInterviewGameStages {
  /** fetch a job from propmt endpoint and display it*/
  DISPLAY_JOB,
  /** Players create one interview question each, store them for later */
  CREATE_QUESTIONS,
  /** 2 players answer one of the question, first round of answers */
  FIRST_ROUND_ANSWERS,
  /** Display the questions and players vote on which answer is better*/
  FIRST_VOTE,
  /** 2 players answer the other question, second round of answers */
  SECOND_ROUND_ANSWERS,
  /** Display the questions and players vote on which answer is better*/
  SECOND_VOTE,
  /** Display the winner and scores */
  DISPLAY_WINNER,
}

export interface JobInterviewQuestion {
  question: string;
  from: string;
}

export interface JobInterviewAnswer {
  toQuestion: string;
  answer: string;
  from: string;
}

export interface JobInterviewGameMode {
  players: Player[];
  stage: JobInterviewGameStages;
  job: string;
  questions: JobInterviewQuestion[];
  firstAnswers: JobInterviewAnswer[];
  secondAnswers: JobInterviewAnswer[];
}
