import { useEffect } from "react";
import Notes from "../../../components/notecomps/Notes";
import { useHomeData } from "../../../context/HomeDataContext";

export default function TeacherNotes() {
    const { notes, fetchNotes } = useHomeData();

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    return (
<<<<<<< HEAD
        <div className="w-full h-full min-h-0 overflow-hidden">
=======
        <div className="w-full h-full min-h-0 bg-white shadow-sm rounded-lg overflow-hidden" data-note-count={notes.length}>
>>>>>>> 537b0c3f7f2dd727a28c7cc7a517ec4a640ea3aa
            <Notes />
        </div>
    );
}
