import type {ReactNode} from "react";

interface MetadataOnlyLayoutProps {
    children: ReactNode;
}

/** Server layout that renders its page unchanged; route folders re-export it to attach `metadata` to a client page. */
export function MetadataOnlyLayout({children}: MetadataOnlyLayoutProps): ReactNode {
    return children;
}
