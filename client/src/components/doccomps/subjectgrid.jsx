export default function SubjectGrid({ role, onSelect }) {
  const items =
    role === "teacher"
      ? [
          {
            id: 1,
            title: "BCA Sem 1 • Shift 3",
            subtitle: "You teach Python",
          },
          {
            id: 2,
            title: "BCA Sem 2 • Shift 1",
            subtitle: "You teach DBMS",
          },
        ]
      : [
          {
            id: 1,
            title: "Python",
            subtitle: "Core Programming",
          },
          {
            id: 2,
            title: "DBMS",
            subtitle: "Databases",
          },
        ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-primary">
        {role === "teacher" ? "Available Classes" : "Subjects"}
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.title)}
            className="border rounded-xl p-5 bg-white hover:bg-gray-50 text-left transition"
          >
            <p className="font-medium text-primary">
              {item.title}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {item.subtitle}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
