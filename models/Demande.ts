export interface Demande {
    id: string;
    etudiantId: string;
    pointDepart: string;
    departLatitude: number;
    departLongitude: number;
    pointArrivee: string;
    arriveeLatitude: number;
    arriveeLongitude: number;    
    nbPlaces: number; 
    tarif: number;
    heureArriveeEstimee: string;
    statut: string;
    dateCreation: string;
    dateMiseAJour: string;
}