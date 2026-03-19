import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { uploadAttachment, ACCEPTED_ATTACHMENT_EXTENSIONS } from "../../utils/attachmentUpload";
import { resolveAttachmentUrl } from "../../utils/cloudinaryUrl";
import { createUniversityAnnouncement, fetchRecentUniversityAnnouncements } from "../../services/university.service";
import LoadingState from "../../components/ui/LoadingState";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function fileSizeLabel(bytes) {
  const size = Number(bytes || 0);
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function toAnnouncementAttachment(uploaded) {
  if (!uploaded) return null;
  return {
    type: "file",
    name: uploaded.name,
    mimeType: uploaded.mimeType || uploaded.type,
    cloudinary: uploaded.cloudinary || null,
    previewUrl: uploaded.previewUrl || "",
    previewDownloadUrl: uploaded.previewDownloadUrl || "",
    previewPath: uploaded.previewPath || "",
    previewType: uploaded.previewType || "",
    previewStatus: uploaded.previewStatus || "",
    previewError: uploaded.previewError || "",
    size: uploaded.size || 0,
    kind: uploaded.kind === "image" ? "image" : "file",
  };
}

export default function AdminAnnouncements() {
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);

  const stats = useMemo(() => {
    const total = announcements.length;
    const withFiles = announcements.filter((a) => resolveAttachmentUrl(a.attachment)).length;
    const imagePosts = announcements.filter((a) => a.attachment?.kind === "image").length;
    return { total, withFiles, imagePosts };
  }, [announcements]);

  const loadAnnouncements = async (silent = false, force = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await fetchRecentUniversityAnnouncements(50, { force });
      setAnnouncements(data || []);
    } catch (error) {
      console.error(error);
      if (!silent) toast.error("Failed to load announcements");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements(false);
  }, []);

  const onAttachmentSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const uploaded = await uploadAttachment(file, "university_announcement");
      setAttachment(uploaded);
      toast.success("Attachment uploaded to university folder");
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || "Upload failed");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const postAnnouncement = async ({ text, uploadedAttachment } = {}) => {
    const content = typeof text === "string" ? text : message;
    const media = uploadedAttachment !== undefined ? uploadedAttachment : attachment;

    if ((!content || !content.trim()) && !media) return null;

    const payload = {
      message: content.trim(),
      attachment: toAnnouncementAttachment(media),
    };

    const created = await createUniversityAnnouncement(payload);
    setAnnouncements((prev) => [created, ...prev].slice(0, 50));
    return created;
  };

  const handlePost = async () => {
    try {
      setPosting(true);
      const created = await postAnnouncement();
      if (!created) {
        toast.error("Please add a message or attachment.");
        return;
      }
      setMessage("");
      setAttachment(null);
      toast.success("Announcement posted");
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to post announcement");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="h-full w-full overflow-auto p-6 bg-slate-50">
      <div className="max-w-[1500px] mx-auto space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight">University Announcements Center</h1>
              <p className="text-sm text-slate-200 mt-2">Create campus-wide updates, share files, and keep students and teachers in sync.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => loadAnnouncements(false, true)} className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold">
                Refresh
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
            <div className="rounded-lg bg-white/10 p-3 border border-white/15">
              <p className="text-xs uppercase tracking-wider text-slate-200">Total Posts Loaded</p>
              <p className="text-2xl font-black mt-1">{stats.total}</p>
            </div>
            <div className="rounded-lg bg-white/10 p-3 border border-white/15">
              <p className="text-xs uppercase tracking-wider text-slate-200">Posts With Attachments</p>
              <p className="text-2xl font-black mt-1">{stats.withFiles}</p>
            </div>
            <div className="rounded-lg bg-white/10 p-3 border border-white/15">
              <p className="text-xs uppercase tracking-wider text-slate-200">Image Announcements</p>
              <p className="text-2xl font-black mt-1">{stats.imagePosts}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 rounded-2xl bg-white border border-slate-200 shadow-sm p-5 h-fit">
            <h2 className="text-lg font-black text-slate-800">New Announcement</h2>
            <p className="text-xs text-slate-500 mt-1">This will be visible to all students and teachers on home widgets.</p>

            <div className="mt-4 space-y-3">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Type your university-wide message..."
              />

              <div className="flex flex-wrap items-center gap-2">
                <label className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold cursor-pointer hover:bg-slate-100">
                  {uploading ? "Uploading..." : "Attach file/image"}
                  <input type="file" className="hidden" accept={ACCEPTED_ATTACHMENT_EXTENSIONS} onChange={onAttachmentSelect} />
                </label>
                <button
                  type="button"
                  onClick={handlePost}
                  disabled={posting || uploading || ((!message || !message.trim()) && !attachment)}
                  className="ml-auto px-4 py-2 rounded-lg bg-black text-white text-sm font-bold disabled:opacity-40"
                >
                  {posting ? "Posting..." : "Post Now"}
                </button>
              </div>

              {attachment ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-700 break-all">{attachment.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{attachment.mimeType || attachment.type || ""} {attachment.size ? `• ${fileSizeLabel(attachment.size)}` : ""}</p>
                    </div>
                    <button type="button" onClick={() => setAttachment(null)} className="text-xs font-bold text-red-600 hover:underline">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">No attachment selected.</p>
              )}
            </div>
          </div>

          <div className="xl:col-span-2 rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h2 className="text-lg font-black text-slate-800">Posted Announcements</h2>
            <p className="text-xs text-slate-500 mt-1">Most recent campus-wide posts with attachment previews and download links.</p>

            {loading ? (
              <div className="h-40 flex items-center justify-center">
                <LoadingState size="sm" />
              </div>
            ) : announcements.length === 0 ? (
              <p className="text-sm text-slate-400 mt-4">No announcements posted yet.</p>
            ) : (
              <div className="mt-4 space-y-3 max-h-[62vh] overflow-auto pr-1">
                {announcements.map((item) => (
                  <div key={item._id} className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        {item.createdBy?.name || "Admin"} • {formatDate(item.createdAt)}
                      </p>
                      {resolveAttachmentUrl(item.attachment) ? (
                        <a
                          href={resolveAttachmentUrl(item.attachment)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          {item.attachment.kind === "image" ? "Open image" : "Download attachment"}
                        </a>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400">Text only</span>
                      )}
                    </div>

                    <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                      {item.message || item.attachment?.name || "Attachment only"}
                    </p>

                    {item.attachment?.kind === "image" && resolveAttachmentUrl(item.attachment) ? (
                      <div className="mt-3">
                        <img src={resolveAttachmentUrl(item.attachment)} alt={item.attachment.name || "announcement"} className="rounded-lg border border-slate-200 max-h-56 object-cover" />
                      </div>
                    ) : null}

                    {item.attachment?.kind === "file" && item.attachment?.name ? (
                      <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <span className="text-xs font-bold text-slate-700">{item.attachment.name}</span>
                        {item.attachment.size ? <span className="text-[11px] text-slate-500">({fileSizeLabel(item.attachment.size)})</span> : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
