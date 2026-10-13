"use client";

import { useRef, useState } from "react";
import { Editor, useEditorState } from "@tiptap/react";
import {
    Baseline,
    Bold,
    Code,
    CodeXml,
    Grid2x2Plus,
    Highlighter,
    ImagePlus,
    Italic,
    Link as LinkIcon,
    List,
    ListOrdered,
    LoaderCircle,
    Maximize2,
    Minimize2,
    Minus,
    Quote,
    Redo2,
    RemoveFormatting,
    Strikethrough,
    Subscript,
    Superscript,
    TextAlignCenter,
    TextAlignEnd,
    TextAlignJustify,
    TextAlignStart,
    Trash,
    Underline,
    Undo2,
    Unlink,
    Upload,
    Video,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { InlineInputForm, MenuItem, ToolbarButton, ToolbarDivider, ToolbarDropdown } from "./ToolbarPrimitives";
import type { RichTextEditorVariant } from "./RichTextEditor";

const ICON = "h-4 w-4";

const BLOCK_TYPES = [
    { label: "Paragraph", level: 0, className: "text-sm" },
    { label: "Heading 1", level: 1, className: "text-xl font-semibold" },
    { label: "Heading 2", level: 2, className: "text-lg font-semibold" },
    { label: "Heading 3", level: 3, className: "text-base font-semibold" },
    { label: "Heading 4", level: 4, className: "text-sm font-semibold" },
] as const;

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "30px", "36px"];

const TEXT_COLORS = [
    "#0f172a", "#475569", "#94a3b8", "#7A3D5E", "#b91c1c", "#c2410c",
    "#a16207", "#15803d", "#0e7490", "#1d4ed8", "#6d28d9", "#be185d",
];

const HIGHLIGHT_COLORS = [
    "#fef08a", "#fde68a", "#fed7aa", "#fecaca", "#fbcfe8", "#fce8f1",
    "#e9d5ff", "#c7d2fe", "#bfdbfe", "#a5f3fc", "#bbf7d0", "#e2e8f0",
];

const ALIGNMENTS = [
    { value: "left", label: "Align left", Icon: TextAlignStart },
    { value: "center", label: "Align center", Icon: TextAlignCenter },
    { value: "right", label: "Align right", Icon: TextAlignEnd },
    { value: "justify", label: "Justify", Icon: TextAlignJustify },
] as const;

const IMAGE_ALIGNMENTS = [
    { value: "left", label: "Image left", Icon: TextAlignStart },
    { value: "center", label: "Image center", Icon: TextAlignCenter },
    { value: "right", label: "Image right", Icon: TextAlignEnd },
] as const;

