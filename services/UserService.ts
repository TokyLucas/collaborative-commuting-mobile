export default class UserService {
    static API_URL: string = process.env.EXPO_PUBLIC_API_BASEURL || '';

    public static async getUserById(userId: any, token: any): Promise<any> {
        return fetch(`${this.API_URL}/api/users/profile/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });
    }

    public static async getNearbyUsers(
        region: Region,
        token: string
      ): Promise<Response> {
        const { latitude, longitude } = region;
        const params = new URLSearchParams({
          lat: String(latitude),
          lng: String(longitude),
          radius: '30000',
        });

        return fetch(`${this.API_URL}/api/users/nearby?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      }
}