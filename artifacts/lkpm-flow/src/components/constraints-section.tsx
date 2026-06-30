import React from "react";
import {
  useCreateConstraint,
  useUpdateConstraint,
  useDeleteConstraint,
  getGetReportQueryKey,
  type Constraint,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, AlertCircle } from "lucide-react";

interface ConstraintsSectionProps {
  reportId: number;
  constraints: Constraint[];
}

export function ConstraintsSection({
  reportId,
  constraints,
}: ConstraintsSectionProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createConstraint = useCreateConstraint();
  const updateConstraint = useUpdateConstraint();
  const deleteConstraint = useDeleteConstraint();

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Constraint | null>(null);
  const [issue, setIssue] = React.useState("");
  const [followUp, setFollowUp] = React.useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetReportQueryKey(reportId) });

  const openNew = () => {
    setEditing(null);
    setIssue("");
    setFollowUp("");
    setOpen(true);
  };

  const openEdit = (c: Constraint) => {
    setEditing(c);
    setIssue(c.issue);
    setFollowUp(c.followUp ?? "");
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue.trim()) {
      toast({ title: "Permasalahan wajib diisi", variant: "destructive" });
      return;
    }
    const data = { issue: issue.trim(), followUp: followUp.trim() || undefined };
    const onSuccess = () => {
      invalidate();
      toast({ title: editing ? "Permasalahan diperbarui" : "Permasalahan ditambahkan" });
      setOpen(false);
    };
    const onError = () =>
      toast({ title: "Gagal menyimpan permasalahan", variant: "destructive" });

    if (editing) {
      updateConstraint.mutate({ id: editing.id, data }, { onSuccess, onError });
    } else {
      createConstraint.mutate({ reportId, data }, { onSuccess, onError });
    }
  };

  const handleDelete = (c: Constraint) => {
    deleteConstraint.mutate(
      { id: c.id },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Permasalahan dihapus" });
        },
        onError: () =>
          toast({ title: "Gagal menghapus permasalahan", variant: "destructive" }),
      },
    );
  };

  const isPending = createConstraint.isPending || updateConstraint.isPending;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          Permasalahan yang Dihadapi
        </h2>
        <Button variant="outline" size="sm" onClick={openNew} className="print:hidden">
          <Plus className="h-4 w-4 mr-1" /> Tambah
        </Button>
      </div>

      {constraints.length === 0 ? (
        <p className="text-sm text-muted-foreground p-4 border rounded-md bg-card">
          Tidak ada catatan permasalahan.
        </p>
      ) : (
        <div className="space-y-3">
          {constraints.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-sm text-destructive">{c.issue}</p>
                  <div className="flex gap-1 shrink-0 print:hidden">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(c)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(c)}
                      disabled={deleteConstraint.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {c.followUp && (
                  <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                    Tindak lanjut: {c.followUp}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Ubah Permasalahan" : "Tambah Permasalahan"}
              </DialogTitle>
              <DialogDescription>
                Catat kendala dan rencana tindak lanjutnya.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="c-issue">Permasalahan</Label>
                <Textarea
                  id="c-issue"
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder="mis. Keterlambatan impor mesin produksi"
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-followup">Tindak Lanjut (opsional)</Label>
                <Textarea
                  id="c-followup"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  placeholder="mis. Koordinasi dengan bea cukai"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
