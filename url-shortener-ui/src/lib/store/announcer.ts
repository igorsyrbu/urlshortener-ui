import {create} from "zustand";

interface AnnouncerState {
    message: string;
    /** Changes on every announcement, so repeating the same text is announced again. */
    sequence: number;
    announce: (message: string) => void;
}

export const useAnnouncerStore = create<AnnouncerState>((set) => ({
    message: "",
    sequence: 0,
    announce: (message) => set((state) => ({message, sequence: state.sequence + 1})),
}));

/** Reads a short confirmation to screen-reader users (e.g. "Copied") through the app's polite live region. */
export function announce(message: string): void {
    useAnnouncerStore.getState().announce(message);
}
