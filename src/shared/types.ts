export interface Nip05Record {
  name: string;
  pubkey: string;
  relays: string[];
  lightning_address: string | null;
  created_at: number;
  updated_at: number;
}

export interface Nip05Response {
  names: Record<string, string>;
  relays?: Record<string, string[]>;
}

export interface LnurlPayResponse {
  status: string;
  tag: 'payRequest';
  commentAllowed?: number;
  callback: string;
  metadata: string;
  minSendable: number;
  maxSendable: number;
  payerData?: {
    name?: { mandatory?: boolean };
    email?: { mandatory?: boolean };
    pubkey?: { mandatory?: boolean };
    auth?: { mandatory?: boolean; k1?: string };
  };
  nostrPubkey?: string;
  allowsNostr?: boolean;
}

export interface RegisterRequest {
  name: string;
  relays: string[];
  lightning_address?: string | null;
  turnstile_token?: string;
}

export interface UpdateProfileRequest {
  relays: string[];
  lightning_address?: string | null;
  turnstile_token?: string;
}

export interface CheckNameResponse {
  available: boolean;
  name: string;
  reason?: string;
}

export interface ProfileResponse {
  registered: boolean;
  record?: Nip05Record;
}
