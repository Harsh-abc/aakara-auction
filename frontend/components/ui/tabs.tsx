"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

function Tabs({ className, orientation = "horizontal", ...props }: TabsPrimitive.Root.Props) {
    return <TabsPrimitive.Root data-slot="tabs" data-orientation={orientation} className={cn("group/tabs flex gap-2 data-horizontal:flex-col", className)} {...props} />;
}

// flat list that sits on the section's bottom border (-mb-px), no pill background
const tabsListVariants = cva(
    "group/tabs-list -mb-px inline-flex w-fit items-center justify-start rounded-none bg-transparent p-0 text-[#717171] group-data-vertical/tabs:mb-0 group-data-vertical/tabs:-mr-px group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col group-data-vertical/tabs:items-stretch",
    {
        variants: {
            variant: {
                default: "",
                line: "",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);

function TabsList({ className, variant = "default", ...props }: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
    return <TabsPrimitive.List data-slot="tabs-list" data-variant={variant} className={cn(tabsListVariants({ variant }), className)} {...props} />;
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
    return (
        <TabsPrimitive.Tab
            data-slot="tabs-trigger"
            className={cn(
                // layout + type (matches the reference tab links)
                "relative inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-none border-0 bg-transparent px-4 text-[10px] font-normal uppercase tracking-[0.16em] whitespace-nowrap text-[#717171] outline-none transition-colors duration-200 sm:px-5 group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start",
                // hover + active
                "hover:text-[#0d0d0d] data-active:bg-[#fdedd6] data-active:text-[#0d0d0d]",
                // gold underline: slides in from the left (horizontal) / fades in on the right edge (vertical)
                "after:absolute after:bg-[#d0a55d] after:transition-[transform,opacity] after:duration-300",
                "group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:-bottom-px group-data-horizontal/tabs:after:h-0.5 group-data-horizontal/tabs:after:origin-left group-data-horizontal/tabs:after:scale-x-0 group-data-horizontal/tabs:data-active:after:scale-x-100",
                "group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-px group-data-vertical/tabs:after:w-0.5 group-data-vertical/tabs:after:opacity-0 group-data-vertical/tabs:data-active:after:opacity-100",
                // focus + disabled + icons
                "focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-[#0d0d0d] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...props}
        />
    );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
    return <TabsPrimitive.Panel data-slot="tabs-content" className={cn("flex-1 text-sm outline-none", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
