export interface PatientData {
  nome: string;
  idade: string;
  sexo: 'M' | 'F' | '';
  peso: string;
  altura: string;
}

export interface VitalSigns {
  pa: string;
  fc: string;
  fr: string;
  sat: string;
  tax: string;
}

export interface HppData {
  alergias: string;
  comorbidades: string;
  muc: string;
  cirurgias: string;
  tabagismo: string;
  etilismo: string;
}

export interface AIResult {
  hmaSuggestion?: string;
  hmaMissingQuestions?: string[];
  physicalExamSuggestion?: string;
  physicalExamMissingManeuvers?: string[];
  mainHypothesis?: string;
  differentialDiagnoses?: string[];
  cidRankings?: Array<{ cid: string; desc: string; prob: string }>;
  isCompulsoryNotification?: boolean;
  compulsoryDetails?: string;
  clinicalScores?: Array<{ name: string; score: string; interpretation: string }>;
  unitMedications?: string[];
  homeMedications?: string[];
  medicationDisclaimers?: Array<{ med: string; type: 'warning' | 'contraindication' | 'info'; note: string }>;
  tetanusRabiesAlert?: string;
  orderedLabs?: string;
  orderedImages?: string;
  clinicalOutcome?: 'alta' | 'observacao' | 'internacao' | 'transferencia';
  outcomeReason?: string;
  referralNeeded?: boolean;
  referralReason?: string;
  medicalLeaveNeeded?: boolean;
  medicalLeaveDays?: string;
  medicalLeaveReason?: string;
  techOrientations?: string;
  layOrientations?: string;
  handoffOral?: string;
  passometer?: string;
  missingReevaluationChecks?: string[];
  reevaluationSuggestion?: string;
  conclusionHypothesisSuggestion?: string;
  newConductsSuggestion?: string;
}

export interface ObservationData {
  inObservation: boolean;
  startedAt?: string;
  revaluationTimeMinutes: number;
  whatToReevaluate: string;
  clinicalReevaluationText: string;
  conclusionNewHypothesis: string;
  newConducts: string;
}

export interface FinalDocuments {
  prontuario: string;
  receitaInterna: string;
  receitaDomiciliar: string;
  passagemPlantao: string;
  passometro: string;
  evolucao: string;
}

export interface SystemTemplates {
  hpp: string;
  exameFisico: string;
  prontuario: string;
  receitaInterna: string;
  receitaDomiciliar: string;
  passagemPlantao: string;
  passometro: string;
  evolucao: string;
  payloadCaso: string;
  payloadHma?: string;
  payloadExameFisico?: string;
  payloadDiagnostico?: string;
  payloadConduta?: string;
  payloadOrientacoes?: string;
  payloadPassagemPlantao?: string;
  payloadPassometro?: string;
  payloadReavaliacao?: string;
  payloadConclusaoObs?: string;
}

export interface SystemPrompts {
  hma: string;
  exameFisico: string;
  diagnostico: string;
  conduta: string;
  orientacoes: string;
  passagemPlantao: string;
  passometro: string;
  reavaliacao: string;
  conclusaoObs: string;
}

export interface SavedPatientRecord {
  id: string;
  savedAt: string;
  patient: PatientData;
  vitals: VitalSigns;
  qp: string;
  hma: string;
  hpp: HppData;
  exameFisico: string;
  examResults: string;
  condutas?: string;
  aiResults: AIResult;
  observation: ObservationData;
  documents: FinalDocuments;
}
