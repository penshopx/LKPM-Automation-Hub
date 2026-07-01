import React from "react";
import {
  useListReportAttachments,
  getListReportAttachmentsQueryKey,
  useCreateReportAttachment,
  useListIzinAttachments,
  getListIzinAttachmentsQueryKey,
  useCreateIzinAttachment,
  useRequestUploadUrl,
  useDeleteAttachment,
  getGetReportQueryKey,
  type Attachment,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Paperclip, Upload, Download, Trash2, FileText } from "lucide-react";

type ParentKind = "report" | "izin";

interface AttachmentsSectionProps {
  parent: { kind: ParentKind; id: number };
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = new Set<string>([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/tiff",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsSection({ parent }: AttachmentsSectionProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const isReport = parent.kind === "report";

  const reportList = useListReportAttachments(parent.id, {
    query: {
      enabled: isReport,
      queryKey: getListReportAttachmentsQueryKey(parent.id),
    },
  });
  const izinList = useListIzinAttachments(parent.id, {
    query: {
      enabled: !isReport,
      queryKey: getListIzinAttachmentsQueryKey(parent.id),
    },
  });

  const requestUploadUrl = useRequestUploadUrl();
  const createReportAttachment = useCreateReportAttachment();
  const createIzinAttachment = useCreateIzinAttachment();
  const deleteAttachment = useDeleteAttachment();

  const attachments: Attachment[] =
    (isReport ? reportList.data : izinList.data) ?? [];
  const isLoading = isReport ? reportList.isLoading : izinList.isLoading;

  const invalidate = () => {
    if (isReport) {
      queryClient.invalidateQueries({
        queryKey: getListReportAttachmentsQueryKey(parent.id),
      });
      queryClient.invalidateQueries({
        queryKey: getGetReportQueryKey(parent.id),
      });
    } else {
      queryClient.invalidateQueries({
        queryKey: getListIzinAttachmentsQueryKey(parent.id),
      });
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Berkas terlalu besar",
        description: "Ukuran maksimum lampiran adalah 20 MB.",
        variant: "destructive",
      });
      return;
    }
    if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
      toast({
        title: "Tipe berkas tidak didukung",
        description: "Gunakan PDF, gambar, atau dokumen kantor.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
        data: {
          fileName: file.name,
          size: file.size,
          contentType: file.type,
        },
      });

      const putResponse = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!putResponse.ok) {
        throw new Error(`Unggah gagal (kode ${putResponse.status})`);
      }

      const data = {
        fileName: file.name,
        contentType: file.type,
        size: file.size,
        objectPath,
      };
      if (isReport) {
        await createReportAttachment.mutateAsync({ reportId: parent.id, data });
      } else {
        await createIzinAttachment.mutateAsync({ izinId: parent.id, data });
      }

      invalidate();
      toast({ title: "Lampiran diunggah" });
    } catch (err) {
      toast({
        title: "Gagal mengunggah lampiran",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (a: Attachment) => {
    deleteAttachment.mutate(
      { id: a.id },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Lampiran dihapus" });
        },
        onError: () =>
          toast({
            title: "Gagal menghapus lampiran",
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-muted-foreground" />
          Lampiran Dokumen Bukti
        </h2>
        <div className="print:hidden">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.tif,.tiff,.doc,.docx,.xls,.xlsx,.txt,.csv"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-1" />
            {uploading ? "Mengunggah..." : "Unggah"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground p-4 border rounded-md bg-card">
          Memuat lampiran...
        </p>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground p-4 border rounded-md bg-card">
          Belum ada lampiran. Unggah PDF, gambar, atau dokumen (maks. 20 MB).
        </p>
      ) : (
        <div className="space-y-3">
          {attachments.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{a.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(a.size)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 print:hidden">
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a
                      href={`/api/attachments/${a.id}/download`}
                      title="Unduh"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(a)}
                    disabled={deleteAttachment.isPending}
                    title="Hapus"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
