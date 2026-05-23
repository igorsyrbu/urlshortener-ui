import React from "react"
import {CornerDownLeft} from "lucide-react"
import {cn} from "@/lib/utils"
import {Kbd} from "@/components/ui/kbd"

function EnterKbd({className, ...props}: React.ComponentProps<typeof Kbd>) {
    return (
        <Kbd
            className={cn(
                "hidden sm:inline-flex max-w-5.5 border-primary-foreground/20 bg-primary-foreground/20 text-primary-foreground",
                className
            )}
            {...props}
        >
            <CornerDownLeft className="h-3 w-3"/>
        </Kbd>
    )
}

export {EnterKbd}
