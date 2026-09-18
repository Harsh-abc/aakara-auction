
"use client";

import { Controller, useFormContext } from "react-hook-form";
import DashboardFormText from "@/components/common/DashboardFormText";
import DocumentUploader from "@/components/common/ImageUploader/DocumentUploader";
import { AuctionFormData } from "@/lib/types/AuctionsFormData";

interface CertificatesDocsProps {
    lotIndex: number;
}

export default function CertificatesDocs({
    lotIndex,
}: CertificatesDocsProps) {
    const { control } = useFormContext<AuctionFormData>();

    return (
        <div className="px-6 pb-6">
            <div>
                <DashboardFormText text="Condition Docs" />
            </div>

            <div className="mt-6">
                <Controller
                    name={`lots.${lotIndex}.documents`}
                    control={control}
                    render={({ field }) => (
                        <DocumentUploader
                            value={field.value ?? []}
                            onChange={field.onChange}
                        />
                    )}
                />
            </div>
        </div>
    );
}
