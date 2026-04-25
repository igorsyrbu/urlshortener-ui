"use client";

import {motion} from "framer-motion";
import {Loader2} from "lucide-react";

export function CreateLinkModalLoading() {
    return (
        <motion.div
            key="loading"
            initial={{opacity: 0, scale: 0.95}}
            animate={{opacity: 1, scale: 1}}
            exit={{opacity: 0, scale: 0.95}}
            transition={{duration: 0.2}}
            className="flex h-[200px] flex-col items-center justify-center p-12 text-center"
        >
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary"/>
            <h3 className="text-lg font-medium">Creating short link...</h3>
            <p className="mt-1 text-sm text-muted-foreground">Please wait a moment</p>
        </motion.div>
    );
}
