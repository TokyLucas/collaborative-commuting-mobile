export interface Demande {
    id: string;
    etudiantId: string;
    pointDepart: string;
    departLatitude: number;
    departLongitude: number;
    pointArrivee: string;
    arriveeLatitude: number;
    arriveeLongitude: number;    
    placeNeed: number; 
    tarif: number;
    heureDepartEstimee: string;
    statut: string;
    dateCreation: string;
    dateMiseAJour: string;
}
