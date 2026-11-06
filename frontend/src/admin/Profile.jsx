
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import ProfileForm from "../components/ProfileForm";
import { useAuth } from "../context/AuthContext";

// ================== IMAGE PREVIEW PROCESSING ==================
async function prepareAvatar(file) {
    if (!file) return null;

    let bitmap;

    try {
        bitmap = await createImageBitmap(file);

        if (!bitmap.width || !bitmap.height) {
            throw new Error("The selected image is invalid.");
        }

        const maxDimension = 512;
        const scale = Math.min(
            1,
            maxDimension / Math.max(bitmap.width, bitmap.height)
        );

        const canvas = document.createElement("canvas");

        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));

        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error("Unable to process the selected image.");
        }

        context.drawImage(
            bitmap,
            0,
            0,
            canvas.width,
            canvas.height
        );

        // Keep the preview avatar small enough for session storage.
        const avatarUrl = canvas.toDataURL("image/webp", 0.8);

        if (avatarUrl.length > 500000) {
            throw new Error("Unable to optimize this image. Choose another picture.");
        }

        return avatarUrl;
    } catch (error) {
        if (error?.message?.startsWith("Unable")) {
            throw error;
        }

        throw new Error("Invalid image. Upload a valid JPG, PNG or WebP file.");
    } finally {
        bitmap?.close();
    }
}

// ================== SHARED STAFF PROFILE ==================
function Profile() {
    const { user, updateProfile } = useAuth();
    const navigate = useNavigate();

    // ================== SAVE PROFILE ==================
    const handleSave = async ({ name, pictureFile }) => {
        const changes = { name };

        if (pictureFile) {
            changes.avatarUrl = await prepareAvatar(pictureFile);
        }

        updateProfile(changes);

        return true;
    };

    return (
        <ProfileForm
            user={user}
            onSave={handleSave}
        />
    );
}

export default Profile;