const normalizeUrl = (url: string) => (/^(https?:|mailto:|tel:|\/|#)/i.test(url) ? url : `https://${url}`);

interface EditorToolbarProps {
    editor: Editor;
    disabled?: boolean;
    variant: RichTextEditorVariant;
    // undefined → images can only be inserted by URL
    onUploadImages?: (files: File[]) => void;
    uploadingCount: number;
    fullscreen: boolean;
    onToggleFullscreen: () => void;
}

export default function EditorToolbar({
    editor,
    disabled,
    variant,
    onUploadImages,
    uploadingCount,
    fullscreen,
    onToggleFullscreen,
}: EditorToolbarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    // "basic" has no headings, sizes, alignment, blocks, media or tables (see buildExtensions)
    const full = variant === "full";

    // Tiptap v3 doesn't re-render on every transaction — subscribe to what the toolbar shows
    const state = useEditorState({
        editor,
        selector: ({ editor }) => ({
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            underline: editor.isActive("underline"),
            strike: editor.isActive("strike"),
            code: editor.isActive("code"),
            subscript: editor.isActive("subscript"),
            superscript: editor.isActive("superscript"),
            bulletList: editor.isActive("bulletList"),
            orderedList: editor.isActive("orderedList"),
            blockquote: editor.isActive("blockquote"),
            codeBlock: editor.isActive("codeBlock"),
            headingLevel: [1, 2, 3, 4].find((level) => editor.isActive("heading", { level })) ?? 0,
            align:
                (["center", "right", "justify"] as const).find((a) => editor.isActive({ textAlign: a })) ?? "left",
            color: (editor.getAttributes("textStyle").color as string | undefined) ?? "",
            fontSize: (editor.getAttributes("textStyle").fontSize as string | undefined) ?? "",
            highlight: editor.isActive("highlight"),
            link: editor.isActive("link"),
            linkHref: (editor.getAttributes("link").href as string | undefined) ?? "",
            image: full && editor.isActive("image"),
            imageAlign: (editor.getAttributes("image").align as string | undefined) ?? "center",
            imageAlt: (editor.getAttributes("image").alt as string | undefined) ?? "",
            imageSrc: (editor.getAttributes("image").src as string | undefined) ?? "",
            table: full && editor.isActive("table"),
            // table commands only exist when the Table extension is loaded
            canMerge: full && editor.can().mergeCells(),
            canSplit: full && editor.can().splitCell(),
            canUndo: editor.can().undo(),
            canRedo: editor.can().redo(),
        }),
    });

    const chain = () => editor.chain().focus();
    const currentBlock = BLOCK_TYPES.find((b) => b.level === state.headingLevel) ?? BLOCK_TYPES[0];
    const CurrentAlignIcon = ALIGNMENTS.find((a) => a.value === state.align)?.Icon ?? TextAlignStart;

    return (
        <div className={cn("border-b border-input", disabled && "pointer-events-none")}>
            {/* ================= MAIN TOOLBAR ================= */}
            <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
                <ToolbarButton label="Undo (Ctrl+Z)" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
                    <Undo2 className={ICON} />
                </ToolbarButton>
                <ToolbarButton label="Redo (Ctrl+Shift+Z)" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
                    <Redo2 className={ICON} />
                </ToolbarButton>

                <ToolbarDivider />

                {full && (
                <>
                {/* Block type */}
                <ToolbarDropdown
                    label="Text style"
                    trigger={<span className="w-18 text-left text-xs font-medium">{currentBlock.label}</span>}
                    panelClassName="w-44"
                >
                    {(close) =>
                        BLOCK_TYPES.map((block) => (
                            <MenuItem
                                key={block.level}
                                active={block.level === state.headingLevel}
                                onClick={() => {
                                    if (block.level === 0) chain().setParagraph().run();
                                    else chain().setHeading({ level: block.level }).run();
                                    close();
                                }}
                            >
                                <span className={block.className}>{block.label}</span>
                            </MenuItem>
                        ))
                    }
                </ToolbarDropdown>

                {/* Font size */}
                <ToolbarDropdown
                    label="Font size"
                    trigger={<span className="w-9 text-left text-xs font-medium">{state.fontSize.replace("px", "") || "Size"}</span>}
                    panelClassName="w-28"
                >
                    {(close) => (
                        <>
                            <MenuItem
                                active={!state.fontSize}
                                onClick={() => {
                                    chain().unsetFontSize().run();
                                    close();
                                }}
                            >
                                Default
                            </MenuItem>
                            {FONT_SIZES.map((size) => (
                                <MenuItem
                                    key={size}
                                    active={state.fontSize === size}
                                    onClick={() => {
                                        chain().setFontSize(size).run();
                                        close();
                                    }}
                                >
                                    {size.replace("px", "")}
                                </MenuItem>
                            ))}
                        </>
                    )}
                </ToolbarDropdown>

                <ToolbarDivider />
                </>
                )}

                <ToolbarButton label="Bold (Ctrl+B)" active={state.bold} onClick={() => chain().toggleBold().run()}>
                    <Bold className={ICON} />
                </ToolbarButton>
                <ToolbarButton label="Italic (Ctrl+I)" active={state.italic} onClick={() => chain().toggleItalic().run()}>
                    <Italic className={ICON} />
                </ToolbarButton>
                <ToolbarButton
                    label="Underline (Ctrl+U)"
                    active={state.underline}
                    onClick={() => chain().toggleUnderline().run()}
                >
                    <Underline className={ICON} />
                </ToolbarButton>
                <ToolbarButton label="Strikethrough" active={state.strike} onClick={() => chain().toggleStrike().run()}>
                    <Strikethrough className={ICON} />
                </ToolbarButton>
                <ToolbarButton
                    label="Subscript"
                    active={state.subscript}
                    onClick={() => chain().toggleSubscript().run()}
                >
                    <Subscript className={ICON} />
                </ToolbarButton>
                <ToolbarButton
                    label="Superscript"
                    active={state.superscript}
                    onClick={() => chain().toggleSuperscript().run()}
                >
                    <Superscript className={ICON} />
                </ToolbarButton>
                {full && (
                    <ToolbarButton label="Inline code" active={state.code} onClick={() => chain().toggleCode().run()}>
                        <Code className={ICON} />
                    </ToolbarButton>
                )}

                <ToolbarDivider />

                {/* Text color */}
                <ToolbarDropdown
                    label="Text color"
                    trigger={
                        <span className="flex flex-col items-center">
                            <Baseline className="h-3.5 w-3.5" />
                            <span className="h-0.5 w-3.5 rounded" style={{ background: state.color || "#0f172a" }} />
                        </span>
                    }
                    panelClassName="w-48 p-2"
                >
                    {(close) => (
                        <ColorPanel
                            colors={TEXT_COLORS}
                            current={state.color}
                            resetLabel="Default color"
                            onPick={(color) => {
                                chain().setColor(color).run();
                                close();
                            }}
                            onReset={() => {
                                chain().unsetColor().run();
                                close();
                            }}
                        />
                    )}
                </ToolbarDropdown>

                {/* Highlight */}
                <ToolbarDropdown label="Highlight" trigger={<Highlighter className={ICON} />} active={state.highlight} panelClassName="w-48 p-2">
                    {(close) => (
                        <ColorPanel
                            colors={HIGHLIGHT_COLORS}
                            current={editor.getAttributes("highlight").color ?? ""}
                            resetLabel="No highlight"
                            onPick={(color) => {
                                chain().setHighlight({ color }).run();
                                close();
                            }}
                            onReset={() => {
                                chain().unsetHighlight().run();
                                close();
                            }}
                        />
                    )}
                </ToolbarDropdown>

                {/* Alignment */}
                {full && (
                <ToolbarDropdown label="Text alignment" trigger={<CurrentAlignIcon className={ICON} />}>
                    {(close) => (
                        <div className="flex gap-0.5">
                            {ALIGNMENTS.map(({ value, label, Icon }) => (
                                <ToolbarButton
                                    key={value}
                                    label={label}
                                    active={state.align === value}
                                    onClick={() => {
                                        chain().setTextAlign(value).run();
                                        close();
                                    }}
                                >
                                    <Icon className={ICON} />
                                </ToolbarButton>
                            ))}
                        </div>
                    )}
                </ToolbarDropdown>
                )}

                <ToolbarDivider />

                <ToolbarButton
                    label="Bullet list"
                    active={state.bulletList}
                    onClick={() => chain().toggleBulletList().run()}
                >
                    <List className={ICON} />
                </ToolbarButton>
                <ToolbarButton
                    label="Numbered list"
                    active={state.orderedList}
                    onClick={() => chain().toggleOrderedList().run()}
                >
                    <ListOrdered className={ICON} />
                </ToolbarButton>
                {full && (
                    <>
                        <ToolbarButton label="Quote" active={state.blockquote} onClick={() => chain().toggleBlockquote().run()}>
                            <Quote className={ICON} />
                        </ToolbarButton>
                        <ToolbarButton label="Code block" active={state.codeBlock} onClick={() => chain().toggleCodeBlock().run()}>
                            <CodeXml className={ICON} />
                        </ToolbarButton>
                        <ToolbarButton label="Divider line" onClick={() => chain().setHorizontalRule().run()}>
                            <Minus className={ICON} />
                        </ToolbarButton>
                    </>
                )}

                <ToolbarDivider />

                {/* Link */}
                <ToolbarDropdown label="Link" trigger={<LinkIcon className={ICON} />} active={state.link} panelClassName="p-2">
                    {(close) => (
                        <div className="space-y-2">
                            <InlineInputForm
                                initialValue={state.linkHref}
                                placeholder="https://example.com"
                                submitLabel={state.link ? "Update" : "Add link"}
                                onSubmit={(url) => {
                                    if (!url) chain().extendMarkRange("link").unsetLink().run();
                                    else chain().extendMarkRange("link").setLink({ href: normalizeUrl(url) }).run();
                                    close();
                                }}
                            />
                            {state.link && (
                                <MenuItem
                                    onClick={() => {
                                        chain().extendMarkRange("link").unsetLink().run();
                                        close();
                                    }}
                                >
                                    <Unlink className="mr-2 h-3.5 w-3.5" /> Remove link
                                </MenuItem>
                            )}
                        </div>
                    )}
                </ToolbarDropdown>

                {full && (
                <>
                {/* Image */}
                <ToolbarDropdown
                    label="Insert image"
                    trigger={uploadingCount > 0 ? <LoaderCircle className={cn(ICON, "animate-spin")} /> : <ImagePlus className={ICON} />}
                    panelClassName="p-2"
                >
                    {(close) => (
                        <div className="space-y-2">
                            {onUploadImages && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            fileInputRef.current?.click();
                                            close();
                                        }}
                                        className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-700 hover:bg-slate-50"
                                    >
                                        <Upload className="h-4 w-4" /> Upload from computer
                                    </button>
                                    <p className="text-center text-[11px] text-slate-400">
                                        JPG, PNG, WEBP or GIF · max 10MB · you can also paste or drop images
                                    </p>
                                    <div className="border-t border-slate-100" />
                                </>
                            )}
                            <InlineInputForm
                                placeholder="Paste image URL"
                                submitLabel="Insert"
                                onSubmit={(url) => {
                                    if (url) chain().setImage({ src: normalizeUrl(url) }).run();
                                    close();
                                }}
                            />
                        </div>
                    )}
                </ToolbarDropdown>

                {/* YouTube */}
                <ToolbarDropdown label="Embed YouTube video" trigger={<Video className={ICON} />} panelClassName="p-2">
                    {(close) => (
                        <InlineInputForm
                            placeholder="YouTube video URL"
                            submitLabel="Embed"
                            onSubmit={(url) => {
                                if (url) chain().setYoutubeVideo({ src: url }).run();
                                close();
                            }}
                        />
                    )}
                </ToolbarDropdown>

                {/* Table */}
                <ToolbarDropdown label="Insert table" trigger={<Grid2x2Plus className={ICON} />} panelClassName="p-2">
                    {(close) => (
                        <TableSizePicker
                            onPick={(rows, cols) => {
                                chain().insertTable({ rows, cols, withHeaderRow: true }).run();
                                close();
                            }}
                        />
                    )}
                </ToolbarDropdown>
                </>
                )}

                <ToolbarDivider />

                <ToolbarButton
                    label="Clear formatting"
                    onClick={() =>
                        full
                            ? chain().unsetAllMarks().clearNodes().unsetTextAlign().run()
                            : chain().unsetAllMarks().clearNodes().run()
                    }
                >
                    <RemoveFormatting className={ICON} />
                </ToolbarButton>

                <div className="flex-1" />

                {full && (
                    <ToolbarButton label={fullscreen ? "Exit full screen (Esc)" : "Full screen"} onClick={onToggleFullscreen}>
                        {fullscreen ? <Minimize2 className={ICON} /> : <Maximize2 className={ICON} />}
                    </ToolbarButton>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (files.length) onUploadImages?.(files);
                        e.target.value = "";
                    }}
                />
            </div>

            {/* ================= IMAGE CONTROLS (image selected) ================= */}
            {state.image && (
                <div className="flex flex-wrap items-center gap-1 border-t border-input bg-slate-50 px-2 py-1.5 text-xs text-slate-500">
                    <span className="mr-1 font-medium text-slate-600">Image</span>
                    {IMAGE_ALIGNMENTS.map(({ value, label, Icon }) => (
                        <ToolbarButton
                            key={value}
                            label={label}
                            active={state.imageAlign === value}
                            onClick={() => chain().updateAttributes("image", { align: value }).run()}
                        >
                            <Icon className={ICON} />
                        </ToolbarButton>
                    ))}
                    <ToolbarDivider />
                    <input
                        // re-mount when another image is selected
                        key={state.imageSrc}
                        defaultValue={state.imageAlt}
                        placeholder="Alt text (describe the image)"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                editor.chain().updateAttributes("image", { alt: e.currentTarget.value.trim() }).run();
                            }
                        }}
                        onBlur={(e) => editor.chain().updateAttributes("image", { alt: e.currentTarget.value.trim() }).run()}
                        className="h-7 w-64 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none focus:border-slate-500"
                    />
                    <span className="ml-1 hidden text-slate-400 md:inline">Drag the corners to resize</span>
                    <div className="flex-1" />
                    <ToolbarButton label="Remove image" onClick={() => chain().deleteSelection().run()} className="text-red-600">
                        <Trash className={ICON} />
                    </ToolbarButton>
                </div>
            )}

            {/* ================= TABLE CONTROLS (cursor inside a table) ================= */}
            {state.table && (
                <div className="flex flex-wrap items-center gap-0.5 border-t border-input bg-slate-50 px-2 py-1.5 text-xs">
                    <span className="mr-1 font-medium text-slate-600">Table</span>
                    <TableAction label="+ Row above" onClick={() => chain().addRowBefore().run()} />
                    <TableAction label="+ Row below" onClick={() => chain().addRowAfter().run()} />
                    <TableAction label="+ Column left" onClick={() => chain().addColumnBefore().run()} />
                    <TableAction label="+ Column right" onClick={() => chain().addColumnAfter().run()} />
                    <ToolbarDivider />
                    <TableAction label="− Row" onClick={() => chain().deleteRow().run()} />
                    <TableAction label="− Column" onClick={() => chain().deleteColumn().run()} />
                    <ToolbarDivider />
                    <TableAction label="Header row" onClick={() => chain().toggleHeaderRow().run()} />
                    <TableAction label="Merge cells" disabled={!state.canMerge} onClick={() => chain().mergeCells().run()} />
                    <TableAction label="Split cell" disabled={!state.canSplit} onClick={() => chain().splitCell().run()} />
                    <div className="flex-1" />
                    <ToolbarButton label="Delete table" onClick={() => chain().deleteTable().run()} className="text-red-600">
                        <Trash className={ICON} />
                    </ToolbarButton>
                </div>
            )}
        </div>
    );
}

