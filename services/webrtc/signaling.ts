type Msg =
  | { type: 'register'; userId: string }
  | { type: 'registered'; userId: string }
  | { type: 'offer'; from: string; to: string; sdp: string }
  | { type: 'answer'; from: string; to: string; sdp: string }
  | { type: 'ice-candidate'; from: string; to: string; candidate: any };

type Listener = (msg: Msg) => void;

class Signaling {
  private ws?: WebSocket;
  private listeners = new Set<Listener>();
  private url: string;

  constructor(url: string) { this.url = url; }

  connect(userId: string) {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => this.send({ type: 'register', userId });

    this.ws.onmessage = (ev) => {
      try { const msg = JSON.parse(ev.data) as Msg; this.listeners.forEach(l => l(msg)); }
      catch {}
    };
    this.ws.onclose = () => setTimeout(() => this.connect(userId), 1200);
  }

  on(cb: Listener) { this.listeners.add(cb); return () => this.listeners.delete(cb); }

  send(msg: Msg) {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(msg));
  }

  offer(to: string, sdp: string, from: string) {
    this.send({ type: 'offer', to, from, sdp });
  }
  answer(to: string, sdp: string, from: string) {
    this.send({ type: 'answer', to, from, sdp });
  }
  candidate(to: string, candidate: any, from: string) {
    this.send({ type: 'ice-candidate', to, from, candidate });
  }
}

const SIGNAL_URL = process.env.EXPO_PUBLIC_SIGNAL_URL || 'ws://<YOUR_HOST_OR_IP>:8080';
export const signaling = new Signaling(SIGNAL_URL);
