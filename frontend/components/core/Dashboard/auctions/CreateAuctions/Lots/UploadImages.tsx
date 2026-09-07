import DashboardFormText from "@/components/common/DashboardFormText";
import ImageUploader from "@/components/common/ImageUploader/ImageUploader";

export default function UploadImages() {
    return (
        <div className="px-6 pb-6">

            <DashboardFormText text="Artwork Imagery Catalog" />
            <div className="mt-6">

                <ImageUploader />
            </div>
        </div>
    )
}