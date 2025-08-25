export default class DemandeService {
    static API_URL: string = process.env.EXPO_PUBLIC_API_BASEURL || '';
  
    public static async createDemande(dto: any, token: string): Promise<any> {
      return fetch(`${this.API_URL}/api/demandes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(dto),
      });
    }
  
    public static async getAll(token: string): Promise<any> {
      return fetch(`${this.API_URL}/api/demandes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    }
  
    public static async getById(id: string, token: string): Promise<any> {
      return fetch(`${this.API_URL}/api/demandes/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    }
    
    public static async getByUserId(userId: string, token: string): Promise<any> {
      return fetch(`${this.API_URL}/api/demandes/user/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    }
  }
  