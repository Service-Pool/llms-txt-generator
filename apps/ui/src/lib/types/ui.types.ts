/**
 * UI Progress Event
 */
export interface ProgressEvent {
	current: number;
	total: number;
	message: string;
}

/**
 * UI Error Information
 */
export interface ErrorInfo {
	message: string;
	recoverable: boolean;
	timestamp: number;
}
