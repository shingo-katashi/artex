"use client";

import * as React from "react";

import { LibraryIcon, PlusIcon, SaveIcon, Settings2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { AssetInterceptRulesEditor } from "@/components/asset-intercept-rules-editor";
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
 Combobox,
 ComboboxContent,
 ComboboxEmpty,
 ComboboxInput,
 ComboboxItem,
 ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { AssetInterceptRuleInput, TaskCategory, TaskTemplate } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TemplateDraft {
 name: string;
 description: string;
 goal: string;
 categoryID: number | null;
 interceptRules: AssetInterceptRuleInput[];
}

// TemplateSeed 는「를템플릿」부터생성단값。
type TemplateSeed = Pick<TemplateDraft, "description" | "goal" | "categoryID" | "interceptRules">;

interface TaskTemplateManagerProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 templates: TaskTemplate[];
 seed: TemplateSeed | null;
 onCreated: (template: TaskTemplate) => void;
 onUpdated: (template: TaskTemplate) => void;
 onDeleted: (id: number) => void;
}

const emptyDraft = (): TemplateDraft => ({
 name: "",
 description: "",
 goal: "",
 categoryID: null,
 interceptRules: [],
});

function templateDraft(template: TaskTemplate): TemplateDraft {
 return {
 name: template.name,
 description: template.description,
 goal: template.goal,
 categoryID: template.category_id ?? null,
 interceptRules: template.intercept_rules ?? [],
 };
}

