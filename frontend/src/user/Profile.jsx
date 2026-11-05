import { useAuth } from "../context/AuthContext";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { TextField } from "@mui/material";
import { toast } from "react-toastify";

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getProfileImage(user) {
    const picture = user?.profilePicture ?? user?.avatar;

    if (typeof picture === "string") {
        return picture;
    }

    return typeof picture?.url === "string" ? picture.url : "";
}

function getInitials(name) {
    const words = String(name || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!words.length) return "U";

    return words
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("");
}

function ProfileContent({ user = null, onSave = null }) {
    const fileInputRef = useRef(null);

    const [name, setName] = useState(user?.name || "");
    const [nameError, setNameError] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    useEffect(
        () => () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
        },
        [imagePreview]
    );
    const [failedImage, setFailedImage] = useState(null);
    const [saving, setSaving] = useState(false);

    const savedName = user?.name || "";
    const savedImage = getProfileImage(user);
    const email = user?.email || "";
    const mobile = user?.mobile || user?.phone || "";

    const currentImage = imagePreview || savedImage;
    const imageError = failedImage === currentImage;
    const displayName = name.trim() || savedName || "Your Profile";

    const normalizedName = name.trim().replace(/\s+/g, " ");
    const hasChanges = normalizedName !== savedName.trim().replace(/\s+/g, " ") || Boolean(selectedImage);

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            toast.error("Upload a JPG, JPEG, PNG or WebP image.");
            return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            toast.error("Profile picture must be 3 MB or smaller.");
            return;
        }

        setSelectedImage(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleReset = () => {
        setName(savedName);
        setSelectedImage(null);
        setImagePreview("");
        setNameError("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (normalizedName.length < 2 || normalizedName.length > 80) {
            setNameError("Full name must contain 2 to 80 characters.");
            return;
        }

        setNameError("");

        if (!hasChanges) {
            toast.info("No profile changes to save.");
            return;
        }

        if (!user || typeof onSave !== "function") {
            toast.info("Profile updates will be available after account integration.");
            return;
        }

        try {
            setSaving(true);

            const result = await onSave({
                name: normalizedName,
                profilePicture: selectedImage
            });

            if (result === false || result?.success === false) {
                toast.error(result?.message || "Unable to update your profile.");
                return;
            }

            setSelectedImage(null);
            setImagePreview("");
            toast.success("Profile updated successfully.");
        } catch {
            toast.error("Unable to update your profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="customer-profile-page">
            {/* Page Heading */}
            <div className="customer-profile-heading">
                <div>
                    <span className="customer-profile-eyebrow">PERSONAL DETAILS</span>

                    <h2>My Profile</h2>

                    <p>Manage your profile information and keep your account details up to date.</p>
                </div>

                <span className="customer-profile-heading-icon">
                    <i className="fa-solid fa-user-gear" aria-hidden="true" />
                </span>
            </div>

            {/* Profile Content */}
            <div className="customer-profile-grid">
                {/* Left Identity Card */}
                <aside className="customer-profile-identity">
                    <div className="customer-profile-identity-top">
                        <span className="customer-profile-identity-label">YOUR PROFILE</span>

                        <div className="customer-profile-avatar-wrap">
                            <div className="customer-profile-avatar">
                                {currentImage && !imageError ? (
                                    <img
                                        src={currentImage}
                                        alt={`${displayName} profile`}
                                        onError={() => setFailedImage(currentImage)}
                                    />
                                ) : (
                                    <span>{getInitials(displayName)}</span>
                                )}
                            </div>

                            <button
                                type="button"
                                className="customer-profile-camera"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={saving}
                                aria-label="Change profile picture"
                                title="Change profile picture"
                            >
                                <i className="fa-solid fa-camera" aria-hidden="true" />
                            </button>
                        </div>

                        <h3>{displayName}</h3>

                        <p className="customer-profile-account-type">Customer Account</p>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp"
                            onChange={handleImageChange}
                            className="d-none"
                            aria-label="Upload profile picture"
                        />

                        <button
                            type="button"
                            className="customer-profile-upload-button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={saving}
                        >
                            <i className="fa-solid fa-camera" aria-hidden="true" />
                            Change Picture
                        </button>

                        {selectedImage && (
                            <div className="customer-profile-image-selected">
                                <i className="fa-solid fa-circle-check" aria-hidden="true" />

                                <span>New picture selected</span>

                                <button
                                    type="button"
                                    onClick={() => setSelectedImage(null)}
                                    disabled={saving}
                                    aria-label="Remove selected picture"
                                >
                                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                                </button>
                            </div>
                        )}

                        <p className="customer-profile-image-note">
                            JPG, PNG or WebP
                            <span>Maximum file size: 3 MB</span>
                        </p>
                    </div>

                    <div className="customer-profile-identity-bottom">
                        <span>
                            <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                        </span>

                        <p>Keep your personal details accurate for a better shopping experience.</p>
                    </div>
                </aside>

                {/* Right Details Card */}
                <div className="customer-profile-details">
                    <div className="customer-profile-details-header">
                        <span className="customer-profile-details-icon">
                            <i className="fa-regular fa-id-card" aria-hidden="true" />
                        </span>

                        <div>
                            <h3>Personal Information</h3>

                            <p>Edit your name and review your registered contact details.</p>
                        </div>
                    </div>

                    <form className="customer-profile-form" onSubmit={handleSubmit} noValidate>
                        <div className="customer-profile-form-section">
                            <span>PROFILE DETAILS</span>

                            <div className="customer-profile-fields">
                                <TextField
                                    label="Full Name"
                                    name="name"
                                    value={name}
                                    onChange={(event) => {
                                        setName(event.target.value);

                                        if (nameError) {
                                            setNameError("");
                                        }
                                    }}
                                    error={Boolean(nameError)}
                                    helperText={nameError}
                                    autoComplete="name"
                                    required
                                    fullWidth
                                    size="small"
                                    disabled={saving}
                                    slotProps={{
                                        htmlInput: {
                                            maxLength: 80
                                        }
                                    }}
                                />

                                <TextField
                                    label="Email Address"
                                    name="email"
                                    value={email}
                                    placeholder="Registered email address"
                                    fullWidth
                                    size="small"
                                    slotProps={{
                                        input: {
                                            readOnly: true,
                                            endAdornment: (
                                                <i
                                                    className="fa-solid fa-lock customer-profile-field-lock"
                                                    aria-hidden="true"
                                                />
                                            )
                                        }
                                    }}
                                />

                                <TextField
                                    label="Mobile Number"
                                    name="mobile"
                                    value={mobile}
                                    placeholder="Registered mobile number"
                                    fullWidth
                                    size="small"
                                    slotProps={{
                                        input: {
                                            readOnly: true,
                                            endAdornment: (
                                                <i
                                                    className="fa-solid fa-lock customer-profile-field-lock"
                                                    aria-hidden="true"
                                                />
                                            )
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="customer-profile-readonly-note">
                            <i className="fa-solid fa-circle-info" aria-hidden="true" />

                            <p>
                                Email address and mobile number are linked to your account and cannot be
                                changed here.
                            </p>
                        </div>

                        <div className="customer-profile-actions">
                            <button
                                type="button"
                                className="customer-profile-reset-button"
                                onClick={handleReset}
                                disabled={saving || !hasChanges}
                            >
                                Reset
                            </button>

                            <button
                                type="submit"
                                className="customer-profile-save-button"
                                disabled={saving || !hasChanges}
                            >
                                {saving ? (
                                    <>
                                        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-check" aria-hidden="true" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Password & Security */}
            <div className="customer-profile-security">
                <span className="customer-profile-security-icon">
                    <i className="fa-solid fa-lock" aria-hidden="true" />
                </span>

                <div>
                    <h3>Password & Security</h3>

                    <p>
                        Want to change your password? Use the secure Forgot Password process to verify your
                        account.
                    </p>
                </div>

                <Link to="/manage/forgot-password" className="customer-profile-security-link">
                    Forgot Password
                    <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </Link>
            </div>
        </div>
    );
}

export default function Profile(props) {
    const { user, updateProfile } = useAuth();
    const save = async ({ name, profilePicture }) => {
        let picture = user?.profilePicture;
        if (profilePicture) {
            const url = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(profilePicture);
            });
            picture = { url };
        }
        updateProfile({ name, profilePicture: picture });
    };
    const account = props.user || user;
    return (
        <ProfileContent
            key={`${account?.id}-${account?.name}`}
            {...props}
            user={account}
            onSave={props.onSave || save}
        />
    );
}
