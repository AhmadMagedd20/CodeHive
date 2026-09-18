"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Pencil,
  X,
  Save,
  Star,
  Coins,
} from "lucide-react";
import type { LessonType } from "@prisma/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { LESSON_TYPE_META, LESSON_TYPE_ORDER } from "@/components/lesson-type";
import { formatPrice } from "@/lib/money";
import { ContentUpload } from "./content-upload";
import {
  createModule,
  updateModule,
  deleteModule,
  toggleModulePublish,
  moveModule,
  createItem,
  updateItem,
  updateItemBody,
  deleteItem,
  toggleItemPublish,
  toggleItemFreePreview,
  toggleItemExtra,
  moveItem,
} from "./actions";

export type ItemDTO = {
  id: string;
  type: LessonType;
  title: string;
  isPublished: boolean;
  isFreePreview: boolean;
  isExtra: boolean;
  publishAt: string | null;
  body: string | null;
  chapters: string | null;
  hasContent: boolean;
};
export type ModuleDTO = {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  publishAt: string | null;
  prerequisiteModuleId: string | null;
  /** Phase 5 — per-week price in EGP piastres. Null = full course only. */
  priceCents: number | null;
  salePriceCents: number | null;
  items: ItemDTO[];
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function StatusBadge({ isPublished, publishAt }: { isPublished: boolean; publishAt: string | null }) {
  if (isPublished) return <Badge variant="success">Published</Badge>;
  if (publishAt && new Date(publishAt) > new Date()) return <Badge variant="warning">Scheduled</Badge>;
  return <Badge variant="secondary">Draft</Badge>;
}

/**
 * Shows whether this week is sold on its own, straight on the collapsed card.
 * Without it, a priced and an unpriced week are indistinguishable and the
 * per-week pricing feature is invisible until you open the editor.
 */
function ModulePriceBadge({
  priceCents,
  salePriceCents,
}: {
  priceCents: number | null;
  salePriceCents: number | null;
}) {
  if (priceCents == null || priceCents <= 0) {
    return <Badge variant="outline">Full course only</Badge>;
  }
  const onSale = salePriceCents != null && salePriceCents < priceCents;
  return (
    <Badge variant="highlight">
      <Coins />
      {formatPrice(onSale ? salePriceCents! : priceCents)}
      {onSale && (
        <span className="ml-1 font-normal line-through opacity-60">{formatPrice(priceCents)}</span>
      )}
    </Badge>
  );
}

/** A one-button <form> firing a server action with hidden fields. */
function IconForm({
  action,
  fields,
  title,
  confirm,
  className,
  children,
  disabled,
}: {
  action: (fd: FormData) => Promise<void>;
  fields: Record<string, string>;
  title: string;
  confirm?: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        title={title}
        aria-label={title}
        disabled={disabled}
        className={
          className ??
          "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
        }
      >
        {children}
      </button>
    </form>
  );
}

function ItemRow({ item, isFirst, isLast }: { item: ItemDTO; isFirst: boolean; isLast: boolean }) {
  const [editing, setEditing] = useState(false);
  const [editingBody, setEditingBody] = useState(false);
  const { Icon, label } = LESSON_TYPE_META[item.type];

  return (
    <div className="rounded-lg border bg-background">
      <div className="flex items-center gap-2 px-3 py-2">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
        <Badge variant="outline" className="hidden sm:inline-flex">
          {label}
        </Badge>
        <StatusBadge isPublished={item.isPublished} publishAt={item.publishAt} />
        {item.isFreePreview && <Badge variant="highlight">Free preview</Badge>}
        {item.isExtra && <Badge variant="warning">Paid extra</Badge>}
        <div className="flex items-center">
          <IconForm action={moveItem} fields={{ itemId: item.id, dir: "up" }} title="Move up" disabled={isFirst}>
            <ChevronUp className="h-4 w-4" />
          </IconForm>
          <IconForm action={moveItem} fields={{ itemId: item.id, dir: "down" }} title="Move down" disabled={isLast}>
            <ChevronDown className="h-4 w-4" />
          </IconForm>
          <IconForm
            action={toggleItemExtra}
            fields={{ itemId: item.id }}
            title={
              item.isExtra
                ? "Paid extra — make it a free lecture"
                : "Mark as paid extra (lab/LeetCode); in-person students pay to unlock"
            }
          >
            <Coins className={item.isExtra ? "h-4 w-4 fill-warning text-warning-strong" : "h-4 w-4"} />
          </IconForm>
          <IconForm
            action={toggleItemFreePreview}
            fields={{ itemId: item.id }}
            title={item.isFreePreview ? "Remove free preview" : "Make free preview (public)"}
          >
            {item.isFreePreview ? (
              <Star className="h-4 w-4 fill-highlight text-highlight-strong" />
            ) : (
              <Star className="h-4 w-4" />
            )}
          </IconForm>
          <IconForm
            action={toggleItemPublish}
            fields={{ itemId: item.id }}
            title={item.isPublished ? "Unpublish" : "Publish"}
          >
            {item.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </IconForm>
          <button
            type="button"
            title="Edit"
            onClick={() => setEditing((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <IconForm
            action={deleteItem}
            fields={{ itemId: item.id }}
            title="Delete"
            confirm={`Delete "${item.title}"? This can't be undone.`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </IconForm>
        </div>
      </div>

      {editing && (
        <form action={updateItem} className="flex flex-wrap items-end gap-2 border-t px-3 py-3">
          <input type="hidden" name="itemId" value={item.id} />
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Title</Label>
            <Input name="title" defaultValue={item.title} required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Scheduled publish (optional)</Label>
            <Input type="datetime-local" name="publishAt" defaultValue={toLocalInput(item.publishAt)} />
          </div>
          {item.type === "VIDEO" && (
            <div className="w-full space-y-1">
              <Label className="text-xs">Chapters (optional) — one “M:SS Label” per line</Label>
              <Textarea
                name="chapters"
                defaultValue={item.chapters ?? ""}
                rows={4}
                placeholder={"0:00 Intro\n2:34 Setting up\n7:10 Worked example"}
                className="font-mono text-sm"
              />
            </div>
          )}
          <SubmitButton size="sm" pendingText="Saving…">
            Save
          </SubmitButton>
        </form>
      )}

      {item.type === "RICH_TEXT" && (
        <div className="border-t px-3 py-2">
          {editingBody ? (
            <form action={updateItemBody} className="space-y-2">
              <input type="hidden" name="itemId" value={item.id} />
              <Textarea
                name="body"
                defaultValue={item.body ?? ""}
                rows={10}
                placeholder="Write lesson content in Markdown. Fenced ``` code blocks are supported."
                className="font-mono text-sm"
              />
              <div className="flex gap-2">
                <SubmitButton size="sm" pendingText="Saving…">
                  <Save className="h-4 w-4" /> Save content
                </SubmitButton>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingBody(false)}>
                  Close
                </Button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setEditingBody(true)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {item.body ? "Edit reading content" : "Add reading content"} (Markdown)
            </button>
          )}
        </div>
      )}

      {(item.type === "VIDEO" || item.type === "DOCUMENT") && (
        <div className="border-t px-3 py-2">
          <ContentUpload itemId={item.id} type={item.type} hasContent={item.hasContent} />
        </div>
      )}

      {item.type === "QUIZ" && (
        <div className="border-t px-3 py-2">
          <Link href={`/admin/quiz/${item.id}`} className="text-xs font-medium text-primary hover:underline">
            Configure quiz →
          </Link>
        </div>
      )}

      {item.type === "ASSIGNMENT" && (
        <div className="border-t px-3 py-2">
          <Link href={`/admin/assignment/${item.id}`} className="text-xs font-medium text-primary hover:underline">
            Configure assignment →
          </Link>
        </div>
      )}
    </div>
  );
}

function ModuleCard({
  module,
  isFirst,
  isLast,
  siblings,
}: {
  module: ModuleDTO;
  isFirst: boolean;
  isLast: boolean;
  siblings: { id: string; title: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);

  return (
    <Card>
      <CardHeader className="gap-3 space-y-0">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-display text-lg font-extrabold tracking-display">{module.title}</h3>
              <StatusBadge isPublished={module.isPublished} publishAt={module.publishAt} />
              {/* Per-week price, visible without opening the editor — otherwise
                  priced and unpriced weeks look identical and the whole
                  sell-this-week feature is invisible. */}
              <ModulePriceBadge priceCents={module.priceCents} salePriceCents={module.salePriceCents} />
            </div>
            {module.description && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{module.description}</p>
            )}
          </div>
          <div className="flex items-center">
            <IconForm action={moveModule} fields={{ moduleId: module.id, dir: "up" }} title="Move up" disabled={isFirst}>
              <ChevronUp className="h-4 w-4" />
            </IconForm>
            <IconForm action={moveModule} fields={{ moduleId: module.id, dir: "down" }} title="Move down" disabled={isLast}>
              <ChevronDown className="h-4 w-4" />
            </IconForm>
            <IconForm
              action={toggleModulePublish}
              fields={{ moduleId: module.id }}
              title={module.isPublished ? "Unpublish" : "Publish"}
            >
              {module.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </IconForm>
            {/* Explicit entry point for per-week pricing. The generic pencil
                gave no hint that price lived inside it. */}
            <button
              type="button"
              title="Set this week's price"
              onClick={() => setEditing(true)}
              className="flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Coins className="h-4 w-4" /> Price
            </button>
            <button
              type="button"
              title="Edit module"
              onClick={() => setEditing((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <IconForm
              action={deleteModule}
              fields={{ moduleId: module.id }}
              title="Delete module"
              confirm={`Delete module "${module.title}" and all its items?`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </IconForm>
          </div>
        </div>

        {editing && (
          <form action={updateModule} className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-3">
            <input type="hidden" name="moduleId" value={module.id} />
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Title</Label>
              <Input name="title" defaultValue={module.title} required />
            </div>
            <div className="w-full space-y-1 sm:flex-1">
              <Label className="text-xs">Description</Label>
              <Input name="description" defaultValue={module.description ?? ""} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Scheduled publish</Label>
              <Input type="datetime-local" name="publishAt" defaultValue={toLocalInput(module.publishAt)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Prerequisite (gating)</Label>
              <Select name="prerequisiteModuleId" defaultValue={module.prerequisiteModuleId ?? ""}>
                <option value="">None — always open</option>
                {siblings
                  .filter((s) => s.id !== module.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      After: {s.title}
                    </option>
                  ))}
              </Select>
            </div>
            <div className="w-full rounded-lg border-brutal border-ink bg-background p-3">
              <p className="mb-2 text-xs font-medium">
                Sell this week on its own{" "}
                <span className="font-normal text-muted-foreground">
                  — leave the price blank so it&apos;s only available inside the full course.
                </span>
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Week price (EGP)</Label>
                  <Input
                    name="price"
                    inputMode="decimal"
                    placeholder="e.g. 400"
                    defaultValue={module.priceCents != null ? module.priceCents / 100 : ""}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sale price (EGP)</Label>
                  <Input
                    name="salePrice"
                    inputMode="decimal"
                    placeholder="optional"
                    defaultValue={module.salePriceCents != null ? module.salePriceCents / 100 : ""}
                  />
                </div>
              </div>
            </div>
            <SubmitButton size="sm" pendingText="Saving…">
              Save
            </SubmitButton>
          </form>
        )}
      </CardHeader>

      <CardContent className="space-y-2">
        {module.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items yet.</p>
        ) : (
          module.items.map((it, i) => (
            <ItemRow key={it.id} item={it} isFirst={i === 0} isLast={i === module.items.length - 1} />
          ))
        )}

        {adding ? (
          <form action={createItem} className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed p-3">
            <input type="hidden" name="moduleId" value={module.id} />
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Item title</Label>
              <Input name="title" placeholder="e.g. Lecture 1 — Intro" required autoFocus />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select name="type" defaultValue="VIDEO">
                {LESSON_TYPE_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {LESSON_TYPE_META[t].label}
                  </option>
                ))}
              </Select>
            </div>
            <SubmitButton size="sm" pendingText="Adding…">
              Add item
            </SubmitButton>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
              <X className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add item
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function CourseBuilder({ courseId, modules }: { courseId: string; modules: ModuleDTO[] }) {
  const [addingModule, setAddingModule] = useState(false);

  return (
    <div className="space-y-4">
      {modules.map((m, i) => (
        <ModuleCard
          key={m.id}
          module={m}
          isFirst={i === 0}
          isLast={i === modules.length - 1}
          siblings={modules.map((s) => ({ id: s.id, title: s.title }))}
        />
      ))}

      {addingModule ? (
        <form action={createModule} className="flex items-end gap-2 rounded-xl border border-dashed p-4">
          <input type="hidden" name="courseId" value={courseId} />
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Module title</Label>
            <Input name="title" placeholder="e.g. Week 1 — Foundations" required autoFocus />
          </div>
          <SubmitButton pendingText="Adding…">Add module</SubmitButton>
          <Button type="button" variant="ghost" onClick={() => setAddingModule(false)}>
            <X className="h-4 w-4" />
          </Button>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setAddingModule(true)}>
          <Plus className="h-4 w-4" /> Add module
        </Button>
      )}
    </div>
  );
}
