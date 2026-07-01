import React from "react";
import {
  useUpdateReport,
  useTransitionApproval,
  useListCompanyCollaborators,
  getListCompanyCollaboratorsQueryKey,
  getGetReportQueryKey,
  type ApprovalStatus,
  type ApprovalActionInputAction,
  type CompanyCollaborator,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  draft: "Draf",
  submitted: "Diajukan (menunggu pemeriksaan)",
  reviewed: "Diperiksa (menunggu persetujuan)",
  approved: "Disetujui",
};

const APPROVAL_VARIANT: Record<
  ApprovalStatus,
  "secondary" | "outline" | "default"
> = {
  draft: "outline",
  submitted: "secondary",
  reviewed: "secondary",
  approved: "default",
};

const NONE = "__none__";

type RoleField = "maker" | "checker" | "approver";

const ROLE_META: {
  field: RoleField;
  label: string;
  idKey: "makerId" | "checkerId" | "approverId";
  nameKey: "makerName" | "checkerName" | "approverName";
}[] = [
  { field: "maker", label: "Maker (penyusun)", idKey: "makerId", nameKey: "makerName" },
  { field: "checker", label: "Checker (pemeriksa)", idKey: "checkerId", nameKey: "checkerName" },
  { field: "approver", label: "Approver (penyetuju)", idKey: "approverId", nameKey: "approverName" },
];

export function ApprovalSection({
  reportId,
  companyId,
  approvalStatus,
  makerId,
  checkerId,
  approverId,
  makerName,
  checkerName,
  approverName,
}: {
  reportId: number;
  companyId: number;
  approvalStatus?: ApprovalStatus;
  makerId?: string | null;
  checkerId?: string | null;
  approverId?: string | null;
  makerName?: string | null;
  checkerName?: string | null;
  approverName?: string | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateReport = useUpdateReport();
  const transition = useTransitionApproval();
  const [note, setNote] = React.useState("");
  const status: ApprovalStatus = approvalStatus ?? "draft";

  // Daftar kolaborator hanya bisa diambil pemilik akun; anggota berbagi akan
  // mendapat 404, sehingga UI penugasan peran tidak ditampilkan untuk mereka.
  const { data: collaborators } = useListCompanyCollaborators(companyId, {
    query: {
      enabled: !!companyId,
      queryKey: getListCompanyCollaboratorsQueryKey(companyId),
      retry: false,
    },
  });

  const assigned: Record<RoleField, string | null | undefined> = {
    maker: makerId,
    checker: checkerId,
    approver: approverId,
  };

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: getGetReportQueryKey(reportId) });

  const handleAssign = (role: RoleField, value: string) => {
    const meta = ROLE_META.find((r) => r.field === role)!;
    const collaborator =
      value === NONE
        ? null
        : (collaborators ?? []).find(
            (c: CompanyCollaborator) => c.userId === value,
          ) ?? null;
    updateReport.mutate(
      {
        id: reportId,
        data: {
          [meta.idKey]: collaborator ? collaborator.userId : null,
          [meta.nameKey]: collaborator ? collaborator.name : null,
        },
      },
      {
        onSuccess: () => {
          refresh();
          toast({ title: "Penugasan diperbarui" });
        },
        onError: () =>
          toast({ title: "Gagal memperbarui penugasan", variant: "destructive" }),
      },
    );
  };

  const doAction = (action: ApprovalActionInputAction, label: string) => {
    transition.mutate(
      { id: reportId, data: { action, note: note.trim() || undefined } },
      {
        onSuccess: () => {
          refresh();
          setNote("");
          toast({ title: label });
        },
        onError: () =>
          toast({
            title: "Aksi persetujuan gagal",
            description: "Anda mungkin tidak berwenang pada langkah ini.",
            variant: "destructive",
          }),
      },
    );
  };

  const roleNames: Record<RoleField, string | null | undefined> = {
    maker: makerName,
    checker: checkerName,
    approver: approverName,
  };

  const busy = transition.isPending || updateReport.isPending;
  const canManageAssignments = Array.isArray(collaborators);

  return (
    <Card className="border-slate-200 shadow-sm dark:border-slate-800">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Alur Persetujuan (Maker-Checker-Approver)
          </h3>
          <Badge variant={APPROVAL_VARIANT[status]}>
            {APPROVAL_LABELS[status]}
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {ROLE_META.map((meta) => (
            <div key={meta.field} className="space-y-1.5">
              <Label className="text-xs">{meta.label}</Label>
              {canManageAssignments ? (
                <Select
                  value={assigned[meta.field] ?? NONE}
                  onValueChange={(v) => handleAssign(meta.field, v)}
                  disabled={busy}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Belum ditugaskan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Belum ditugaskan</SelectItem>
                    {(collaborators ?? []).map((c: CompanyCollaborator) => (
                      <SelectItem key={c.userId} value={c.userId}>
                        {c.name}
                        {c.isOwner ? " (Pemilik)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium">
                  {roleNames[meta.field] || "-"}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="approval-note" className="text-xs">
            Catatan (opsional, tercatat di jejak audit)
          </Label>
          <Input
            id="approval-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Mis. sudah dicek dengan bukti setor OSS"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {status === "draft" && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => doAction("submit", "Laporan diajukan")}
            >
              Ajukan (Maker)
            </Button>
          )}
          {status === "submitted" && (
            <>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => doAction("review", "Tinjauan disetujui")}
              >
                Setujui Tinjauan (Checker)
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => doAction("reject", "Laporan dikembalikan ke draf")}
              >
                Tolak
              </Button>
            </>
          )}
          {status === "reviewed" && (
            <>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => doAction("approve", "Laporan disetujui")}
              >
                Setujui Akhir (Approver)
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => doAction("reject", "Laporan dikembalikan ke draf")}
              >
                Tolak
              </Button>
            </>
          )}
          {status === "approved" && (
            <p className="text-sm text-muted-foreground">
              Laporan telah disetujui sepenuhnya.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
