import React from "react";
import {
  useListTeamMembers,
  getListTeamMembersQueryKey,
  useInviteTeamMember,
  useRemoveTeamMember,
  useAcceptInvite,
  type TeamMember,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, UserPlus, Trash2, KeyRound, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu diterima",
  active: "Aktif",
  revoked: "Dicabut",
};

function InviteForm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const invite = useInviteTeamMember();
  const [email, setEmail] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Email/label wajib diisi", variant: "destructive" });
      return;
    }
    invite.mutate(
      { data: { email: email.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListTeamMembersQueryKey(),
          });
          toast({
            title: "Undangan dibuat",
            description: "Bagikan kode undangan ke anggota tim Anda.",
          });
          setEmail("");
        },
        onError: () =>
          toast({ title: "Gagal membuat undangan", variant: "destructive" }),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="invite-email">Email / nama anggota</Label>
        <Input
          id="invite-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="anggota@perusahaan.co.id"
        />
      </div>
      <Button type="submit" disabled={invite.isPending}>
        <UserPlus className="h-4 w-4 mr-1" />
        {invite.isPending ? "Mengundang..." : "Undang"}
      </Button>
    </form>
  );
}

function AcceptForm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const accept = useAcceptInvite();
  const [code, setCode] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast({ title: "Kode undangan wajib diisi", variant: "destructive" });
      return;
    }
    accept.mutate(
      { data: { inviteCode: code.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries();
          toast({
            title: "Undangan diterima",
            description:
              "Anda kini dapat mengakses perusahaan yang dibagikan kepada Anda.",
          });
          setCode("");
        },
        onError: () =>
          toast({
            title: "Kode undangan tidak valid",
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="accept-code">Kode undangan</Label>
        <Input
          id="accept-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Mis. A1B2C3D4E5F6"
        />
      </div>
      <Button type="submit" variant="secondary" disabled={accept.isPending}>
        <KeyRound className="h-4 w-4 mr-1" />
        {accept.isPending ? "Memproses..." : "Terima Undangan"}
      </Button>
    </form>
  );
}

export default function Team() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: members, isLoading } = useListTeamMembers({
    query: { queryKey: getListTeamMembersQueryKey() },
  });
  const removeMember = useRemoveTeamMember();

  const handleRemove = (member: TeamMember) => {
    removeMember.mutate(
      { id: member.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListTeamMembersQueryKey(),
          });
          toast({ title: "Anggota dicabut" });
        },
        onError: () =>
          toast({ title: "Gagal mencabut anggota", variant: "destructive" }),
      },
    );
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    toast({ title: "Kode disalin" });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Users className="h-7 w-7" />
          Kolaborasi Tim
        </h1>
        <p className="text-muted-foreground mt-2">
          Undang rekan kerja, lalu bagikan akses perusahaan tertentu kepada
          mereka. Anggota hanya melihat perusahaan dan laporan yang dibagikan.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Undang anggota tim</CardTitle>
          </CardHeader>
          <CardContent>
            <InviteForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Terima undangan tim lain
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AcceptForm />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-bold tracking-tight mb-4">
          Anggota yang Anda undang
        </h2>
        <div className="border rounded-md bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email / Nama</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Kode Undangan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Skeleton className="h-4 w-24 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : members?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center h-24 text-muted-foreground"
                  >
                    Belum ada anggota. Undang rekan kerja untuk mulai
                    berkolaborasi.
                  </TableCell>
                </TableRow>
              ) : (
                members?.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={m.status === "active" ? "default" : "secondary"}
                      >
                        {STATUS_LABELS[m.status] ?? m.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {m.status === "pending" && m.inviteCode ? (
                        <button
                          type="button"
                          onClick={() => copyCode(m.inviteCode!)}
                          className="flex items-center gap-1.5 font-mono text-sm text-primary hover:underline"
                        >
                          {m.inviteCode}
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(m)}
                        disabled={removeMember.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
