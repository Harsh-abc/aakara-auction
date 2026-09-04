"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
    value?: File | null;
    onChange?: (file: File | null) => void;

    accept?: string;
    maxSize?: number;

    title?: string;
    description?: string;

    disabled?: boolean;
    className?: string;
}

export default function ImageUploader({
    value = null,
    onChange,

    accept = "image/jpeg,image/png,image/svg+xml",
    maxSize = 50,

    title = "Choose an Image or drag & drop it here",
    description = "JPEG, PNG, SVG formats, up to 50MB",

    disabled = false,
    className,
}: ImageUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    /**
     * Create preview whenever value changes
     */
    useEffect(() => {
        if (!value) {
            setPreview(null);
            return;
        }

        const objectUrl = URL.createObjectURL(value);

        setPreview(objectUrl);

        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [value]);

    /**
     * Validate and select file
     */
    const handleFile = (file: File) => {
        if (disabled) return;

        // Check file size
        if (file.size > maxSize * 1024 * 1024) {
            alert(`File size must be less than ${maxSize}MB.`);
            return;
        }

        // Check file type
        if (!file.type.startsWith("image/")) {
            alert("Please select a valid image file.");
            return;
        }

        onChange?.(file);
    };

    /**
     * Input change
     */
    const handleInputChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];

        if (file) {
            handleFile(file);
        }
    };

    /**
     * Drag & Drop
     */
    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();

        setIsDragging(false);

        if (disabled) return;

        const file = event.dataTransfer.files?.[0];

        if (file) {
            handleFile(file);
        }
    };

    /**
     * Remove image
     */
    const removeFile = () => {
        if (disabled) return;

        onChange?.(null);

        // Reset input so the same file can be selected again
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    return (
        <div className={cn("w-full", className)}>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                disabled={disabled}
                onChange={handleInputChange}
            />

            {!preview ? (
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
                </div>
            ) : (
                <div className="relative overflow-hidden rounded-lg border border-slate-200">
                    <img
                        src={preview}
                        alt="Upload preview"
                        className="h-[180px] w-full object-cover"
                    />

                    <button
                        type="button"
                        onClick={removeFile}
                        disabled={disabled}
                        aria-label="Remove image"
                        className="
                            absolute right-2 top-2
                            flex h-7 w-7 items-center justify-center
                            rounded-full bg-white
                            text-slate-700
                            shadow-sm
                            hover:bg-slate-100
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}