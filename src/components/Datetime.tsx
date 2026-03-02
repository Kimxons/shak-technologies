import { LOCALE } from "@config";

interface DatetimeProps {
  pubDatetime: string | Date;
  modDatetime?: string | Date | null;
  size?: "sm" | "lg";
  className?: string;
}

export default function Datetime({
  pubDatetime,
  modDatetime,
  size = "sm",
  className,
}: DatetimeProps) {
  const isUpdated = !!modDatetime;
  const datetimeValue = modDatetime || pubDatetime;

  const dateOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };

  const formattedDate = new Date(datetimeValue).toLocaleDateString(
    LOCALE.langTag,
    dateOptions
  );
  const formattedTime = new Date(datetimeValue).toLocaleTimeString(
    LOCALE.langTag,
    timeOptions
  );

  return (
    <div className={`flex items-center space-x-2 opacity-80 ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`inline-block h-6 w-6 min-w-[1.375rem] fill-skin-base ${
          size === "sm" ? "scale-90" : "scale-100"
        }`}
        aria-hidden="true"
      >
        <path d="M7 11h2v2H7zm0 4h2v2H7zm4-4h2v2h-2zm0 4h2v2h-2zm4-4h2v2h-2zm0 4h2v2h-2z"></path>
        <path d="M5 22h14c1.103 0 2-.897 2-2V6c0-1.103-.897-2-2-2h-2V2h-2v2H9V2H7v2H5c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2zM19 8l.001 12H5V8h14z"></path>
      </svg>
      <span className={`italic ${size === "sm" ? "text-sm" : "text-base"}`}>
        {isUpdated ? "Updated:" : <span className="sr-only">Published:</span>}
      </span>
      <span className={`italic ${size === "sm" ? "text-sm" : "text-base"}`}>
        <time dateTime={new Date(datetimeValue).toISOString()}>
          {formattedDate}
        </time>{" "}
        <span aria-hidden="true">|</span>{" "}
        <span className="sr-only"> at </span>
        <span className="text-nowrap">{formattedTime}</span>
      </span>
    </div>
  );
}