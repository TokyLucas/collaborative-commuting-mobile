export interface Demande {
    _id: string;                
  
    etudiantId: string;
    trajetId: string;
    conducteurId: string;
  
    pointDepart: string;
    departLatitude: number;
    departLongitude: number;
  
    pointArrivee: string;
    arriveeLatitude: number;
    arriveeLongitude: number;
  
    nbPlaces: number;
    tarif: number;
  
    heureArriveeEstimee: string;  
    statut: "EN_ATTENTE" | "ACCEPTEE" | "ANNULEE" | "TERMINEE";
  
    dateCreation: string;         
    dateMiseAJour?: string;      
  }

  export interface DemandeRequest {
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
  }
  