function TaskTemplateManager({
 open,
 onOpenChange,
 templates,
 seed,
 onCreated,
 onUpdated,
 onDeleted,
}: TaskTemplateManagerProps) {
 const [selectedID, setSelectedID] = React.useState<number | null>(null);
 const [draft, setDraft] = React.useState<TemplateDraft>(emptyDraft);
 const [saving, setSaving] = React.useState(false);
 const [deleteOpen, setDeleteOpen] = React.useState(false);
 const [deleting, setDeleting] = React.useState(false);
 const [categories, setCategories] = React.useState<TaskCategory[]>([]);
 const wasOpen = React.useRef(false);

 React.useEffect(() => {
 if (!open) return;
 api
 .taskCategories()
 .then(setCategories)
 .catch(() => setCategories([]));
 }, [open]);

 React.useEffect(() => {
 if (open && !wasOpen.current) {
 if (seed) {
 setSelectedID(null);
 setDraft({
 name: "",
 description: seed.description,
 goal: seed.goal,
 categoryID: seed.categoryID,
 interceptRules: seed.interceptRules,
 });
 } else if (templates[0]) {
 setSelectedID(templates[0].id);
 setDraft(templateDraft(templates[0]));
 } else {
 setSelectedID(null);
 setDraft(emptyDraft());
 }
 }
 wasOpen.current = open;
 }, [open, seed, templates]);

 const selectTemplate = (template: TaskTemplate) => {
 setSelectedID(template.id);
 setDraft(templateDraft(template));
 };

 const startNew = () => {
 setSelectedID(null);
 setDraft(emptyDraft());
 };

 const updateDraft = (field: "name" | "description" | "goal", value: string) => {
 setDraft((current) => ({ ...current, [field]: value }));
 };

 const patchDraft = (patch: Partial<TemplateDraft>) => {
 setDraft((current) => ({ ...current, ...patch }));
 };

 async function save() {
 const input = {
 name: draft.name.trim(),
 description: draft.description.trim(),
 goal: draft.goal.trim(),
 category_id: draft.categoryID,
 intercept_rules: draft.interceptRules
 .map((r) => ({ ...r, pattern: r.pattern.trim() }))
 .filter((r) => r.pattern !== ""),
 };
 if (!input.name || !input.description || !input.goal) {
 toast.error("템플릿 이름, 설명, 목표를 입력하세요");
 return;
 }
 setSaving(true);
 try {
 if (selectedID == null) {
 const created = await api.createTaskTemplate(input);
 onCreated(created);
 setSelectedID(created.id);
 setDraft(templateDraft(created));
 toast.success("템플릿생성됨");
 } else {
 const updated = await api.updateTaskTemplate(selectedID, input);
 onUpdated(updated);
 setDraft(templateDraft(updated));
 toast.success("템플릿업데이트");
 }
 } catch (error) {
 toast.error(`저장 실패: ${(error as Error).message}`);
 } finally {
 setSaving(false);
 }
 }

 async function remove() {
 if (selectedID == null) return;
 const deletedID = selectedID;
 setDeleting(true);
 try {
 await api.deleteTaskTemplate(deletedID);
 onDeleted(deletedID);
 const next = templates.find((template) => template.id !== deletedID);
 if (next) {
 setSelectedID(next.id);
 setDraft(templateDraft(next));
 } else {
 startNew();
 }
 setDeleteOpen(false);
 toast.success("템플릿삭제");
 } catch (error) {
 toast.error(`삭제 실패: ${(error as Error).message}`);
 } finally {
 setDeleting(false);
 }
 }

 let saveLabel = saving ? "저장 중" : "변경 사항 저장";
 if (!saving && selectedID == null) saveLabel = "생성템플릿";

 return (
 <>
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent className="grid h-full w-full! max-w-none! grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:w-[48rem]! sm:max-w-[48rem]!">
 <SheetHeader className="border-b px-6 py-5">
 <SheetTitle>작업템플릿관리</SheetTitle>
 <SheetDescription>템플릿저장설명、목표、분류·작업급차단/허용규칙；변경않음영향이미생성작업。</SheetDescription>
 </SheetHeader>
 <div className="grid min-h-0 overflow-y-auto lg:grid-cols-[15rem_minmax(0,1fr)] lg:overflow-hidden">
 <div className="flex min-h-0 flex-col border-b p-3 lg:border-r lg:border-b-0">
 <Button type="button" variant="outline" className="w-full" onClick={startNew}>
 <PlusIcon data-icon="inline-start" />
 새로 생성템플릿
 </Button>
 <ScrollArea className="mt-2 max-h-44 lg:max-h-none lg:flex-1">
 <div className="flex flex-col gap-1 pr-2">
 {templates.length === 0 && (
 <p className="px-2 py-6 text-center text-muted-foreground text-sm">없음템플릿</p>
 )}
 {templates.map((template) => (
 <button
 key={template.id}
 type="button"
 className={cn(
 "min-w-0 rounded-md px-2.5 py-2 text-left transition-colors",
 selectedID === template.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
 )}
 onClick={() => selectTemplate(template)}
 >
 <span className="block truncate font-medium text-sm">{template.name}</span>
 <span className="block truncate text-muted-foreground text-xs">{template.description}</span>
 </button>
 ))}
 </div>
 </ScrollArea>
 </div>
 <ScrollArea className="min-h-0">
 <FieldGroup className="p-6">
 <Field>
 <FieldLabel htmlFor="task-template-name">템플릿이름</FieldLabel>
 <Input
 id="task-template-name"
 value={draft.name}
 maxLength={120}
 placeholder="예:：외부 Web 모의해킹"
 onChange={(event) => updateDraft("name", event.target.value)}
 />
 </Field>
 <Field>
 <FieldLabel htmlFor="task-template-description">설명</FieldLabel>
 <Textarea
 id="task-template-description"
 className="min-h-28"
 value={draft.description}
 placeholder="테스트대상·"
 onChange={(event) => updateDraft("description", event.target.value)}
 />
 </Field>
 <Field>
 <FieldLabel htmlFor="task-template-goal">목표</FieldLabel>
 <Textarea
 id="task-template-goal"
 className="min-h-28"
 value={draft.goal}
 placeholder="작업필요달성목표"
 onChange={(event) => updateDraft("goal", event.target.value)}
 />
 </Field>
 <Field>
 <FieldLabel htmlFor="task-template-category">작업 분류</FieldLabel>
 <NativeSelect
 id="task-template-category"
 className="w-full"
 value={draft.categoryID == null ? "" : String(draft.categoryID)}
 onChange={(event) =>
 patchDraft({ categoryID: event.target.value === "" ? null : Number(event.target.value) })
 }
 >
 <NativeSelectOption value="">미분류</NativeSelectOption>
 {categories.map((c) => (
 <NativeSelectOption key={c.id} value={String(c.id)}>
 {c.name}
 </NativeSelectOption>
 ))}
 </NativeSelect>
 <FieldDescription>애플리케이션템플릿이분류（）。</FieldDescription>
 </Field>
 <Field>
 <FieldLabel>작업급차단 / 허용규칙</FieldLabel>
 <AssetInterceptRulesEditor
 value={draft.interceptRules}
 onChange={(rules) => patchDraft({ interceptRules: rules })}
 />
 <FieldDescription>
 애플리케이션템플릿작업급규칙（차단/허용，대상신작업적용，안 전역）。
 </FieldDescription>
 </Field>
 </FieldGroup>
 </ScrollArea>
 </div>
 <SheetFooter className="border-t px-6 py-4 sm:flex-row sm:items-center">
 {selectedID != null && (
 <Button type="button" variant="destructive" className="sm:mr-auto" onClick={() => setDeleteOpen(true)}>
 <Trash2Icon data-icon="inline-start" />
 삭제템플릿
 </Button>
 )}
 <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
 꺼짐
 </Button>
 <Button type="button" disabled={saving} onClick={() => void save()}>
 {saving ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}
 {saveLabel}
 </Button>
 </SheetFooter>
 </SheetContent>
 </Sheet>
 <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>삭제템플릿「{draft.name || "이름 없음템플릿"}」？</AlertDialogTitle>
 <AlertDialogDescription>에 의해해당템플릿생성작업않음까지영향。</AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
 <AlertDialogAction
 variant="destructive"
 disabled={deleting}
 onClick={(event) => {
 event.preventDefault();
 void remove();
 }}
 >
 {deleting && <Spinner data-icon="inline-start" />}
 {deleting ? "삭제 중" : "삭제"}
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 </>
 );
}

