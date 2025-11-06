import { cn } from "@/components/ui/lib/utils.ts";

export function getEmojiSource(emoji: string): string {
  return `https://registry.npmmirror.com/@lobehub/fluent-emoji-3d/latest/files/assets/${emoji}.webp`;
}

type EmojiProps = {
  emoji: string;
  className?: string;
};

function Emoji({ emoji, className }: EmojiProps) {
  return (
    <img
      className={cn("select-none", className)}
      src={getEmojiSource(emoji)}
      alt={""}
    />
  );
}

export default Emoji;
