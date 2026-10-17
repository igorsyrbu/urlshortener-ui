import {create} from 'zustand';
import {clearSessionHint} from '@/lib/session-hint';

export interface UserProfile {
    email: string;
    name: string;
    pictureUrl?: string;
}

interface AuthStore {
    accessToken: string | null;
    setAccessToken: (token: string | null) => void;
    user: UserProfile | null;
    setUser: (user: UserProfile | null) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
    accessToken: null,
    setAccessToken: (token) => set({accessToken: token}),
    user: null,
    setUser: (user) => set({user}),
    logout: () => {
        clearSessionHint();
        set({accessToken: null, user: null});
    },
}));
