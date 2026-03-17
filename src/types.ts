import { IClientOptions } from 'mqtt';

export interface BrokerConfig {
  id: string;
  name: string;
  url: string;
  clientId: string;
  username?: string;
  password?: string;
}
