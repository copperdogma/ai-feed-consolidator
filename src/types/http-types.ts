export interface HttpResponse {
  status: number;
  statusText: string;
  ok: boolean;
  headers: Headers;
  text(): Promise<string>;
  usedFallback?: boolean;
  error?: {
    name?: string;
    code?: string;
  };
}

export interface Headers {
  get(name: string): string | null;
  [key: string]: any;
} 