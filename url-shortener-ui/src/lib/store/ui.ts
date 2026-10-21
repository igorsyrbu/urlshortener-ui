import {create} from 'zustand';

interface UIStore {
    isCreateModalOpen: boolean;
    setCreateModalOpen: (isOpen: boolean) => void;
    isCreateTagModalOpen: boolean;
    setCreateTagModalOpen: (isOpen: boolean) => void;
    isShortcutsDialogOpen: boolean;
    setShortcutsDialogOpen: (isOpen: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
    isCreateModalOpen: false,
    setCreateModalOpen: (isOpen) => set({isCreateModalOpen: isOpen}),
    isCreateTagModalOpen: false,
    setCreateTagModalOpen: (isOpen) => set({isCreateTagModalOpen: isOpen}),
    isShortcutsDialogOpen: false,
    setShortcutsDialogOpen: (isOpen) => set({isShortcutsDialogOpen: isOpen}),
}));
