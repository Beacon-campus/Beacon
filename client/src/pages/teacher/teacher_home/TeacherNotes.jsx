import Notes from "../../../components/notecomps/Notes";
import { useHomeData } from "../../../context/HomeDataContext";

export default function TeacherNotes() {
    const { notes } = useHomeData();

    return (
        <div className="w-full min-h-full h-auto px-4 max-[425px]:px-3 pt-3 pb-4 min-[769px]:px-0 min-[769px]:pt-0 min-[769px]:pb-0 min-[769px]:h-full min-[769px]:min-h-0 overflow-visible min-[769px]:overflow-hidden">
            <Notes />
        </div>
    );
}
