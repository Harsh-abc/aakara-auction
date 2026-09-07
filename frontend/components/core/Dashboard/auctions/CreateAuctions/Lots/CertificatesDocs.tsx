import DashboardFormText from "@/components/common/DashboardFormText";
import ImageUploader from "@/components/common/ImageUploader/ImageUploader";

export default function CertificatesDocs() {
    return (
        <div className="px-6 pb-6">
            <div>
                <DashboardFormText text="Condition Docs" />
            </div>
            <div className="mt-6">
                <ImageUploader />
            </div>
        </div>
    )
}