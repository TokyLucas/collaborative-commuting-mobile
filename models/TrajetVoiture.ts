import { Car } from "./Car";

export interface TrajetVoiture {
  id: string;
  pointDepart: string;
  latDepart?: number;
  lngDepart?: number;
  pointArrivee: string;
  latArrivee?: number;
  lngArrivee?: number;

  
  heureDepartEstimee: string;

  placesDisponibles: number;
  description?: string;
  statut: string;
  actif: number;

  voitureId: string;
  car?: Car;     
}
