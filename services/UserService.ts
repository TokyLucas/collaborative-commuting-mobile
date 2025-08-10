export default class UserService {
    static API_URL: string = process.env.EXPO_PUBLIC_API_BASEURL || '';

    public static async signUp(creds: any): Promise<any> {
        const response = await fetch(`${this.API_URL}/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: creds,
        });
        
        const data = await response.json();

        if (!response.ok) {
            const error = new Error();

            let fields: any = data.fields || [];
            let fieldskv: any = {};
            fields.forEach((item: any) => {
                const [key, ...rest] = item.split(':');
                fieldskv[key.trim()] = rest.join(':').trim();
            });

            (error as any).fields = fieldskv;
            (error as any).message = data.message;
            throw error;
        }

        return data;
    }

    public static async getUserById(token: any): Promise<any> {
        return fetch(`${this.API_URL}/api/users/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });
    }

    public static async patchProfilePicture(userId: any, token: any, profilePicture: any): Promise<any> {
        const data = new FormData();
        const originalAppend = data.append;

        data.append = function (key, value) {
            console.log('Appending key:', key, 'value:', value);
            return originalAppend.apply(this, arguments as any);
        };

        
        data.append('profile-picture', {
            uri: profilePicture,
            name: `${userId}-profile-picture.jpg`,
            type: this.extractMimeTypeFromBase64(profilePicture) || 'image/jpeg'
        } as any);
        console.log(data);
        return fetch(`${this.API_URL}/api/users/profile/picture/${userId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: data
        });
    }

    static extractMimeTypeFromBase64(base64String: string) {
        const match = base64String.match(/^data:(.*);base64,/);
        return match ? match[1] : null;
    };
}