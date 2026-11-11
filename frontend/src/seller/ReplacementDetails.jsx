import { useParams } from "react-router-dom";
import ReplacementManagement from "../components/ReplacementManagement";

export default function ReplacementDetails() {
    const { replacementId } = useParams();
    return <ReplacementManagement seller replacementId={replacementId} />;
}
