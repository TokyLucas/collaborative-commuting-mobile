export default class DemandeService {
    static API_URL: string = process.env.EXPO_PUBLIC_API_BASEURL || '';
  
    private static getHeaders(token: string) {
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    }
  
    public static async createDemande(dto: any, token: string): Promise<any> {
      const response = await fetch(`${this.API_URL}/api/demandes`, {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify(dto),
      });
  
      if (!response.ok) {
        throw new Error(`Erreur lors de la création de la demande (${response.status})`);
      }
  
      return response.json();
    }
  
    public static async getAll(token: string): Promise<any> {
      const response = await fetch(`${this.API_URL}/api/demandes`, {
        method: 'GET',
        headers: this.getHeaders(token),
      });
  
      if (!response.ok) {
        throw new Error(`Erreur lors du chargement des demandes (${response.status})`);
      }
  
      return response.json();
    }
  
    public static async getById(id: string, token: string): Promise<any> {
      const response = await fetch(`${this.API_URL}/api/demandes/${id}`, {
        method: 'GET',
        headers: this.getHeaders(token),
      });
  
      if (!response.ok) {
        throw new Error(`Demande non trouvée (${response.status})`);
      }
  
      return response.json();
    }
  
    public static async getByPassagerId(passagerId: string, token: string): Promise<any> {
      const response = await fetch(`${this.API_URL}/api/demandes/passager/${passagerId}`, {
        method: 'GET',
        headers: this.getHeaders(token),
      });
  
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des demandes du passager (${response.status})`);
      }
  
      return response.json();
    }
  
    public static async getMatching(demandeId: string, token: string): Promise<any> {
      const response = await fetch(`${this.API_URL}/api/demandes/match/${demandeId}`, {
        method: 'GET',
        headers: this.getHeaders(token),
      });
  
      if (!response.ok) {
        throw new Error(`Erreur lors du matching (${response.status})`);
      }
  
      return response.json();
    }
  }
  