interface TaskTemplateControlsProps {
 description: string;
 goal: string;
 categoryID?: number;
 interceptRules?: AssetInterceptRuleInput[];
 selectedTemplateID: number | null;
 onSelectedTemplateIDChange: (id: number | null) => void;
 onApply: (template: TaskTemplate) => void;
 portalContainer?: React.RefObject<HTMLElement | null>;
}

export function TaskTemplateControls({
 description,
 goal,
 categoryID,
 interceptRules,
 selectedTemplateID,
 onSelectedTemplateIDChange,
 onApply,
 portalContainer,
}: TaskTemplateControlsProps) {
 const [templates, setTemplates] = React.useState<TaskTemplate[]>([]);
 const [loading, setLoading] = React.useState(true);
 const [templateInputValue, setTemplateInputValue] = React.useState("");
 const [pendingTemplate, setPendingTemplate] = React.useState<TaskTemplate | null>(null);
 const [managerOpen, setManagerOpen] = React.useState(false);
 const [managerSeed, setManagerSeed] = React.useState<TemplateSeed | null>(null);

 const loadTemplates = React.useCallback(async () => {
 setLoading(true);
 try {
 setTemplates(await api.taskTemplates());
 } catch (error) {
 setTemplates([]);
 toast.error(`불러오기템플릿실패：${(error as Error).message}`);
 } finally {
 setLoading(false);
 }
 }, []);

 React.useEffect(() => {
 void loadTemplates();
 }, [loadTemplates]);

 const selectedTemplate = React.useMemo(
 () => templates.find((template) => template.id === selectedTemplateID) ?? null,
 [selectedTemplateID, templates],
 );

 React.useEffect(() => {
 setTemplateInputValue(selectedTemplate?.name ?? "");
 }, [selectedTemplate]);

 const applyTemplate = (template: TaskTemplate) => {
 onApply(template);
 onSelectedTemplateIDChange(template.id);
 setPendingTemplate(null);
 };

 const chooseTemplate = (template: TaskTemplate | null) => {
 if (!template) {
 setTemplateInputValue("");
 onSelectedTemplateIDChange(null);
 return;
 }
 setTemplateInputValue(template.name);
 const hasContent = description.trim() !== "" || goal.trim() !== "";
 const changesContent = description !== template.description || goal !== template.goal;
 if (hasContent && changesContent) {
 setPendingTemplate(template);
 return;
 }
 applyTemplate(template);
 };

 const openManager = (seed: TemplateSeed | null) => {
 setManagerSeed(seed);
 setManagerOpen(true);
 };

 const upsertTemplate = (template: TaskTemplate) => {
 setTemplates((current) => [template, ...current.filter((item) => item.id !== template.id)]);
 };

 const deleteTemplate = (id: number) => {
 setTemplates((current) => current.filter((template) => template.id !== id));
 if (selectedTemplateID === id) onSelectedTemplateIDChange(null);
 };

 let pickerPlaceholder = loading ? "진행 중불러오기템플릿" : "작업 없음템플릿";
 if (!loading && templates.length > 0) pickerPlaceholder = "검색선택작업템플릿";

 return (
 <>
 <Field>
 <div className="flex flex-wrap items-center justify-between gap-2">
 <FieldLabel htmlFor="task-template-picker">작업템플릿</FieldLabel>
 <div className="flex flex-wrap gap-2">
 <Button type="button" variant="ghost" size="sm" onClick={() => openManager(null)}>
 <Settings2Icon data-icon="inline-start" />
 관리템플릿
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 disabled={!description.trim() || !goal.trim()}
 onClick={() =>
 openManager({
 description,
 goal,
 categoryID: categoryID ?? null,
 interceptRules: interceptRules ?? [],
 })
 }
 >
 <SaveIcon data-icon="inline-start" />
 를템플릿
 </Button>
 </div>
 </div>
 <Combobox
 items={templates}
 itemToStringLabel={(template) => template.name}
 itemToStringValue={(template) => String(template.id)}
 inputValue={templateInputValue}
 onInputValueChange={(value) => setTemplateInputValue(value)}
 value={selectedTemplate}
 onValueChange={chooseTemplate}
 >
 <ComboboxInput
 id="task-template-picker"
 className="w-full"
 placeholder={pickerPlaceholder}
 disabled={loading || templates.length === 0}
 showClear
 />
 <ComboboxContent portalContainer={portalContainer}>
 <ComboboxEmpty>없음일치템플릿</ComboboxEmpty>
 <ComboboxList>
 {(template) => (
 <ComboboxItem key={template.id} value={template}>
 <LibraryIcon />
 <div className="min-w-0 flex-1">
 <p className="truncate font-medium text-sm">{template.name}</p>
 {template.description && (
 <p className="truncate text-muted-foreground text-xs">{template.description}</p>
 )}
 </div>
 </ComboboxItem>
 )}
 </ComboboxList>
 </ComboboxContent>
 </Combobox>
 <FieldDescription>선택후복사템플릿설명、목표、분류·작업급규칙，안 ·템플릿유지연관。</FieldDescription>
 </Field>

 <AlertDialog
 open={pendingTemplate != null}
 onOpenChange={(open) => {
 if (open) return;
 setPendingTemplate(null);
 setTemplateInputValue(selectedTemplate?.name ?? "");
 }}
 >
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>템플릿「{pendingTemplate?.name}」？</AlertDialogTitle>
 <AlertDialogDescription>현재입력설명목표템플릿내커버。</AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>취소</AlertDialogCancel>
 <AlertDialogAction onClick={() => pendingTemplate && applyTemplate(pendingTemplate)}>
 커버
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>

 <TaskTemplateManager
 open={managerOpen}
 onOpenChange={setManagerOpen}
 templates={templates}
 seed={managerSeed}
 onCreated={upsertTemplate}
 onUpdated={upsertTemplate}
 onDeleted={deleteTemplate}
 />
 </>
 );
}
