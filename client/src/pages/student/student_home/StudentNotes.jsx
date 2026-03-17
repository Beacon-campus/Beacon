import Notes from "../../../components/notecomps/Notes";
import { useHomeData } from "../../../context/HomeDataContext";

export default function StudentNotes() {
    const { notes } = useHomeData();

    return (
        <div className="w-full h-full min-h-0 overflow-hidden" data-note-count={notes.length}>
            <Notes />
        </div>
    );
}
