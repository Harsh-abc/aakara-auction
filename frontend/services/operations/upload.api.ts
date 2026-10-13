import { apiConnector } from "../apiConnector"
import { uploadEndPoints } from "../api"

const { EDITOR_IMAGE_API } = uploadEndPoints

// Uploads an image for the rich-text editor and returns its public URL
export async function uploadEditorImage(file: File, token: string | null): Promise<string> {
    const body = new FormData()
    body.append("image", file)

    const response = await apiConnector({
        method: "POST",
        url: EDITOR_IMAGE_API,
        body,
        header: { Authorization: `Bearer ${token}` },
    })
    return response.data.data.url
}
