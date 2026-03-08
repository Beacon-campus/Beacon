export const BREADCRUMB_CONFIG = {
  home: {
    label: "Home",
    default: "Dashboard",
    children: {
      home: "Dashboard",
      notes: "Notes",
      todo: "To-dos",
      sketch: "Sketch",
      calender: "Calendar",
      studybot: "Study Bot",
      notif: "Notifications",
      researchbot: "Research Bot", // teacher
      profile: "Profile"
    },
  },

  community: {
    label: "Community",
    default: "Messages",
    children: {
      classroom: "Class Room",
      classrooms: "Class Rooms", // teacher
      groups: "Groups",
      "study-materials": "Study Material",
      "publish-assignment": "Assignments",
      "upload-materials": "Upload Materials",
    },
  },
};
