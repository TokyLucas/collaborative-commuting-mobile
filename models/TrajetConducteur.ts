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
    description: string;
    statut: string;
    actif: number;
    marque: string;
    type: string;
    couleur: string;
}
