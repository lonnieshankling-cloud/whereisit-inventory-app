import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface EmojiPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  currentEmoji?: string;
}

const LOCATION_EMOJIS = [
  "🏠", "🏡", "🏢", "🏪", "🏫", "🏬", "🏭", "🏯",
  "🍳", "🛏️", "🚗", "🚙", "🛋️", "🪑", "🚪", "🪟",
  "📦", "📚", "📖", "🗄️", "🗃️", "🗂️", "📁", "📋",
  "🧰", "🔧", "🔨", "⚙️", "🛠️", "🪛", "🔩", "⚡",
  "🎮", "🎯", "🎨", "🎭", "🎪", "🎬", "🎤", "🎧",
  "👕", "👔", "👗", "👠", "👞", "🧥", "🧦", "🎒",
  "🏋️", "⚽", "🏀", "⚾", "🎾", "🏐", "🥊", "🥋",
  "🧺", "🧹", "🧽", "🧴", "🧻", "🧪", "🧬", "🔬",
  "💼", "💻", "⌨️", "🖥️", "🖨️", "📱", "☎️", "📞",
  "🌳", "🌲", "🌴", "🌵", "🌾", "🌿", "🍀", "🌺",
];

export function EmojiPicker({ open, onClose, onSelect, currentEmoji }: EmojiPickerProps) {
  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Choose Location Icon</DialogTitle>
          <DialogDescription>
            Select an emoji to represent this location
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-8 gap-2 py-4">
          {LOCATION_EMOJIS.map((emoji) => (
            <Button
              key={emoji}
              variant="outline"
              className={`h-12 w-12 text-2xl p-0 ${
                currentEmoji === emoji ? "ring-2 ring-indigo-500" : ""
              }`}
              onClick={() => handleSelect(emoji)}
            >
              {emoji}
            </Button>
          ))}
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