function TableAction({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
    return (
        <ToolbarButton label={label} onClick={onClick} disabled={disabled} className="h-7 px-2 text-xs">
            {label}
        </ToolbarButton>
    );
}

function ColorPanel({
    colors,
    current,
    resetLabel,
    onPick,
    onReset,
}: {
    colors: string[];
    current: string;
    resetLabel: string;
    onPick: (color: string) => void;
    onReset: () => void;
}) {
    return (
        <div className="space-y-2">
            <div className="grid grid-cols-6 gap-1.5">
                {colors.map((color) => (
                    <button
                        key={color}
                        type="button"
                        title={color}
                        aria-label={color}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onPick(color)}
                        className={cn(
                            "h-6 w-6 rounded border border-slate-200",
                            current.toLowerCase() === color && "ring-2 ring-slate-900 ring-offset-1"
                        )}
                        style={{ background: color }}
                    />
                ))}
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs text-slate-600 hover:bg-slate-50">
                <input
                    type="color"
                    defaultValue={current || "#000000"}
                    onChange={(e) => onPick(e.target.value)}
                    className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
                />
                Custom color
            </label>
            <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onReset}
                className="flex w-full items-center gap-2 rounded px-1 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
                <RemoveFormatting className="h-3.5 w-3.5" />
                {resetLabel}
            </button>
        </div>
    );
}

// Hover a grid to choose the table size, like Word / Google Docs
function TableSizePicker({ onPick }: { onPick: (rows: number, cols: number) => void }) {
    const MAX = 8;
    const [hover, setHover] = useState({ rows: 0, cols: 0 });

    return (
        <div onMouseLeave={() => setHover({ rows: 0, cols: 0 })}>
            <div className="grid grid-cols-8 gap-0.5">
                {Array.from({ length: MAX * MAX }, (_, i) => {
                    const rows = Math.floor(i / MAX) + 1;
                    const cols = (i % MAX) + 1;
                    const on = rows <= hover.rows && cols <= hover.cols;
                    return (
                        <button
                            key={i}
                            type="button"
                            aria-label={`${rows} by ${cols} table`}
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseEnter={() => setHover({ rows, cols })}
                            onClick={() => onPick(rows, cols)}
                            className={cn(
                                "h-4 w-4 rounded-xs border",
                                on ? "border-[#7A3D5E] bg-[#fce8f1]" : "border-slate-300"
                            )}
                        />
                    );
                })}
            </div>
            <p className="mt-1.5 text-center text-xs text-slate-500">
                {hover.rows ? `${hover.rows} × ${hover.cols}` : "Choose size"}
            </p>
        </div>
    );
}
