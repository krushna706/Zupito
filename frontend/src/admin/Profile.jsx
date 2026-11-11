import ProfileForm from "../components/ProfileForm";
import { useAuth } from "../context/AuthContext";
import { updateProfile as saveProfile } from "../services/userService";

function Profile() {
    const { user, updateProfile } = useAuth();

    const handleSave = async (values) => {
        const account = await saveProfile(values);
        updateProfile(account);

        return account;
    };

    return <ProfileForm key={user?._id} user={user} onSave={handleSave} />;
}

export default Profile;
