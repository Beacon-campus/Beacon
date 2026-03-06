import Modal from "../ui/Modal";

export default function ConfirmDeleteModal({ open, onClose, onConfirm }) {
    if (!open) return null;

    return (
    <Modal
        isOpen={open}
        onClose={onClose}
        className="max-w-sm h-auto p-6 block"
    >

            <h2 className="text-lg font-semibold mb-4 text-center">
            Delete Task?
            </h2>

            <p className="text-sm text-gray-600 text-center mb-6">
            Are you sure you want to delete this task?
            <br />
            This action cannot be undone.
            </p>

            <div className="flex gap-3">
            <button
                onClick={onClose}
                className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300"
            >
                Cancel
            </button>

            <button
                onClick={() => {
                onConfirm();
                onClose();
                }}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
            >
                Delete
            </button>
            </div>
    </Modal>
    );
}