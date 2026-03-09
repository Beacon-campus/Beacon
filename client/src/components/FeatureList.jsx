import { FEATURE_NAMES } from "../utils/feature.constants";

export default function FeatureList({ unlocked, onNameClick }) {
  return (
    <ul className="list-disc pl-5 space-y-2">
      {FEATURE_NAMES.map((name) => (
        <li key={name}>
          {unlocked ? (
            <button
              type="button"
              onClick={() => onNameClick?.(name)}
              className="text-left text-primary underline-offset-2 hover:underline cursor-pointer"
            >
              {name}
            </button>
          ) : (
            <span>{name}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

