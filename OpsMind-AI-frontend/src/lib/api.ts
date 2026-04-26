/**
 * Single source of truth for the backend API base URL.
 *
 * Set VITE_API_BASE in your environment file to override:
 *   .env.development  → VITE_API_BASE=http://localhost:5000
 *   .env.staging      → VITE_API_BASE=https://api-staging.opsmind.example.com
 *   .env.production   → VITE_API_BASE=https://api.opsmind.example.com
 *
 * Falls back to localhost:5000 when the variable is not set.
 */
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? 'http://localhost:5000';

export interface AskPayload {
	query: string;
	chatHistory?: { role: 'user' | 'assistant'; content: string }[];
	file?: string;
}

export interface AskApiResponse {
	answer: string;
	sources: Array<{
		index: number;
		source: string[];
		score: string;
		snippet?: string;
	}>;
}

async function parseResponse<T>(res: Response): Promise<T> {
	const data = await res.json().catch(() => null);

	if (!res.ok) {
		const message = data?.error || data?.message || `Request failed (${res.status})`;
		throw new Error(message);
	}

	return data as T;
}

export async function askQuestion(
	payload: AskPayload,
	options?: { token?: string; signal?: AbortSignal }
): Promise<AskApiResponse> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	};

	if (options?.token) {
		headers.Authorization = `Bearer ${options.token}`;
	}

	const res = await fetch(`${API_BASE}/ask`, {
		method: 'POST',
		headers,
		body: JSON.stringify(payload),
		signal: options?.signal
	});

	return parseResponse<AskApiResponse>(res);
}

export async function uploadPDF(file: File, token?: string): Promise<{ success: boolean; totalChunksStored?: number; error?: string }> {
	const formData = new FormData();
	formData.append('pdf', file);

	const headers: Record<string, string> = {};
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	const res = await fetch(`${API_BASE}/upload`, {
		method: 'POST',
		body: formData,
		headers
	});

	return parseResponse<{ success: boolean; totalChunksStored?: number; error?: string }>(res);
}
