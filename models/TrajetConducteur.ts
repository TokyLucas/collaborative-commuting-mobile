export interface TrajetConducteur {
    id: string;
    idConducteur: string;
    pointDepart: string;
    latDepart: number;
    lngDepart: number;
    pointArrivee: string;
    latArrivee: number;
    lngArrivee: number;
    heureDepartEstimee: string; // ISO string format (ex: "2025-08-03T14:30:00")
    placesDisponibles: number;
    description: string;
    statut: string;
}
