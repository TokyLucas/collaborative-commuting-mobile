export interface User {
    id: string;
    lastName: String;
    firstName: String;
    birthDate: Date;
    gender: String;
    email: String;
    profilePicture?: string;
    type: String;
    createdAt: Date;
    updatedAt: Date;
}