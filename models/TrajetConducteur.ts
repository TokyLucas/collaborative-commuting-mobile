export interface TrajetConducteur {
  id: string;
  idConducteur: string;
  pointDepart: string;
  latDepart: number;
  lngDepart: number;
  pointArrivee: string;
  latArrivee: number;
  lngArrivee: number;
  heureDepartEstimee: string;
  placesDisponibles: number;
  placesDispoJournalier?: number | null;
  description: string;
  statut: string;
  actif: number;
  voitureId: string;
  jours?: number[] | null;
  dateDesactivationDebut?: string | null;
  dateDesactivationFin?: string | null;
}
