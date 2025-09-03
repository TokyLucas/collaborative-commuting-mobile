// services/CarService.ts
import { Car } from "@/models/Car";

type CreateCarPayload = Omit<Car, "id" | "createdAt" | "updateAt">;

export default class CarService {
  static API_URL: string = process.env.EXPO_PUBLIC_API_BASEURL || "";

  private static headers(token?: string): HeadersInit {
    const h: HeadersInit = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }

  private static async handle<T>(res: Response): Promise<T> {
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (data as any)?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data as T;
  }
  public static async getUserCars(userId: string, token: string): Promise<Car[]> {
    const response = await fetch(`${this.API_URL}/api/users/${userId}/cars`, {
      method: "GET",
      headers: this.headers(token),
    });
    return this.handle<Car[]>(response);
  }

  public static async getById(id: string, token?: string): Promise<Car> {
    const res = await fetch(`${this.API_URL}/api/users/${id}/car`, {
      method: "GET",
      headers: this.headers(token),
    });
    return this.handle<Car>(res);
  }
}
