"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";

import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    Link as LinkIcon,
    Undo2,
    Redo2,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface RichTextEditorProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export default function RichTextEditor({
    value = "",
    onChange,
    placeholder = "Enter a detailed description...",
    disabled = false,
    className,
}: RichTextEditorProps) {

    const editor = useEditor({
        extensions: [
            StarterKit,

            Underline,

            Link.configure({
                openOnClick: false,
            }),

            Placeholder.configure({
                placeholder,
            }),
        ],

        content: value,

        editable: !disabled,

        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML());
        },

        immediatelyRender: false,
    });

    // Keep editor synchronized with external value changes
    useEffect(() => {
        if (!editor) return;

        if (value !== editor.getHTML()) {
            editor.commands.setContent(value || "");
        }
    }, [value, editor]);

    // Keep editable state synchronized
    useEffect(() => {
        if (!editor) return;

        editor.setEditable(!disabled);
    }, [disabled, editor]);

    if (!editor) {
        return null;
    }

    return (
        <div
            className={cn(
                "overflow-hidden rounded-lg border border-input bg-white",
                disabled && "cursor-not-allowed opacity-50",
                className
            )}
        >

            {/* Toolbar */}
            <div className="flex items-center gap-1 border-b border-input px-3 py-2">

                {/* Bold */}
                <button
                    type="button"
                    aria-label="Bold"
                    disabled={disabled}
                    onClick={() =>
                        editor.chain().focus().toggleBold().run()
                    }
                    className={cn(
                        "rounded p-1.5 hover:bg-slate-100",
                        editor.isActive("bold") && "bg-slate-100"
                    )}
                >
                    <Bold className="h-4 w-4" />
                </button>

                {/* Italic */}
                <button
                    type="button"
                    aria-label="Italic"
                    disabled={disabled}
                    onClick={() =>
                        editor.chain().focus().toggleItalic().run()
                    }
                    className={cn(
                        "rounded p-1.5 hover:bg-slate-100",
                        editor.isActive("italic") && "bg-slate-100"
                    )}
                >
                    <Italic className="h-4 w-4" />
                </button>

                {/* Underline */}
                <button
                    type="button"
                    aria-label="Underline"
                    disabled={disabled}
                    onClick={() =>
                        editor.chain().focus().toggleUnderline().run()
                    }
                    className={cn(
                        "rounded p-1.5 hover:bg-slate-100",
                        editor.isActive("underline") && "bg-slate-100"
                    )}
                >
                    <UnderlineIcon className="h-4 w-4" />
                </button>

                {/* Divider */}
                <div className="mx-1 h-5 w-px bg-slate-200" />

                {/* Bullet List */}
                <button
                    type="button"
                    aria-label="Bullet list"
                    disabled={disabled}
                    onClick={() =>
                        editor.chain().focus().toggleBulletList().run()
                    }
                    className={cn(
                        "rounded p-1.5 hover:bg-slate-100",
                        editor.isActive("bulletList") && "bg-slate-100"
                    )}
                >
                    <List className="h-4 w-4" />
                </button>

                {/* Ordered List */}
                <button
                    type="button"
                    aria-label="Ordered list"
                    disabled={disabled}
                    onClick={() =>
                        editor.chain().focus().toggleOrderedList().run()
                    }
                    className={cn(
                        "rounded p-1.5 hover:bg-slate-100",
                        editor.isActive("orderedList") && "bg-slate-100"
                    )}
                >
                    <ListOrdered className="h-4 w-4" />
                </button>

                {/* Divider */}
                <div className="mx-1 h-5 w-px bg-slate-200" />

                {/* Link */}
                <button
                    type="button"
                    aria-label="Add link"
                    disabled={disabled}
                    onClick={() => {
                        const previousUrl =
                            editor.getAttributes("link").href;

                        const url = window.prompt(
                            "Enter URL",
                            previousUrl || ""
                        );

                        if (url === null) return;

                        if (url === "") {
                            editor
                                .chain()
                                .focus()
                                .extendMarkRange("link")
                                .unsetLink()
                                .run();

                            return;
                        }

                        editor
                            .chain()
                            .focus()
                            .extendMarkRange("link")
                            .setLink({
                                href: url,
                            })
                            .run();
                    }}
                    className={cn(
                        "rounded p-1.5 hover:bg-slate-100",
                        editor.isActive("link") && "bg-slate-100"
                    )}
                >
                    <LinkIcon className="h-4 w-4" />
                </button>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Undo */}
                <button
                    type="button"
                    aria-label="Undo"
                    disabled={disabled || !editor.can().undo()}
                    onClick={() =>
                        editor.chain().focus().undo().run()
                    }
                    className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-40"
                >
                    <Undo2 className="h-4 w-4" />
                </button>

                {/* Redo */}
                <button
                    type="button"
                    aria-label="Redo"
                    disabled={disabled || !editor.can().redo()}
                    onClick={() =>
                        editor.chain().focus().redo().run()
                    }
                    className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-40"
                >
                    <Redo2 className="h-4 w-4" />
                </button>

            </div>

            {/* Editor */}
            <EditorContent
                editor={editor}
                className="
                    min-h-[120px]
                    px-3
                    py-3
                    text-sm
                    text-slate-700
                "
            />

        </div>
    );
}