import {create} from 'zustand';

interface UIStore {
    isCreateModalOpen: boolean;
    setCreateModalOpen: (isOpen: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
    isCreateModalOpen: false,
    setCreateModalOpen: (isOpen) => set({isCreateModalOpen: isOpen}),
}));
