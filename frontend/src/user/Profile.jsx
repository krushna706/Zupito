import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { TextField } from "@mui/material";
import { toast } from "react-toastify";

import { useAuth } from "../context/AuthContext";
import { updateProfile as saveProfile } from "../services/userService";

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getInitials(name) {
    return (
        String(name || "")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word.charAt(0).toUpperCase())
            .join("") || "U"
    );
}

function Profile() {
    const { user, updateProfile } = useAuth();
    const fileInputRef = useRef(null);

    const [name, setName] = useState(user?.name || "");
    const [nameError, setNameError] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const [failedImage, setFailedImage] = useState("");
    const [saving, setSaving] = useState(false);

    const savedName = user?.name || "";
    const normalizedName = name.trim().replace(/\s+/g, " ");
    const displayName = normalizedName || savedName || "Your Profile";
    const currentImage = imagePreview || user?.avatar?.url || "";

    const hasChanges =
        normalizedName !== savedName.trim().replace(/\s+/g, " ") || Boolean(selectedImage);

    useEffect(() => {
        setName(user?.name || "");
    }, [user?.name]);

    useEffect(() => {
        if (!selectedImage) {
            setImagePreview("");
            return;
        }

        const url = URL.createObjectURL(selectedImage);
        setImagePreview(url);

        return () => URL.revokeObjectURL(url);
    }, [selectedImage]);

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;

        if (!IMAGE_TYPES.includes(file.type)) {
            toast.error("Upload a JPG, JPEG, PNG or WebP image.");
            return;
        }

        if (!file.size || file.size > MAX_IMAGE_SIZE) {
            toast.error("Image must be valid and 3 MB or smaller.");
            return;
        }

        setSelectedImage(file);
        setFailedImage("");
    };

    const handleReset = () => {
        setName(savedName);
        setSelectedImage(null);
        setNameError("");
        setFailedImage("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (saving || !hasChanges) return;

        if (normalizedName.length < 2 || normalizedName.length > 100) {
            setNameError("Full name must contain 2–100 characters.");
            return;
        }

        setNameError("");
        setSaving(true);

        try {
            const account = await saveProfile({
                name: normalizedName,
                pictureFile: selectedImage,
            });

            updateProfile(account);
            setSelectedImage(null);
            setName(account.name);
            toast.success("Profile updated successfully.");
        } catch (error) {
            toast.error(error.message || "Unable to update your profile.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="customer-profile-page">
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

            <div className="customer-profile-grid">
                <aside className="customer-profile-identity">
                    <div className="customer-profile-identity-top">
                        <span className="customer-profile-identity-label">YOUR PROFILE</span>

                        <div className="customer-profile-avatar-wrap">
                            <div className="customer-profile-avatar">
                                {currentImage && failedImage !== currentImage ? (
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
                            disabled={saving}
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
                            JPG, JPEG, PNG or WebP
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
                                        setNameError("");
                                    }}
                                    error={Boolean(nameError)}
                                    helperText={nameError}
                                    autoComplete="name"
                                    required
                                    fullWidth
                                    size="small"
                                    disabled={saving}
                                    slotProps={{ htmlInput: { maxLength: 100 } }}
                                />

                                <TextField
                                    label="Email Address"
                                    value={user?.email || ""}
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
                                            ),
                                        },
                                    }}
                                />

                                <TextField
                                    label="Mobile Number"
                                    value={user?.phone || ""}
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
                                            ),
                                        },
                                    }}
                                />
                            </div>
                        </div>

                        <div className="customer-profile-readonly-note">
                            <i className="fa-solid fa-circle-info" aria-hidden="true" />
                            <p>
                                Email address and mobile number are linked to your account and
                                cannot be changed here.
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
                                <i
                                    className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-check"}`}
                                    aria-hidden="true"
                                />
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="customer-profile-security">
                <span className="customer-profile-security-icon">
                    <i className="fa-solid fa-lock" aria-hidden="true" />
                </span>

                <div>
                    <h3>Password & Security</h3>
                    <p>
                        Want to change your password? Use the secure Forgot Password process to
                        verify your account.
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

export default Profile;
