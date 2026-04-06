import { useMemo, useState } from "react";
import Modal from "../../ui/Modal";
import DocViewer from "../../doccomps/docviewer";
import ImagePreviewModal from "../../ui/ImagePreviewModal";
import { resolveAttachmentUrl } from "../../../utils/cloudinaryUrl";

const LONG_MESSAGE_THRESHOLD = 130;

const cloneAnnouncement = (announcement) => {
    if (!announcement) return null;
    return {
        ...announcement,
        attachment: announcement.attachment ? { ...announcement.attachment } : null,
        createdBy: announcement.createdBy ? { ...announcement.createdBy } : null,
    };
};

export default function AnnouncementsWidget({
    activeAnnounce,
    announcements,
    setActiveAnnounce,
    prevAnnounce,
    nextAnnounce,
    navigate,
    navigateTo = "/student/community",
    enableAdvancedPreview = false,
}) {
    const list = announcements || [];
    const current = list[activeAnnounce] || null;
    const [textModalOpen, setTextModalOpen] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [docFile, setDocFile] = useState(null);
    const [imageModalOpen, setImageModalOpen] = useState(false);

    const message = useMemo(
        () => current?.text || current?.message || current?.attachment?.name || "Announcement",
        [current]
    );
    const isLongMessage = message.length > LONG_MESSAGE_THRESHOLD;
    const shortMessage = isLongMessage ? `${message.slice(0, LONG_MESSAGE_THRESHOLD)}...` : message;
    const selectedMessage = selectedAnnouncement?.text || selectedAnnouncement?.message || "";
    const selectedSender = selectedAnnouncement?.sender || selectedAnnouncement?.createdBy?.name || "Admin";

    const closeMessageModal = () => {
        setTextModalOpen(false);
        setSelectedAnnouncement(null);
    };

    const closeDocPreview = () => {
        setDocFile(null);
        setSelectedAnnouncement(null);
    };

    const closeImagePreview = () => {
        setImageModalOpen(false);
        setSelectedAnnouncement(null);
    };

    const openMessageModal = () => {
        if (!current) return;
        setSelectedAnnouncement(cloneAnnouncement(current));
        setTextModalOpen(true);
    };

    const openDocPreview = () => {
        if (!current?.attachment) return;
        const selected = cloneAnnouncement(current);
        setSelectedAnnouncement(selected);
        setDocFile({
            ...selected.attachment,
            name: selected.attachment.name || "attachment",
            mimeType: selected.attachment.mimeType || selected.attachment.type || "",
            type: selected.attachment.mimeType || selected.attachment.type || "",
            previewUrl: selected.attachment.previewUrl || null,
            previewDownloadUrl: selected.attachment.previewDownloadUrl || null,
            previewPath: selected.attachment.previewPath || null,
            previewType: selected.attachment.previewType || null,
            previewStatus: selected.attachment.previewStatus || null,
            previewError: selected.attachment.previewError || null,
        });
    };

    const handleAnnouncementClick = () => {
        if (!current) return;
        if (!enableAdvancedPreview) {
            navigate(navigateTo);
            return;
        }

        if (current?.attachment?.kind === "image" && resolveAttachmentUrl(current?.attachment)) {
            setSelectedAnnouncement(cloneAnnouncement(current));
            setImageModalOpen(true);
            return;
        }
        if (current?.attachment?.kind === "file" && resolveAttachmentUrl(current?.attachment)) {
            openDocPreview();
            return;
        }
        if (current?.text || current?.message) {
            openMessageModal();
            return;
        }
        navigate(navigateTo);
    };

    return (
        <div className="premium-card min-h-[200px] min-[426px]:min-h-[220px] min-[769px]:min-h-[280px] p-4 min-[426px]:p-4 min-[769px]:p-6 flex-1 flex flex-col relative overflow-hidden">
            <h2 className="text-lg min-[426px]:text-lg min-[769px]:text-xl font-black text-primary mb-4 flex items-center gap-2 px-1 tracking-tight">
                <span className="w-2 h-6 bg-green-500 rounded-full"></span>
                University Announcements
            </h2>

            <div className="flex-1 flex flex-col justify-center items-center px-1 min-[426px]:px-4 overflow-hidden">
                {list.length === 0 ? (
                    <p className="text-sm min-[426px]:text-sm min-[769px]:text-sm font-medium text-gray-400 text-center">No announcements yet.</p>
                ) : (
                <>
                <div className="w-full flex items-center gap-2">
                    <button
                        onClick={prevAnnounce}
                        className="w-7 h-7 shrink-0 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-100 border border-gray-200 transition-transform active:scale-95 z-20"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                    </button>

                    <div
                        className="flex-1 cursor-pointer hover:opacity-95 transition-opacity max-w-2xl"
                        onClick={handleAnnouncementClick}
                    >
                        <div key={`text-${activeAnnounce}`} className="relative bg-gray-50 border border-gray-200 p-3 min-[426px]:p-4 rounded-2xl animate-fade-in-right shadow-sm min-h-[140px] min-[769px]:min-h-[124px]">
                            <div className="relative z-10">
                                <p className="text-[11px] min-[426px]:text-xs min-[769px]:text-xs font-bold text-green-600 mb-1">{current?.sender || current?.createdBy?.name || "Admin"}</p>
                                <p className="text-[15px] min-[426px]:text-sm min-[769px]:text-[15px] text-gray-700 leading-relaxed font-medium line-clamp-4 min-[769px]:line-clamp-none">
                                    {enableAdvancedPreview ? shortMessage : message}
                                </p>
                                {enableAdvancedPreview && isLongMessage && (
                                    <button
                                        type="button"
                                        className="mt-2 text-[11px] min-[426px]:text-xs min-[769px]:text-xs font-semibold text-blue-600 hover:underline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openMessageModal();
                                        }}
                                    >
                                        Read full message
                                    </button>
                                )}
                                {current?.attachment?.kind === "file" && (
                                    <button
                                        type="button"
                                        className="mt-2 inline-block text-[11px] min-[426px]:text-xs min-[769px]:text-xs font-semibold text-blue-600 hover:underline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (enableAdvancedPreview) openDocPreview();
                                            else window.open(resolveAttachmentUrl(current.attachment), "_blank");
                                            }}
                                    >
                                        {enableAdvancedPreview ? "Preview attachment" : "Open attachment"}: {current.attachment.name || "file"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={nextAnnounce}
                        className="w-7 h-7 shrink-0 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-100 border border-gray-200 transition-transform active:scale-95 z-20"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>

                <div className="mt-3 flex gap-2 z-20">
                    {list.map((_, idx) => (
                        <div
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); setActiveAnnounce(idx); }}
                            className={`rounded-full transition-all duration-300 relative overflow-hidden cursor-pointer hover:bg-gray-300 bg-gray-200 ${activeAnnounce === idx ? 'w-8 h-2' : 'w-2 h-2'}`}
                        >
                            {activeAnnounce === idx && (
                                <div key={`anim-ann-${idx}-${activeAnnounce}`} className="absolute top-0 left-0 h-full bg-green-500 animate-[fillWidth_5.2s_linear_forwards]"></div>
                            )}
                        </div>
                    ))}
                </div>
                </>
                )}
            </div>

            {enableAdvancedPreview && (
                <>
                    <Modal
                        isOpen={textModalOpen}
                        onClose={closeMessageModal}
                        className="max-w-[600px] max-h-[85vh]"
                        backdropClassName="bg-black/40 backdrop-blur-sm"
                    >
                        <div className="p-6 flex flex-col max-h-[85vh]">
                            <div className="flex justify-between items-start mb-4 gap-4">
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-xl font-bold text-gray-800 break-words leading-tight">
                                        Announcement
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">From {selectedSender}</p>
                                </div>
                                <button
                                    onClick={closeMessageModal}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                                    aria-label="Close announcement"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>

                            <div className="overflow-y-auto pr-2 soft-scrollbar flex-1 min-h-[100px] text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                                {selectedMessage || <p className="text-gray-400 italic">No message</p>}
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button onClick={closeMessageModal} className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold">
                                    Close
                                </button>
                            </div>
                        </div>
                    </Modal>

                    <DocViewer file={docFile} onClose={closeDocPreview} />

                    <ImagePreviewModal
                        isOpen={imageModalOpen}
                        onClose={closeImagePreview}
                        imageUrl={resolveAttachmentUrl(selectedAnnouncement?.attachment)}
                        imageName={selectedAnnouncement?.attachment?.name || "Announcement image"}
                    />
                </>
            )}
        </div>
    );
}
