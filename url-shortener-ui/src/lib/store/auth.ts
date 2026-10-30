import {create} from 'zustand';
import {clearSessionHint} from '@/lib/session-hint';

/** The in-memory access token. The signed-in user's profile is server state: see `useCurrentUser`. */
interface AuthStore {
    accessToken: string | null;
    setAccessToken: (token: string | null) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
    accessToken: null,
    setAccessToken: (token) => set({accessToken: token}),
    logout: () => {
        clearSessionHint();
        set({accessToken: null});
    },
}));
