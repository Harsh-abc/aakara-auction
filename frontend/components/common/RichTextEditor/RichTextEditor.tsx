"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Editor, EditorContent, useEditor, useEditorState } from "@tiptap/react";
import toast from "react-hot-toast";

import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Youtube from "@tiptap/extension-youtube";
import { CharacterCount } from "@tiptap/extensions";

import { cn } from "@/lib/utils";
import EditorToolbar from "./EditorToolbar";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Image with a left / center / right alignment, saved as data-align
const AlignedImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            align: {
                default: "center",
                parseHTML: (element) => element.getAttribute("data-align") || "center",
                renderHTML: (attributes) => ({ "data-align": attributes.align }),
            },
        };
    },
});

export type RichTextEditorVariant = "full" | "basic";

// "basic" = inline formatting, colors, links and lists only — for short text shown on cards.
// Leaving the block nodes out also strips them from pasted content.
const buildExtensions = (variant: RichTextEditorVariant, placeholder: string) => {
    const basic = variant === "basic";

    return [
        StarterKit.configure({
            heading: basic ? false : { levels: [1, 2, 3, 4] },
            code: basic ? false : undefined,
            blockquote: basic ? false : undefined,
            codeBlock: basic ? false : undefined,
            horizontalRule: basic ? false : undefined,
            link: {
                openOnClick: false,
                autolink: true,
                defaultProtocol: "https",
            },
        }),
        Placeholder.configure({ placeholder }),
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        Subscript,
        Superscript,
        CharacterCount,
        ...(basic
            ? []
            : [
                  FontSize,
                  TextAlign.configure({ types: ["heading", "paragraph"] }),
                  AlignedImage.configure({
                      inline: false,
                      allowBase64: false,
                      resize: {
                          enabled: true,
                          directions: ["top-left", "top-right", "bottom-left", "bottom-right"],
                          minWidth: 60,
                          minHeight: 40,
                          alwaysPreserveAspectRatio: true,
                      },
                  }),
                  Table.configure({ resizable: true }),
                  TableRow,
                  TableHeader,
                  TableCell,
                  Youtube.configure({
                      nocookie: true,
                      modestBranding: true,
                      width: 640,
                      height: 360,
                  }),
              ]),
    ];
};

interface RichTextEditorProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    /** "full" (default) or "basic" — formatting, colors, links and lists only */
    variant?: RichTextEditorVariant;
    /** Uploads an image and resolves to its public URL. Without it, images can only be inserted by URL. */
    onImageUpload?: (file: File) => Promise<string>;
    maxImageSizeMB?: number;
}

export default function RichTextEditor({
    value = "",
    onChange,
    placeholder = "Enter a detailed description...",
    disabled = false,
    className,
    variant = "full",
    onImageUpload: onImageUploadProp,
    maxImageSizeMB = 10,
}: RichTextEditorProps) {
    const isBasic = variant === "basic";
    const onImageUpload = isBasic ? undefined : onImageUploadProp;

    const [uploadingCount, setUploadingCount] = useState(0);
    const [fullscreen, setFullscreen] = useState(false);

    // paste/drop handlers are bound once when the editor is created — read the latest props via refs
    const editorRef = useRef<Editor | null>(null);
    const uploadRef = useRef(onImageUpload);
    const maxSizeRef = useRef(maxImageSizeMB);
    useEffect(() => {
        uploadRef.current = onImageUpload;
        maxSizeRef.current = maxImageSizeMB;
    }, [onImageUpload, maxImageSizeMB]);

    /** Uploads the images one by one and inserts each at `pos` (drop) or the cursor */
    const insertImages = useCallback(async (files: File[], pos?: number) => {
        const upload = uploadRef.current;
        if (!upload) {
            toast.error("Image upload isn't available here — insert the image by URL");
            return;
        }

        let insertAt = pos;
        for (const file of files) {
            if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                toast.error(`"${file.name}" isn't a JPG, PNG, WEBP or GIF image`);
                continue;
            }
            if (file.size > maxSizeRef.current * 1024 * 1024) {
                toast.error(`"${file.name}" is larger than ${maxSizeRef.current}MB`);
                continue;
            }

            setUploadingCount((n) => n + 1);
            try {
                const src = await upload(file);
                const editor = editorRef.current;
                if (!editor || editor.isDestroyed) return;

                const image = { type: "image", attrs: { src, alt: "" } };
                if (insertAt !== undefined) {
                    // the doc may have changed while uploading
                    editor.chain().focus().insertContentAt(Math.min(insertAt, editor.state.doc.content.size), image).run();
                    insertAt = undefined; // the rest follow the first one
                } else {
                    editor.chain().focus().insertContent(image).run();
                }
            } catch (error) {
                console.error("Editor image upload failed:", error);
                toast.error(`Couldn't upload "${file.name}"`);
            } finally {
                setUploadingCount((n) => n - 1);
            }
        }
    }, []);

    const editor = useEditor({
        extensions: buildExtensions(variant, placeholder),

        content: value,

        editable: !disabled,

        editorProps: {
            handlePaste: (_view, event) => {
                const files = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
                if (!files.length || isBasic) return false;
                insertImages(files);
                return true;
            },
            handleDrop: (view, event, _slice, moved) => {
                if (moved || isBasic) return false; // dragging content around inside the editor
                const files = Array.from(event.dataTransfer?.files ?? []).filter((f) => f.type.startsWith("image/"));
                if (!files.length) return false;
                event.preventDefault();
                const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
                insertImages(files, pos);
                return true;
            },
        },

        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML());
        },

        immediatelyRender: false,
    });

    useEffect(() => {
        editorRef.current = editor;
    }, [editor]);

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

    // Esc leaves full screen; lock page scroll behind it
    useEffect(() => {
        if (!fullscreen) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setFullscreen(false);
        };
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [fullscreen]);

    const counts = useEditorState({
        editor,
        selector: ({ editor }) =>
            editor
                ? {
                      words: editor.storage.characterCount.words() as number,
                      characters: editor.storage.characterCount.characters() as number,
                  }
                : { words: 0, characters: 0 },
    });

    if (!editor) {
        return null;
    }

    return (
        <div
            className={cn(
                "flex flex-col overflow-hidden rounded-lg border border-input bg-white",
                fullscreen && "fixed inset-4 z-50 shadow-2xl",
                disabled && "cursor-not-allowed opacity-50",
                className
            )}
        >
            <EditorToolbar
                editor={editor}
                disabled={disabled}
                variant={variant}
                onUploadImages={onImageUpload ? (files) => insertImages(files) : undefined}
                uploadingCount={uploadingCount}
                fullscreen={fullscreen}
                onToggleFullscreen={() => setFullscreen((f) => !f)}
            />

            {/* Editor */}
            <EditorContent
                editor={editor}
                className={cn(
                    "rich-text px-4 py-3 text-sm text-slate-700",
                    fullscreen
                        ? "flex-1 overflow-y-auto"
                        : isBasic
                          ? "max-h-60 overflow-y-auto [&_.ProseMirror]:min-h-16"
                          : "max-h-150 min-h-40 overflow-y-auto"
                )}
            />

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-input px-3 py-1.5 text-[11px] text-slate-400">
                <span>
                    {uploadingCount > 0
                        ? `Uploading ${uploadingCount} image${uploadingCount === 1 ? "" : "s"}…`
                        : onImageUpload
                          ? "Paste or drop images anywhere in the text"
                          : ""}
                </span>
                <span>
                    {counts?.words ?? 0} words · {counts?.characters ?? 0} characters
                </span>
            </div>
        </div>
    );
}
