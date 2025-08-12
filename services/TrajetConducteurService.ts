export default class TrajetConducteurService {
    static API_URL: string = process.env.EXPO_PUBLIC_API_BASEURL || '';

    public static async createTrajet(dto: any, token: string): Promise<any> {
        return fetch(`${this.API_URL}/api/trajetC/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(dto),
        });
    }

    public static async getAll(token: string): Promise<any> {
        return fetch(`${this.API_URL}/api/trajetC/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
    }
}