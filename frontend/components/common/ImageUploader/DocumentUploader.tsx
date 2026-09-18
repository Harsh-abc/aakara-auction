
"use client";

import { useRef } from "react";
import { Upload, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DocumentType,
} from "../../../lib/types/auction.types"
import {
    LotDocumentFile,
} from "../../../lib/types/AuctionsFormData"

interface DocumentUploaderProps {
    value?: LotDocumentFile[];
    onChange?: (files: LotDocumentFile[]) => void;

    accept?: string;
    maxSize?: number;
    maxFiles?: number;

    disabled?: boolean;
    className?: string;
}

export default function DocumentUploader({
    value = [],
    onChange,

    accept = ".pdf,.doc,.docx,.xls,.xlsx",
    maxSize = 20,
    maxFiles = 10,

    disabled = false,
    className,
}: DocumentUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFiles = (fileList: FileList | File[]) => {
        if (disabled) return;

        const files = Array.from(fileList);

        const availableSlots = maxFiles - value.length;

        if (availableSlots <= 0) {
            alert(`You can upload a maximum of ${maxFiles} documents.`);
            return;
        }

        const selectedFiles = files.slice(0, availableSlots);

        const validFiles = selectedFiles.filter((file) => {
            if (file.size > maxSize * 1024 * 1024) {
                alert(`${file.name} must be less than ${maxSize}MB.`);
                return false;
            }

            return true;
        });

        if (validFiles.length === 0) return;

        const newDocuments: LotDocumentFile[] =
            validFiles.map((file) => ({
                file,
                documentType: "OTHER" as DocumentType,
                description: "",
            }));

        onChange?.([...value, ...newDocuments]);
    };

    const handleInputChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        if (event.target.files) {
            handleFiles(event.target.files);
        }

        event.target.value = "";
    };

    const handleDrop = (
        event: React.DragEvent<HTMLDivElement>
    ) => {
        event.preventDefault();

        if (disabled) return;

        if (event.dataTransfer.files) {
            handleFiles(event.dataTransfer.files);
        }
    };

    const removeFile = (index: number) => {
        if (disabled) return;

        const updatedFiles = value.filter(
            (_, fileIndex) => fileIndex !== index
        );

        onChange?.(updatedFiles);
    };

    const updateDocumentType = (
        index: number,
        documentType: DocumentType
    ) => {
        const updatedFiles = value.map((document, fileIndex) =>
            fileIndex === index
                ? {
                    ...document,
                    documentType,
                }
                : document
        );

        onChange?.(updatedFiles);
    };

    const updateDescription = (
        index: number,
        description: string
    ) => {
        const updatedFiles = value.map((document, fileIndex) =>
            fileIndex === index
                ? {
                    ...document,
                    description,
                }
                : document
        );

        onChange?.(updatedFiles);
    };

    return (
        <div className={cn("w-full", className)}>
            {/* Upload Area */}
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple
                className="hidden"
                disabled={disabled}
                onChange={handleInputChange}
            />

            <div
                onDragOver={(event) => {
                    event.preventDefault();
                }}
                onDrop={handleDrop}
                onClick={() => {
                    if (!disabled) {
                        inputRef.current?.click();
                    }
                }}
                className={cn(
                    "border-2 border-dashed rounded-lg p-8",
                    "flex flex-col items-center justify-center",
                    "cursor-pointer hover:bg-muted/50 transition",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
            >
                <Upload className="w-8 h-8 mb-3" />

                <p className="font-medium">
                    Choose documents or drag & drop them here
                </p>

                <p className="text-sm text-muted-foreground mt-1">
                    PDF, DOC, DOCX, XLS, XLSX up to {maxSize}MB each
                </p>
            </div>

            {/* Documents */}
            {value.length > 0 && (
                <div className="mt-6 space-y-4">
                    {value.map((document, index) => (
                        <div
                            key={`${document.file.name}-${index}`}
                            className="border rounded-lg p-4"
                        >
                            <div className="flex items-start gap-4">
                                <FileText className="w-6 h-6 mt-1" />

                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">
                                        {document.file.name}
                                    </p>

                                    <p className="text-sm text-muted-foreground">
                                        {(
                                            document.file.size /
                                            1024 /
                                            1024
                                        ).toFixed(2)}{" "}
                                        MB
                                    </p>

                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        {/* Document Type */}
                                        <select
                                            value={
                                                document.documentType
                                            }
                                            onChange={(event) =>
                                                updateDocumentType(
                                                    index,
                                                    event.target
                                                        .value as DocumentType
                                                )
                                            }
                                            className="w-full border rounded-md px-3 py-2"
                                        >
                                            <option value="OTHER">
                                                Other
                                            </option>

                                            <option value="CERTIFICATE_OF_AUTHENTICITY">
                                                Certificate of Authenticity
                                            </option>

                                            <option value="PROVENANCE">
                                                Provenance
                                            </option>

                                            <option value="APPRAISAL">
                                                Appraisal
                                            </option>

                                            <option value="INSURANCE">
                                                Insurance
                                            </option>
                                        </select>

                                        {/* Description */}
                                        <input
                                            type="text"
                                            value={
                                                document.description
                                            }
                                            onChange={(event) =>
                                                updateDescription(
                                                    index,
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Document description"
                                            className="w-full border rounded-md px-3 py-2"
                                        />
                                    </div>
                                </div>

                                {/* Remove */}
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        removeFile(index);
                                    }}
                                    disabled={disabled}
                                    className="p-1 rounded hover:bg-muted"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
