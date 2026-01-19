import type { ClsStore } from 'nestjs-cls';

interface UserClsStore extends ClsStore {
	userId: number | null;
	sessionId: string;
}

export { type UserClsStore };
