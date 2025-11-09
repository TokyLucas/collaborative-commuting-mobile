import axios from "axios";


export default class DemandeService {
    static API_URL = process.env.EXPO_PUBLIC_API_BASEURL || '';

     public static async getAcceptedDemande(userId: string, token: any) {
        try {
            const response = await axios.get(
                `${this.API_URL}/api/demandes/accepted/${userId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            if (response.status === 200) return response.data;
            return null;
        } catch (error) {
            return null;
        }
    }
}


