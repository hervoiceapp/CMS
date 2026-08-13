"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import { cn } from "@/lib/utils";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Heading01Icon,
  Heading02Icon,
  Heading03Icon,
  TextBoldIcon,
  TextItalicIcon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  QuoteUpIcon,
  Image01Icon,
  Link01Icon,
  UndoIcon,
  RedoIcon,
  Maximize01Icon,
  Minimize01Icon,
} from "@hugeicons/core-free-icons";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

function ToolbarButton({
  onClick,
  active,
  title,
  icon,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  icon: IconSvgElement;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md transition-colors",
        active ? "bg-primary/15 text-primary" : "hover:bg-muted",
      )}
    >
      <HugeiconsIcon icon={icon} className="size-4" />
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 w-px self-stretch bg-border" />;
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [fullscreen, setFullscreen] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit, ImageExtension, LinkExtension.configure({ openOnClick: false })],
    content,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[240px] px-4 py-3 outline-none focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  const addImage = () => {
    const url = window.prompt("Image URL");
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  };

  const setLink = () => {
    const url = window.prompt("Link URL");
    if (url) editor?.chain().focus().setLink({ href: url }).run();
  };

  return (
    <>
      {fullscreen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setFullscreen(false)}
          aria-hidden
        />
      )}
      <div
        className={cn(
          "overflow-hidden rounded-2xl border bg-card",
          fullscreen && "fixed inset-4 z-50 flex flex-col shadow-2xl",
        )}
      >
        <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-2">
          <ToolbarButton
            title="Heading 1"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor?.isActive("heading", { level: 1 })}
            icon={Heading01Icon}
          />
          <ToolbarButton
            title="Heading 2"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor?.isActive("heading", { level: 2 })}
            icon={Heading02Icon}
          />
          <ToolbarButton
            title="Heading 3"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor?.isActive("heading", { level: 3 })}
            icon={Heading03Icon}
          />
          <ToolbarDivider />
          <ToolbarButton
            title="Bold"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive("bold")}
            icon={TextBoldIcon}
          />
          <ToolbarButton
            title="Italic"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive("italic")}
            icon={TextItalicIcon}
          />
          <ToolbarDivider />
          <ToolbarButton
            title="Bullet list"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={editor?.isActive("bulletList")}
            icon={LeftToRightListBulletIcon}
          />
          <ToolbarButton
            title="Ordered list"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            active={editor?.isActive("orderedList")}
            icon={LeftToRightListNumberIcon}
          />
          <ToolbarButton
            title="Blockquote"
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            active={editor?.isActive("blockquote")}
            icon={QuoteUpIcon}
          />
          <ToolbarDivider />
          <ToolbarButton title="Insert image" onClick={addImage} icon={Image01Icon} />
          <ToolbarButton
            title="Insert link"
            onClick={setLink}
            active={editor?.isActive("link")}
            icon={Link01Icon}
          />
          <ToolbarDivider />
          <ToolbarButton
            title="Undo"
            onClick={() => editor?.chain().focus().undo().run()}
            icon={UndoIcon}
          />
          <ToolbarButton
            title="Redo"
            onClick={() => editor?.chain().focus().redo().run()}
            icon={RedoIcon}
          />
          <div className="ml-auto">
            <ToolbarButton
              title={fullscreen ? "Exit fullscreen" : "Fullscreen writing mode"}
              onClick={() => setFullscreen((f) => !f)}
              active={fullscreen}
              icon={fullscreen ? Minimize01Icon : Maximize01Icon}
            />
          </div>
        </div>
        <div className={cn(fullscreen && "min-h-0 flex-1 overflow-y-auto")}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </>
  );
}
