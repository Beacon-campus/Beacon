import { useEffect } from "react";
import Notes from "../../../components/notecomps/Notes";
import { useHomeData } from "../../../context/HomeDataContext";

export default function StudentNotes() {
    const { notes, fetchNotes } = useHomeData();

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    return (
        <div className="w-full h-full min-h-0 overflow-hidden" data-note-count={notes.length}>
            <Notes />
        </div>
    );
}
