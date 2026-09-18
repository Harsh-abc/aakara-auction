"use client";

import { useEffect, useRef, useState } from "react";
import {
    Upload,
    X,
    Star,
    Play,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { LotImageFile } from "@/lib/types/AuctionsFormData";

interface MediaUploaderProps {
    value?: LotImageFile[];
    onChange?: (files: LotImageFile[]) => void;


    accept?: string;
    maxSize?: number;
    maxFiles?: number;

    title?: string;
    description?: string;

    disabled?: boolean;
    className?: string;


}

export default function MediaUploader({
    value = [],
    onChange,


    accept = "image/jpeg,image/png,image/svg+xml,video/mp4,video/webm,video/quicktime",

    maxSize = 50,
    maxFiles = 20,

    title = "Choose images/videos or drag & drop them here",

    description = "JPEG, PNG, SVG, MP4, WEBM, MOV up to 50MB each",

    disabled = false,
    className,


}: MediaUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);


    const [isDragging, setIsDragging] =
        useState(false);

    /*
     * Create preview URL for a file
     */
    const createPreview = (file: File) => {
        return URL.createObjectURL(file);
    };

    /*
     * Validate file
     */
    const validateFile = (file: File) => {
        if (file.size > maxSize * 1024 * 1024) {
            alert(
                `${file.name} must be less than ${maxSize}MB.`
            );

            return false;
        }

        const isImage =
            file.type.startsWith("image/");

        const isVideo =
            file.type.startsWith("video/");

        if (!isImage && !isVideo) {
            alert(
                `${file.name} is not a supported image or video file.`
            );

            return false;
        }

        return true;
    };

    /*
     * Add files
     */
    const handleFiles = (fileList: FileList | File[]) => {
        if (disabled) return;

        const files = Array.from(fileList);

        const availableSlots =
            maxFiles - value.length;

        if (availableSlots <= 0) {
            alert(
                `You can upload a maximum of ${maxFiles} files.`
            );

            return;
        }

        const selectedFiles = files
            .slice(0, availableSlots)
            .filter(validateFile);

        if (selectedFiles.length === 0) {
            return;
        }

        const newFiles: LotImageFile[] =
            selectedFiles.map((file) => ({
                file,
                preview: createPreview(file),
                isPrimary: false,
            }));

        /*
         * If there is no existing primary image,
         * make the first image the primary image.
         */
        const hasPrimary = value.some(
            (item) =>
                item.isPrimary === true
        );

        if (!hasPrimary) {
            const firstImageIndex =
                newFiles.findIndex((item) =>
                    item.file.type.startsWith("image/")
                );

            if (firstImageIndex !== -1) {
                newFiles[firstImageIndex].isPrimary =
                    true;
            }
        }

        onChange?.([
            ...value,
            ...newFiles,
        ]);
    };

    /*
     * File input
     */
    const handleInputChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        if (event.target.files) {
            handleFiles(event.target.files);
        }

        /*
         * Reset input so the same file can
         * be selected again.
         */
        event.target.value = "";
    };

    /*
     * Drag & Drop
     */
    const handleDrop = (
        event: React.DragEvent<HTMLDivElement>
    ) => {
        event.preventDefault();

        setIsDragging(false);

        if (disabled) return;

        if (event.dataTransfer.files) {
            handleFiles(
                event.dataTransfer.files
            );
        }
    };

    /*
     * Remove media
     */
    const removeFile = (index: number) => {
        if (disabled) return;

        const fileToRemove = value[index];

        if (fileToRemove?.preview) {
            URL.revokeObjectURL(
                fileToRemove.preview
            );
        }

        const updatedFiles =
            value.filter(
                (_, fileIndex) =>
                    fileIndex !== index
            );

        /*
         * If primary image was removed,
         * assign primary to first remaining image.
         */
        if (
            fileToRemove?.isPrimary &&
            updatedFiles.length > 0
        ) {
            const firstImageIndex =
                updatedFiles.findIndex((item) =>
                    item.file.type.startsWith("image/")
                );

            if (firstImageIndex !== -1) {
                updatedFiles[
                    firstImageIndex
                ].isPrimary = true;
            }
        }

        onChange?.(updatedFiles);
    };

    /*
     * Set primary image
     */
    const setPrimary = (index: number) => {
        if (disabled) return;

        const selected =
            value[index];

        /*
         * Videos cannot be primary artwork.
         */
        if (
            !selected.file.type.startsWith(
                "image/"
            )
        ) {
            return;
        }

        const updatedFiles =
            value.map((item, fileIndex) => ({
                ...item,
                isPrimary:
                    fileIndex === index,
            }));

        onChange?.(updatedFiles);
    };

    /*
     * Cleanup preview URLs on unmount
     */
    useEffect(() => {
        return () => {
            value.forEach((item) => {
                if (item.preview) {
                    URL.revokeObjectURL(
                        item.preview
                    );
                }
            });
        };
    }, []);

    return (
        <div
            className={cn(
                "w-full space-y-4",
                className
            )}
        >

            {/* =========================
            FILE INPUT
        ========================== */}

            <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple
                className="hidden"
                disabled={disabled}
                onChange={handleInputChange}
            />

            {/* =========================
            DROPZONE
        ========================== */}

            <div
                onClick={() => {
                    if (!disabled) {
                        inputRef.current?.click();
                    }
                }}
                onDragOver={(event) => {
                    event.preventDefault();

                    if (!disabled) {
                        setIsDragging(true);
                    }
                }}
                onDragLeave={() => {
                    setIsDragging(false);
                }}
                onDrop={handleDrop}
                className={cn(
                    "flex flex-col items-center justify-center gap-2",
                    "rounded-xl border-2 border-dashed p-6 text-center",
                    "transition-colors",

                    disabled
                        ? "cursor-not-allowed bg-slate-50 opacity-60"
                        : "cursor-pointer",

                    isDragging
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 bg-white"
                )}
            >

                <Upload
                    className="mb-3 h-6 w-6 text-slate-700"
                    strokeWidth={1.8}
                />

                <p className="text-[18px] font-medium text-slate-700">
                    {title}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                    {description}
                </p>

                <p className="text-xs text-slate-400">
                    {value.length} / {maxFiles} files
                </p>

            </div>

            {/* =========================
            PREVIEW GRID
        ========================== */}

            {value.length > 0 && (
                <div className="grid grid-cols-4 gap-4">

                    {value.map(
                        (media, index) => {
                            const isImage =
                                media.file.type.startsWith(
                                    "image/"
                                );

                            const isVideo =
                                media.file.type.startsWith(
                                    "video/"
                                );

                            return (
                                <div
                                    key={`${media.file.name}-${index}`}
                                    className="relative overflow-hidden rounded-lg border border-slate-200 bg-white"
                                >

                                    {/* Preview */}

                                    <div className="relative h-36 w-full bg-slate-100">

                                        {isImage && (
                                            <img
                                                src={
                                                    media.preview
                                                }
                                                alt={
                                                    media.file.name
                                                }
                                                className="h-full w-full object-cover"
                                            />
                                        )}

                                        {isVideo && (
                                            <div className="flex h-full w-full items-center justify-center">

                                                <video
                                                    src={
                                                        media.preview
                                                    }
                                                    className="h-full w-full object-cover"
                                                />

                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">

                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90">

                                                        <Play
                                                            className="ml-0.5 h-5 w-5 text-slate-700"
                                                            fill="currentColor"
                                                        />

                                                    </div>

                                                </div>

                                            </div>
                                        )}

                                    </div>

                                    {/* File name */}

                                    <div className="p-2">

                                        <p
                                            className="truncate text-xs font-medium text-slate-700"
                                            title={
                                                media.file.name
                                            }
                                        >
                                            {
                                                media.file.name
                                            }
                                        </p>

                                        <p className="mt-1 text-[10px] uppercase text-slate-400">
                                            {isImage
                                                ? "IMAGE"
                                                : isVideo
                                                    ? "VIDEO"
                                                    : "FILE"}
                                        </p>

                                    </div>

                                    {/* Primary */}

                                    {isImage && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPrimary(
                                                    index
                                                )
                                            }
                                            disabled={
                                                disabled
                                            }
                                            className={cn(
                                                "absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full",
                                                media.isPrimary
                                                    ? "bg-yellow-400 text-white"
                                                    : "bg-white text-slate-500 shadow-sm hover:bg-slate-100"
                                            )}
                                            title={
                                                media.isPrimary
                                                    ? "Primary artwork"
                                                    : "Set as primary"
                                            }
                                        >
                                            <Star
                                                className="h-4 w-4"
                                                fill={
                                                    media.isPrimary
                                                        ? "currentColor"
                                                        : "none"
                                                }
                                            />
                                        </button>
                                    )}

                                    {/* Remove */}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeFile(
                                                index
                                            )
                                        }
                                        disabled={
                                            disabled
                                        }
                                        aria-label="Remove file"
                                        className="
                                        absolute
                                        right-2
                                        top-2
                                        flex
                                        h-7
                                        w-7
                                        items-center
                                        justify-center
                                        rounded-full
                                        bg-white
                                        text-slate-700
                                        shadow-sm
                                        hover:bg-slate-100
                                    "
                                    >
                                        <X className="h-4 w-4" />
                                    </button>

                                    {/* Primary label */}

                                    {media.isPrimary && (
                                        <span className="
                                        absolute
                                        bottom-12
                                        left-2
                                        rounded-full
                                        bg-white/90
                                        px-2
                                        py-1
                                        text-[9px]
                                        font-medium
                                        text-slate-700
                                    ">
                                            Primary Artwork
                                        </span>
                                    )}

                                </div>
                            );
                        }
                    )}

                </div>
            )}

        </div>
    );
}
