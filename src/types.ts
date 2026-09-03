import { IClientOptions } from 'mqtt';

export interface BrokerConfig {
  id: string;
  name: string;
  url?: string; // Legacy support
  protocol: string;
  host: string;
  port: number;
  path: string;
  clientId: string;
  username?: string;
  password?: string;
  subscriptions?: string[];
  favoriteTopics?: string[];
}

export interface SavedHost {
  id: string;
  alias: string;
  host: string;
}

export interface SavedCredential {
  id: string;
  alias: string;
  username?: string;
  password?: string;
}
