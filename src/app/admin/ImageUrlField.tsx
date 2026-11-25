import MenuImage from "../MenuImage";
import { IMAGE_URL_MAX_LENGTH, validateMenuImageUrl } from "@/lib/menu-image";

export default function ImageUrlField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { url, error } = validateMenuImageUrl(value);

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-bold tracking-wider">
        IMAGE URL <span className="font-normal text-gray-600">(optional)</span>
      </label>
      <input
        ref={(input) => { input?.setCustomValidity(error ?? ""); }}
        id={id}
        type="url"
        inputMode="url"
        maxLength={IMAGE_URL_MAX_LENGTH}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder="https://images.unsplash.com/photo-…"
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-help`}
        className="w-full rounded-md border border-gray-200 bg-gray-50 px-4 py-4 text-sm outline-none focus:border-green-700"
      />
      <p id={`${id}-help`} className={`mt-2 text-xs ${error ? "text-red-700" : "text-gray-600"}`}>
        {error ?? "Use a direct HTTPS image URL, such as one from images.unsplash.com."}
      </p>
      {url && (
        <div className="mt-4 max-w-xs">
          <MenuImage key={url} url={url} preview />
        </div>
      )}
    </div>
  );
}
