import React from "react";
import { getAvatarUrl } from "../../utils/avatarUtils";

export default function UserListItem({
    user,
    isSelected = false,
    onClick,
    subText,
    badgeText,
    badgeColor = "green",
    actionLabel,
    onActionClick
}) {
    // Determine the ID depending on whether it's a profile array item, a chat participant, or firebase user
    const id = user._id || user.id || Math.random().toString();

    // Safely extract profile properties natively or from a nested .profile
    const name = user.profile?.name || user.name || "User";
    const regno = user.profile?.regno || user.regno || "";
    const role = user.role || "";
    const avatar = getAvatarUrl(user.profile?.avatar || user.avatar);

    const calculatedSubText = subText || `${role} ${regno ? '• ' + regno : ''}`;

    const getBadgeClasses = (color) => {
        switch (color) {
            case "green": return "bg-green-100 text-green-700 border-green-200";
            case "blue": return "bg-blue-100 text-blue-700 border-blue-200";
            case "red": return "bg-red-100 text-red-700 border-red-200";
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    return (
        <div
            onClick={() => onClick && onClick(user)}
            className={`flex items-center gap-3 p-3 rounded-2xl transition-all border ${onClick ? "cursor-pointer" : ""
                } ${isSelected
                    ? "bg-black/5 border-black/10"
                    : onClick
                        ? "hover:bg-gray-50 border-transparent"
                        : "border-transparent"
                } group`}
        >
            {/* Optional Select Checkbox Circle */}
            {onClick && isSelected !== undefined && onActionClick === undefined && (
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? "bg-black border-black" : "border-gray-200"
                    }`}>
                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
            )}

            <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden border border-gray-100 shrink-0">
                <img
                    src={avatar}
                    className="w-full h-full object-cover"
                    alt={name}
                    onError={(e) => { e.target.style.display = 'none' }}
                />
            </div>

            <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-gray-800 truncate leading-none mb-1">
                    {name}
                </h4>
                <p className="text-[9px] font-bold text-gray-400 uppercase truncate tracking-wide">
                    {calculatedSubText}
                </p>
            </div>

            {/* Badge Array (e.g. Owner/Admin) */}
            {badgeText && (
                <span className={`text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase shrink-0 ${getBadgeClasses(badgeColor)}`}>
                    {badgeText}
                </span>
            )}

            {/* Action text block (e.g. Promote/Remove on hover) */}
            {onActionClick && (
                <button
                    onClick={(e) => { e.stopPropagation(); onActionClick(user); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] text-indigo-600 font-black uppercase tracking-widest hover:underline px-2"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
