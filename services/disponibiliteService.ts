import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
  },
});

export interface Disponibilite {
  id: string;
  statut: 'AVAILABLE' | 'UNAVAILABLE';
  position: { type: string; coordinates: [number, number] };
  conducteurId: string;
}

export const fetchNearbyDisponibilites = async (
  latitude: number,
  longitude: number,
  radiusMeters: number = 30000
): Promise<Disponibilite[]> => {
  const response = await api.get<Disponibilite[]>(
    `/disponibilites/nearby?lat=${latitude}&lng=${longitude}&radiusMeters=${radiusMeters}`
  );
  return response.data;
};
