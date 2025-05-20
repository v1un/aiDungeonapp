export interface Message {
  id: string;
  sender: 'player' | 'ai';
  text: string;
  timestamp: number;
}
